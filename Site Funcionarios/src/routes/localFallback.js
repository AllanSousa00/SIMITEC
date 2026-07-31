// Banco local de emergencia.
// Quando o MongoDB nao esta disponivel, essas rotas mantem o projeto respirando.
// Nao substitui o banco oficial; funciona como contingencia para manter a entrada ativa.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import QRCode from "qrcode";
import validator from "validator";
import {
  clearSessionCookie,
  createSensitiveAccessToken,
  createSessionToken,
  getSessionToken,
  hasSensitiveAccess,
  jwtSecret,
  mobileSessionPayload,
  setSessionCookie
} from "../middleware/auth.js";
import { createId, createTicketCode, readLocalStore, updateLocalStore } from "../services/localStore.js";
import {
  InstitutionLookupError,
  institutionVerificationEnabled,
  searchInstitutions,
  verifyInstitutionSelection
} from "../services/institutions.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/mailer.js";
import { legalAcceptanceFields } from "../services/legalRelease.js";
import { findContentArea, getPublicSiteContent } from "../services/siteContent.js";
import { protectGroup, protectRegistration, protectValue } from "../services/sensitiveData.js";
import {
  areaPeriods,
  findAreaScheduleConflict,
  scheduleConflictMessage,
  selectedAreaPeriod
} from "../services/activitySchedule.js";

const router = Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const allowedParticipantRoles = new Set(["Estudante", "Professor(a)", "Visitante"]);
const publicParticipantRoles = new Set(["Estudante", "Visitante"]);
const controlledParticipantRoles = new Set(["Professor(a)", "Organizador(a)"]);
const localAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Aguarde um pouco e tente novamente." }
});

router.use((req, _res, next) => {
  // Se o Mongo conectou, sai daqui e deixa as rotas oficiais trabalharem.
  if (mongoose.connection.readyState === 1) {
    return next("router");
  }

  return next();
});

function cleanText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanTeacherCardCode(value) {
  return cleanText(value, 80).replace(/\s+/g, " ");
}

function teacherValidationFields(body = {}, existingParticipant = {}) {
  const requestedRole = cleanText(body.role, 40);
  const approvedTeacher = cleanText(existingParticipant.role, 40) === "Professor(a)";
  const existingCode = cleanTeacherCardCode(existingParticipant.teacherCardCode);
  const submittedCode = cleanTeacherCardCode(body.teacherCardCode);
  const code = submittedCode || existingCode;

  if (requestedRole !== "Professor(a)" && !approvedTeacher) {
    return {
      teacherCardCode: "",
      teacherValidationStatus: "not-requested",
      teacherValidationRequestedAt: null,
      teacherValidationReviewedAt: null
    };
  }

  if (!code) {
    return {
      teacherCardCode: "",
      teacherValidationStatus: "not-requested",
      teacherValidationRequestedAt: null,
      teacherValidationReviewedAt: null
    };
  }

  if (!submittedCode || submittedCode === existingCode) {
    return {
      teacherCardCode: code,
      teacherValidationStatus: cleanText(existingParticipant.teacherValidationStatus, 40) || "pending",
      teacherValidationRequestedAt: existingParticipant.teacherValidationRequestedAt || new Date().toISOString(),
      teacherValidationReviewedAt: existingParticipant.teacherValidationReviewedAt || null
    };
  }

  return {
    teacherCardCode: code,
    teacherValidationStatus: "pending",
    teacherValidationRequestedAt: new Date().toISOString(),
    teacherValidationReviewedAt: null
  };
}

async function institutionFields(body = {}) {
  const institution = cleanText(body.institution, 160);
  if (!institution) {
    return {
      institution: "",
      institutionPlaceId: "",
      institutionAddress: "",
      institutionGoogleMapsUri: "",
      institutionCity: "",
      institutionVerifiedAt: null
    };
  }
  if (!institutionVerificationEnabled()) {
    return {
      institution,
      institutionPlaceId: "",
      institutionAddress: "",
      institutionGoogleMapsUri: "",
      institutionCity: cleanText(body.city, 120),
      institutionVerifiedAt: null
    };
  }

  const verified = await verifyInstitutionSelection(body.institutionPlaceId);
  return {
    institution: verified.name,
    institutionPlaceId: verified.placeId,
    institutionAddress: verified.address,
    institutionGoogleMapsUri: verified.googleMapsUri,
    institutionCity: verified.city,
    institutionVerifiedAt: verified.verifiedAt
  };
}

async function optionalInstitutionFields(body = {}) {
  const institution = cleanText(body.institution, 160);
  const placeId = cleanText(body.institutionPlaceId, 220);
  if (!institution && !placeId) {
    return {
      institution: "",
      institutionPlaceId: "",
      institutionAddress: "",
      institutionGoogleMapsUri: "",
      institutionVerifiedAt: null,
      city: cleanText(body.city, 120)
    };
  }

  if (!placeId) {
    return {
      institution,
      institutionPlaceId: "",
      institutionAddress: "",
      institutionGoogleMapsUri: "",
      institutionVerifiedAt: null,
      city: cleanText(body.city, 120)
    };
  }

  const verified = await verifyInstitutionSelection(placeId);
  return {
    institution: verified.name,
    institutionPlaceId: verified.placeId,
    institutionAddress: verified.address,
    institutionGoogleMapsUri: verified.googleMapsUri,
    institutionVerifiedAt: verified.verifiedAt,
    city: verified.city
  };
}

function sendInstitutionError(res, error) {
  if (!(error instanceof InstitutionLookupError)) return false;
  res.status(error.statusCode).json({ message: error.message });
  return true;
}

function cleanUrl(value, maxLength = 1000) {
  const raw = String(value || "").trim();
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(raw) && raw.length <= 240000) return raw;
  const input = cleanText(raw, maxLength);
  if (!input) return "";
  if (input.startsWith("/assets/")) return input;

  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (_error) {
    return "";
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  const value = String(password || "");

  if (value.length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Use letras e numeros na senha.";
  }

  return null;
}

function makeToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

function randomToken(size = 12) {
  return crypto.randomBytes(Math.ceil(size / 2)).toString("hex").slice(0, size);
}

function randomPasswordSeed() {
  return crypto.randomBytes(32).toString("hex");
}

function publicUser(user, revealSensitive = false) {
  return {
    id: user.id,
    name: user.name,
    email: protectValue(user.email, revealSensitive),
    phone: protectValue(user.phone || "", revealSensitive),
    socialName: user.socialName || "",
    institution: user.institution || "",
    institutionPlaceId: user.institutionPlaceId || "",
    institutionAddress: user.institutionAddress || "",
    institutionGoogleMapsUri: user.institutionGoogleMapsUri || "",
    institutionVerifiedAt: user.institutionVerifiedAt || null,
    course: user.course || "",
    city: user.city || "",
    linkedin: user.linkedin || "",
    github: user.github || "",
    bio: user.bio || "",
    role: user.role || "participant",
    emailVerified: user.emailVerified !== false,
    avatarUrl: user.avatarUrl || "/assets/avatar-default.svg",
    badges: user.badges || [],
    points: user.points || 0,
    sensitiveDataVisible: revealSensitive
  };
}

function serializeLocalRegistration(registration, revealSensitive = false) {
  return protectRegistration({
    ...registration,
    _id: registration.id,
    checkedIn: Boolean(registration.checkedInAt)
  }, revealSensitive);
}

function cleanDetails(details = {}) {
  const output = {};

  for (const [key, value] of Object.entries(details || {})) {
    const cleanKey = cleanText(key, 50);
    if (!cleanKey) continue;
    output[cleanKey] = cleanText(value, 500);
  }

  return output;
}

function localUserScheduleConflict(store, userId, eventId, area, period, areas) {
  if (!userId) return null;
  return findAreaScheduleConflict({
    area,
    period,
    registrations: store.registrations.filter((item) => item.userId === userId && item.eventId === eventId),
    areas
  });
}

function mapParticipant(body, fallbackUser, officialInstitution = null, existingParticipant = {}) {
  const name = cleanText(body.name || fallbackUser.name, 120);
  const email = cleanText(body.email || existingParticipant.email || fallbackUser.email, 160).toLowerCase();
  const cpf = cleanText(body.cpf || existingParticipant.cpf, 20);
  const role = cleanText(body.role, 40);
  const existingRole = cleanText(existingParticipant.role, 40);
  const preservedControlledRole = controlledParticipantRoles.has(existingRole) ? existingRole : "";
  const teacherValidation = teacherValidationFields(body, existingParticipant);

  if (!name || !validator.isEmail(email) || cpf.replace(/\D/g, "").length !== 11) {
    return null;
  }

  return {
    name,
    socialName: cleanText(body.socialName, 120),
    email,
    cpf,
    phone: cleanText(body.phone || existingParticipant.phone || fallbackUser.phone, 40),
    avatarUrl: cleanUrl(body.avatarUrl || existingParticipant.avatarUrl || fallbackUser.avatarUrl),
    ...teacherValidation,
    role: preservedControlledRole || (publicParticipantRoles.has(role) ? role : "Estudante"),
    institution: officialInstitution?.institution || cleanText(body.institution, 160),
    institutionPlaceId: officialInstitution?.institutionPlaceId || "",
    institutionAddress: officialInstitution?.institutionAddress || "",
    institutionGoogleMapsUri: officialInstitution?.institutionGoogleMapsUri || "",
    institutionVerifiedAt: officialInstitution?.institutionVerifiedAt || null,
    course: cleanText(body.course, 120),
    shift: cleanText(body.shift, 80),
    city: officialInstitution?.city || cleanText(body.city, 120),
    accessibility: cleanText(body.accessibility, 300)
  };
}

function localGroupMemberNameAndEmail(value = "") {
  const raw = cleanText(value, 240);
  const emailMatch = raw.match(/<([^<>\s]+@[^<>\s]+\.[^<>\s]+)>/i) || raw.match(/([^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+)/i);
  const email = normalizeEmail(emailMatch?.[1]);
  const name = raw
    .replace(emailMatch?.[0] || "", "")
    .replace(/[<>()]/g, "")
    .replace(/\s*[,;|-]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { name: cleanText(name, 120), email };
}

function localGroupMembersFromBody(body = {}) {
  const raw = Array.isArray(body.participants) ? body.participants : [];
  const members = raw
    .map((item) => {
      const parsed = localGroupMemberNameAndEmail(item?.name || item);
      const email = normalizeEmail(item?.email) || parsed.email;
      return {
        name: parsed.name || cleanText(item?.name, 120),
        socialName: cleanText(item?.socialName, 120),
        email,
        cpf: cleanText(item?.cpf, 20),
        phone: cleanText(item?.phone, 40),
        certificateEmail: normalizeEmail(item?.certificateEmail) || email,
        role: allowedParticipantRoles.has(cleanText(item?.role, 40)) ? cleanText(item?.role, 40) : "Estudante",
        accessibility: cleanText(item?.accessibility, 300)
      };
    })
    .filter((item) => item.name);

  if (body.includeResponsible && cleanText(body.responsibleName, 120)) {
    members.unshift({
      name: cleanText(body.responsibleName, 120),
      socialName: "",
      email: normalizeEmail(body.responsibleEmail),
      cpf: cleanText(body.responsibleCpf, 20),
      phone: cleanText(body.responsiblePhone, 40),
      certificateEmail: normalizeEmail(body.responsibleEmail),
      role: allowedParticipantRoles.has(cleanText(body.responsibleRole, 40)) ? cleanText(body.responsibleRole, 40) : "Visitante",
      accessibility: ""
    });
  }

  return members.slice(0, 80);
}

async function localAuth(req, res, next) {
  try {
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ message: "Entre na sua conta para continuar." });
    }

    const payload = jwt.verify(token, jwtSecret());
    const store = await readLocalStore();
    const user = store.users.find((item) => item.id === payload.sub);

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: "Sessão inválida. Entre novamente." });
    }

    req.localUser = user;
    return next();
  } catch (_error) {
    clearSessionCookie(res);
    return res.status(401).json({ message: "Sessão expirada. Entre novamente." });
  }
}

async function buildTicket(registration, revealSensitive = false) {
  // Versao local da credencial com o mesmo formato do banco oficial.
  const { event } = await getPublicSiteContent();
  const store = await readLocalStore();
  const linkedRegistrations = store.registrations
    .filter((item) => item.userId === registration.userId && item.eventId === event.id && item.status === "confirmed")
    .sort((a, b) => String(a.activitySlug || "").localeCompare(String(b.activitySlug || "")));
  const confirmedAreas = linkedRegistrations
    .filter((item) => item.activitySlug !== "main")
    .map((item) => ({
      code: item.ticketCode,
      slug: item.activitySlug,
      title: item.activityTitle
    }));
  const payload = {
    type: "simitec-credential",
    code: registration.ticketCode,
    eventId: event.id,
    edition: event.edition,
    access: ["main", ...confirmedAreas.map((area) => area.slug)],
    areas: confirmedAreas,
    status: registration.status
  };

  const qrCode = await QRCode.toDataURL(JSON.stringify(payload), {
    margin: 1,
    width: 220
  });

  return {
    ...serializeLocalRegistration(registration, revealSensitive),
    areas: confirmedAreas,
    qrCode
  };
}

router.get("/auth/me", asyncHandler(async (req, res) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.json({ user: null });
  }

  try {
    const payload = jwt.verify(token, jwtSecret());
    const store = await readLocalStore();
    const user = store.users.find((item) => item.id === payload.sub);
    return res.json({ user: user ? publicUser(user, hasSensitiveAccess(req, user)) : null });
  } catch (_error) {
    clearSessionCookie(res);
    return res.json({ user: null });
  }
}));

router.post("/auth/register", localAuthLimiter, asyncHandler(async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const socialName = cleanText(req.body.socialName, 120);
  const email = normalizeEmail(req.body.email);
  const phone = cleanText(req.body.phone, 40);
  const password = String(req.body.password || "");
  const acceptedTerms = Boolean(req.body.acceptedTerms);

  if (!name || !validator.isEmail(email)) {
    return res.status(400).json({ message: "Informe nome e e-mail válidos." });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  if (!acceptedTerms) {
    return res.status(400).json({ message: "Confirme a ciência dos documentos legais para criar a conta." });
  }

  const verification = makeToken();
  const user = await updateLocalStore(async (store) => {
    if (store.users.some((item) => item.email === email)) {
      return null;
    }

    const created = {
      id: createId(),
      name,
      socialName,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      role: store.users.length === 0 ? "super_admin" : "participant",
      emailVerified: false,
      verificationTokenHash: verification.hash,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...Object.fromEntries(
        Object.entries(legalAcceptanceFields()).map(([key, value]) => [
          key,
          value instanceof Date ? value.toISOString() : value
        ])
      ),
      avatarUrl: "/assets/avatar-default.svg",
      badges: ["Conta criada"],
      points: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.users.push(created);
    return created;
  });

  if (!user) {
    return res.status(409).json({ message: "Este e-mail já está cadastrado." });
  }

  const delivery = await sendVerificationEmail(user, verification.raw);
  const previewUrl = !delivery.delivered && process.env.NODE_ENV !== "production"
    ? delivery.previewUrl
    : "";
  const session = createSessionToken(user);
  setSessionCookie(res, session);
  return res.status(201).json({
    user: publicUser(user),
    message: "Conta criada. Confirme seu e-mail para liberar inscrições.",
    sessionToken: session,
    ...mobileSessionPayload(req, session),
    ...(previewUrl ? { previewUrl } : {})
  });
}));

router.post("/auth/bootstrap-super-admin", localAuthLimiter, asyncHandler(async (req, res) => {
  const setupToken = String(req.body.setupToken || "");
  const email = normalizeEmail(req.body.email);

  if (!process.env.ADMIN_SETUP_TOKEN) {
    return res.status(404).json({ message: "Configuração inicial indisponível." });
  }

  if (!setupToken || setupToken !== process.env.ADMIN_SETUP_TOKEN) {
    return res.status(403).json({ message: "Token administrativo inválido." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Informe o e-mail da conta administradora." });
  }

  const user = await updateLocalStore((store) => {
    if (store.users.some((item) => item.role === "super_admin")) {
      return "exists";
    }

    const found = store.users.find((item) => item.email === email);
    if (!found) return null;

    found.role = "super_admin";
    found.emailVerified = true;
    found.updatedAt = new Date().toISOString();
    return found;
  });

  if (user === "exists") {
    return res.status(409).json({ message: "Administrador principal já configurado." });
  }

  if (!user) {
    return res.status(404).json({ message: "Crie a conta antes de promovê-la." });
  }

  return res.json({ user: publicUser(user), message: "Administrador principal configurado." });
}));

router.post("/auth/login", localAuthLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!validator.isEmail(email) || !password) {
    return res.status(400).json({ message: "Informe e-mail e senha." });
  }

  const store = await readLocalStore();
  const user = store.users.find((item) => item.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "E-mail ou senha inválidos." });
  }

  user.lastLoginAt = new Date().toISOString();
  await updateLocalStore((nextStore) => {
    const index = nextStore.users.findIndex((item) => item.id === user.id);
    if (index >= 0) nextStore.users[index] = user;
  });

  const session = createSessionToken(user);
  setSessionCookie(res, session);
  return res.json({
    user: publicUser(user),
    message: "Entrada realizada.",
    sessionToken: session,
    ...mobileSessionPayload(req, session)
  });
}));

router.post("/auth/sensitive-access", localAuthLimiter, localAuth, asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (!password || !(await bcrypt.compare(password, req.localUser.passwordHash))) {
    return res.status(401).json({ message: "Senha inválida para visualizar dados sensíveis." });
  }

  res.json({
    sensitiveAccessToken: createSensitiveAccessToken(req.localUser),
    expiresInSeconds: 300,
    message: "Dados sensíveis liberados por 5 minutos."
  });
}));

router.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ message: "Sessão encerrada." });
});

router.delete("/auth/me", localAuthLimiter, localAuth, asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (req.localUser.role !== "participant") {
    return res.status(403).json({
      message: "Contas da equipe devem ser removidas por um administrador principal."
    });
  }
  if (!password || !(await bcrypt.compare(password, req.localUser.passwordHash))) {
    return res.status(401).json({ message: "Senha inválida. A conta não foi excluída." });
  }

  await updateLocalStore((store) => {
    store.registrations = store.registrations.filter((item) => item.userId !== req.localUser.id);
    store.users = store.users.filter((item) => item.id !== req.localUser.id);
  });
  clearSessionCookie(res);
  return res.json({ message: "Conta e inscrições excluídas permanentemente." });
}));

router.put("/auth/me", localAuth, asyncHandler(async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const phoneProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "phone");
  const requestedPhone = cleanText(req.body.phone, 40);
  const canEditSensitive = hasSensitiveAccess(req, req.localUser);

  if (!name) {
    return res.status(400).json({ message: "Informe um nome válido." });
  }

  if (phoneProvided && requestedPhone !== String(req.localUser.phone || "") && !canEditSensitive) {
    return res.status(403).json({
      message: "Use o botão de olho e confirme sua senha para alterar telefone."
    });
  }

  let officialInstitution;
  try {
    officialInstitution = await optionalInstitutionFields(req.body);
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }

  const user = await updateLocalStore((store) => {
    const index = store.users.findIndex((item) => item.id === req.localUser.id);
    const nextUser = {
      ...store.users[index],
      name,
      socialName: cleanText(req.body.socialName, 120),
      phone: phoneProvided && canEditSensitive ? requestedPhone : store.users[index].phone,
      institution: officialInstitution.institution,
      institutionPlaceId: officialInstitution.institutionPlaceId,
      institutionAddress: officialInstitution.institutionAddress,
      institutionGoogleMapsUri: officialInstitution.institutionGoogleMapsUri,
      institutionVerifiedAt: officialInstitution.institutionVerifiedAt,
      course: cleanText(req.body.course, 120),
      city: officialInstitution.city,
      linkedin: cleanUrl(req.body.linkedin),
      github: cleanUrl(req.body.github),
      bio: cleanText(req.body.bio, 300),
      avatarUrl: cleanUrl(req.body.avatarUrl) || "/assets/avatar-default.svg",
      badges: Array.isArray(store.users[index].badges) ? store.users[index].badges : [],
      points: Number(store.users[index].points || 0),
      updatedAt: new Date().toISOString()
    };

    if (!nextUser.badges.includes("Perfil atualizado")) {
      nextUser.badges.push("Perfil atualizado");
      nextUser.points += 15;
    }

    store.users[index] = nextUser;
    return nextUser;
  });

  return res.json({ user: publicUser(user, hasSensitiveAccess(req, user)), message: "Perfil atualizado." });
}));

router.get("/auth/verify/:token", asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.params.token);
  const user = await updateLocalStore((store) => {
    const found = store.users.find(
      (item) => item.verificationTokenHash === tokenHash
        && new Date(item.verificationExpiresAt || 0).getTime() > Date.now()
    );

    if (!found) return null;
    found.emailVerified = true;
    found.verificationTokenHash = undefined;
    found.verificationExpiresAt = undefined;
    found.updatedAt = new Date().toISOString();
    return found;
  });

  if (!user) return res.redirect("/?verified=invalid#/entrar");

  const session = createSessionToken(user);
  setSessionCookie(res, session);
  return res.redirect("/?verified=1#/inscricao");
}));

router.post("/auth/resend-verification", localAuthLimiter, localAuth, asyncHandler(async (req, res) => {
  if (req.localUser.emailVerified) {
    return res.json({ message: "Seu e-mail já foi confirmado." });
  }

  const verification = makeToken();
  const user = await updateLocalStore((store) => {
    const found = store.users.find((item) => item.id === req.localUser.id);
    if (!found) return null;
    found.verificationTokenHash = verification.hash;
    found.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    found.updatedAt = new Date().toISOString();
    return found;
  });

  if (!user) return res.status(404).json({ message: "Conta não encontrada." });

  const delivery = await sendVerificationEmail(user, verification.raw);
  const previewUrl = !delivery.delivered && process.env.NODE_ENV !== "production"
    ? delivery.previewUrl
    : "";
  return res.json({
    message: "Enviamos um novo link de confirmação.",
    ...(previewUrl ? { previewUrl } : {})
  });
}));

router.post("/auth/forgot-password", localAuthLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const audience = req.body.audience === "staff" ? "staff" : "public";

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Informe um e-mail válido." });
  }

  const store = await readLocalStore();
  const user = store.users.find((item) => item.email === email);

  if (!user) {
    return res.json({ message: "Se o e-mail existir, enviaremos um link de recuperação. Verifique também a caixa de spam ou lixo eletrônico." });
  }

  const { raw, hash } = makeToken();
  user.resetTokenHash = hash;
  user.resetExpiresAt = new Date(Date.now() + 3600000).toISOString();

  await updateLocalStore((nextStore) => {
    const index = nextStore.users.findIndex((item) => item.id === user.id);
    if (index >= 0) nextStore.users[index] = user;
  });

  const delivery = await sendPasswordResetEmail(user, raw, { audience });
  const previewUrl = !delivery.delivered && process.env.NODE_ENV !== "production"
    ? delivery.previewUrl
    : "";

  res.json({
    message: "Se o e-mail existir, enviaremos um link de recuperação. Verifique também a caixa de spam ou lixo eletrônico.",
    ...(previewUrl ? { previewUrl } : {})
  });
}));

router.post("/auth/reset-password", localAuthLimiter, asyncHandler(async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");

  if (!token || !password) {
    return res.status(400).json({ message: "Informe o token e a nova senha." });
  }

  const store = await readLocalStore();
  const tokenHash = hashToken(token);
  const now = Date.now();
  const user = store.users.find(
    (item) =>
      item.resetTokenHash &&
      (item.resetTokenHash === tokenHash || item.resetTokenHash === token) &&
      new Date(item.resetExpiresAt || 0).getTime() > now
  );

  if (!user) {
    return res.status(400).json({ message: "Token inválido ou expirado." });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetExpiresAt = undefined;

  await updateLocalStore((nextStore) => {
    const index = nextStore.users.findIndex((item) => item.id === user.id);
    if (index >= 0) nextStore.users[index] = user;
  });

  res.json({ message: "Senha atualizada com sucesso!" });
}));

router.get("/registrations/mine", localAuth, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const store = await readLocalStore();
  const revealSensitive = hasSensitiveAccess(req, req.localUser);
  const registrations = store.registrations
    .filter((item) => item.userId === req.localUser.id && item.eventId === event.id)
    .map((item) => serializeLocalRegistration(item, revealSensitive));

  res.json({ registrations });
}));

router.get("/registrations/event", asyncHandler(async (req, res) => {
  const content = await getPublicSiteContent();
  res.json(content);
}));

router.get("/registrations/institutions/search", asyncHandler(async (req, res) => {
  try {
    return res.json(await searchInstitutions(req.query.q));
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
}));

router.post("/registrations/event", localAuth, localVerifiedEmail, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req, req.localUser);

  if (!req.body.acceptedTerms) {
    return res.status(400).json({ message: "Confirme a ciência dos documentos legais para confirmar a inscrição." });
  }

  let officialInstitution = null;
  try {
    officialInstitution = await optionalInstitutionFields(req.body);
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }

  const storeSnapshot = await readLocalStore();
  const existingRegistration = storeSnapshot.registrations.find(
    (item) => item.userId === req.localUser.id && item.eventId === event.id && item.activitySlug === "main"
  );
  const requestedRole = cleanText(req.body.role, 40);
  const existingRole = cleanText(existingRegistration?.participant?.role, 40);
  const requestedTeacherCode = cleanTeacherCardCode(
    req.body.teacherCardCode || existingRegistration?.participant?.teacherCardCode
  );
  if (requestedRole === "Organizador(a)" && !controlledParticipantRoles.has(existingRole)) {
    return res.status(403).json({
      message: "O perfil de organizador só pode ser atribuído pela organização."
    });
  }
  if (requestedRole === "Professor(a)" && !controlledParticipantRoles.has(existingRole) && !requestedTeacherCode) {
    return res.status(400).json({ message: "Informe o código da CNDB para solicitar o perfil de professor." });
  }

  const participant = mapParticipant(req.body, req.localUser, officialInstitution, existingRegistration?.participant || {});
  if (!participant) {
    return res.status(400).json({ message: "Preencha nome, e-mail e CPF válidos." });
  }

  const registration = await updateLocalStore((store) => {
    let existing = store.registrations.find(
      (item) => item.userId === req.localUser.id && item.eventId === event.id && item.activitySlug === "main"
    );

    if (!existing) {
      existing = {
        id: createId(),
        userId: req.localUser.id,
        eventId: event.id,
        activitySlug: "main",
        ticketCode: createTicketCode(event.edition || event.year),
        createdAt: new Date().toISOString()
      };
      store.registrations.push(existing);

      const user = store.users.find((item) => item.id === req.localUser.id);
      user.badges = Array.isArray(user.badges) ? user.badges : [];
      if (!user.badges.includes("Credenciamento confirmado")) user.badges.push("Credenciamento confirmado");
      user.points = Number(user.points || 0) + 25;
    }

    existing.activityTitle = "Credenciamento geral";
    existing.participant = participant;
    existing.acceptedTermsAt = new Date().toISOString();
    existing.status = "confirmed";
    existing.updatedAt = new Date().toISOString();
    return existing;
  });

  res.status(201).json({
    registration: serializeLocalRegistration(registration, revealSensitive),
    ticket: await buildTicket(registration, revealSensitive),
    message: "Inscrição geral confirmada."
  });
}));

router.post("/registrations/areas/:slug", localAuth, localVerifiedEmail, asyncHandler(async (req, res) => {
  const { event, areas } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req, req.localUser);
  const area = await findContentArea(req.params.slug);

  if (!area) {
    return res.status(404).json({ message: "Área do evento não encontrada." });
  }

  const registration = await updateLocalStore((store) => {
    const mainRegistration = store.registrations.find(
      (item) =>
        item.userId === req.localUser.id &&
        item.eventId === event.id &&
        item.activitySlug === "main" &&
        item.status === "confirmed"
    );

    if (!mainRegistration) {
      return { error: "Faça primeiro a inscrição geral no evento." };
    }

    let existing = store.registrations.find(
      (item) => item.userId === req.localUser.id && item.eventId === event.id && item.activitySlug === area.slug
    );

    const details = cleanDetails(req.body.details);
    const period = selectedAreaPeriod(area, details.period);
    if (areaPeriods(area).length && !period) {
      return { error: "Escolha o turno: manhã ou tarde.", status: 400 };
    }

    const scheduleConflict = findAreaScheduleConflict({
      area,
      period,
      registrations: store.registrations.filter(
        (item) => item.userId === req.localUser.id && item.eventId === event.id
      ),
      areas
    });
    if (scheduleConflict) {
      return { error: scheduleConflictMessage(scheduleConflict) };
    }

    const takenSeats = store.registrations.filter(
      (item) =>
        item.id !== existing?.id &&
        item.eventId === event.id &&
        item.activitySlug === area.slug &&
        item.status === "confirmed" &&
        item.details?.period === period
    ).length;
    if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
      return { error: `As ${area.seats} vagas da ${period.toLowerCase()} foram preenchidas. Escolha o outro turno.` };
    }

    if (!existing) {
      existing = {
        id: createId(),
        userId: req.localUser.id,
        eventId: event.id,
        activitySlug: area.slug,
        ticketCode: createTicketCode(event.edition || event.year),
        createdAt: new Date().toISOString()
      };
      store.registrations.push(existing);

      const user = store.users.find((item) => item.id === req.localUser.id);
      user.badges = Array.isArray(user.badges) ? user.badges : [];
      const badge = `Participante: ${area.shortTitle}`;
      if (!user.badges.includes(badge)) user.badges.push(badge);
      user.points = Number(user.points || 0) + 50;
    }

    details.period = period;
    for (const field of area.formFields || []) {
      if (field.required && !details[field.name]) {
        return { error: `Preencha: ${field.label}.` };
      }
    }

    existing.activityTitle = area.title;
    existing.participant = mainRegistration.participant;
    existing.details = details;
    existing.acceptedTermsAt = new Date().toISOString();
    existing.status = "confirmed";
    existing.updatedAt = new Date().toISOString();
    return existing;
  });

  if (registration.error) {
    return res.status(registration.status || 409).json({ message: registration.error });
  }

  res.status(201).json({
    registration: serializeLocalRegistration(registration, revealSensitive),
    ticket: await buildTicket(registration, revealSensitive),
    message: `Inscrição em ${area.shortTitle} confirmada.`
  });
}));

router.get("/registrations/:id/ticket", localAuth, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const store = await readLocalStore();
  const registration = store.registrations.find(
    (item) => item.id === req.params.id && item.userId === req.localUser.id && item.eventId === event.id
  );

  if (!registration) {
    return res.status(404).json({ message: "Credencial não encontrada." });
  }

  res.json({ ticket: await buildTicket(registration, hasSensitiveAccess(req, req.localUser)) });
}));

function localAdmin(req, res, next) {
  if (req.localUser && ["admin", "super_admin"].includes(req.localUser.role)) {
    return next();
  }
  return res.status(403).json({ message: "Acesso negado. Requer perfil de administrador." });
}

function localVerifiedEmail(req, res, next) {
  if (!req.localUser?.emailVerified) {
    return res.status(403).json({
      message: "Confirme seu e-mail antes de realizar inscrições."
    });
  }

  return next();
}

function localCheckin(req, res, next) {
  if (req.localUser && ["checkin", "admin", "super_admin"].includes(req.localUser.role)) {
    return next();
  }
  return res.status(403).json({ message: "Acesso negado. Requer perfil de credenciamento." });
}

function localSuperAdmin(req, res, next) {
  if (req.localUser && req.localUser.role === "super_admin") {
    return next();
  }
  return res.status(403).json({ message: "Acesso negado. Requer cargo Geral." });
}

async function buildLocalCheckinSnapshot(req) {
  const { event, areas } = await getPublicSiteContent();
  const store = await readLocalStore();
  const confirmed = store.registrations.filter((item) => item.eventId === event.id && item.status === "confirmed");
  const checkedIn = confirmed.filter((item) => item.checkedInAt);
  const areaStats = (areas || []).map((area) => {
    const seatsPerPeriod = Number(area.seats || 0);
    const periods = areaPeriods(area).map((name) => {
      const taken = confirmed.filter((item) => item.activitySlug === area.slug && item.details?.period === name).length;
      return {
        name,
        seats: seatsPerPeriod,
        taken,
        available: seatsPerPeriod ? Math.max(seatsPerPeriod - taken, 0) : null,
        full: seatsPerPeriod ? taken >= seatsPerPeriod : false
      };
    });
    const taken = periods.reduce((sum, period) => sum + period.taken, 0);
    const seats = seatsPerPeriod * periods.length;
    return {
      slug: area.slug,
      title: area.title,
      shortTitle: area.shortTitle,
      seats,
      seatsPerPeriod,
      sessionSlots: area.sessionSlots || {},
      periods,
      taken,
      available: periods.reduce((sum, period) => sum + Number(period.available || 0), 0),
      full: periods.length ? periods.every((period) => period.full) : false
    };
  });

  const query = cleanText(req.query.q, 120).toLowerCase();
  const activitySlug = cleanText(req.query.activitySlug, 80);
  const checked = cleanText(req.query.checked, 20);
  let registrations = confirmed
    .map((item) => ({ ...item, _id: item.id, checkedIn: Boolean(item.checkedInAt) }));

  if (activitySlug && activitySlug !== "all") {
    registrations = registrations.filter((item) => item.activitySlug === activitySlug);
  }

  if (checked === "yes") registrations = registrations.filter((item) => item.checkedInAt);
  if (checked === "no") registrations = registrations.filter((item) => !item.checkedInAt);

  if (query) {
    registrations = registrations.filter((item) => {
      const text = [
        item.participant?.name,
        item.participant?.email,
        item.participant?.cpf,
        item.participant?.phone,
        item.participant?.institution,
        item.participant?.course,
        item.participant?.shift,
        item.group?.responsibleName,
        item.ticketCode,
        item.activityTitle
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }

  registrations.sort((a, b) => String(a.checkedInAt || "").localeCompare(String(b.checkedInAt || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const revealSensitive = hasSensitiveAccess(req, req.localUser);

  return {
    database: "local-store",
    serverTime: new Date().toISOString(),
    event,
    stats: { total: confirmed.length, checkedIn: checkedIn.length, pending: confirmed.length - checkedIn.length, areas: areaStats },
    areas: areaStats,
    registrations: registrations.slice(0, 300).map((item) => serializeLocalRegistration(item, revealSensitive))
  };
}

router.get("/checkin/institutions/search", localAuth, localCheckin, asyncHandler(async (req, res) => {
  try {
    return res.json(await searchInstitutions(req.query.q));
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
}));

router.get("/checkin/stats", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const snapshot = await buildLocalCheckinSnapshot(req);
  res.json({ stats: snapshot.stats });
}));

router.get("/checkin/registrations", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const snapshot = await buildLocalCheckinSnapshot(req);
  res.json({ registrations: snapshot.registrations });
}));

router.get("/checkin/registrations/:id/ticket", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const store = await readLocalStore();
  const registration = store.registrations.find(
    (item) => item.id === req.params.id && item.eventId === event.id && item.status === "confirmed"
  );

  if (!registration) {
    return res.status(404).json({ message: "Credencial não encontrada para impressão." });
  }

  res.json({ ticket: await buildTicket(registration, hasSensitiveAccess(req, req.localUser)) });
}));

router.get("/checkin/bootstrap", localAuth, localCheckin, asyncHandler(async (req, res) => {
  res.json(await buildLocalCheckinSnapshot(req));
}));

router.patch("/checkin/registrations/:id/checkin", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const checkedIn = req.body.checkedIn !== false;
  const notes = cleanText(req.body.notes, 240);
  const registration = await updateLocalStore((store) => {
    const item = store.registrations.find((entry) => entry.id === req.params.id);
    if (!item || item.status !== "confirmed") return null;
    item.checkedInAt = checkedIn ? new Date().toISOString() : undefined;
    item.checkedInBy = checkedIn ? req.localUser.id : undefined;
    item.checkinNotes = notes || undefined;
    item.updatedAt = new Date().toISOString();
    return item;
  });

  if (!registration) {
    return res.status(404).json({ message: "Inscrição não encontrada para credenciamento." });
  }

  res.json({
    registration: serializeLocalRegistration(registration, hasSensitiveAccess(req, req.localUser)),
    message: checkedIn ? "Participante credenciado." : "Credenciamento desfeito."
  });
}));

router.post("/checkin/scan", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const directCode = cleanText(req.body.code, 80);
  const payload = cleanText(req.body.payload, 4000);
  let ticketCode = directCode;

  if (!ticketCode && payload) {
    try {
      ticketCode = cleanText(JSON.parse(payload).code, 80);
    } catch (_error) {
      ticketCode = payload;
    }
  }

  if (!ticketCode) {
    return res.status(400).json({ message: "QR Code inválido ou sem código de credencial." });
  }

  const { event } = await getPublicSiteContent();
  const result = await updateLocalStore((store) => {
    const item = store.registrations.find(
      (entry) => entry.eventId === event.id && entry.ticketCode === ticketCode && entry.status === "confirmed"
    );
    if (!item) return null;

    let alreadyCheckedIn = Boolean(item.checkedInAt);
    if (item.activitySlug === "main") {
      const linked = store.registrations.filter(
        (entry) => entry.eventId === event.id && entry.userId === item.userId && entry.status === "confirmed"
      );
      alreadyCheckedIn = linked.every((entry) => Boolean(entry.checkedInAt));
      const now = new Date().toISOString();
      linked.forEach((entry) => {
        if (!entry.checkedInAt) {
          entry.checkedInAt = now;
          entry.checkedInBy = req.localUser.id;
        }
      });
    } else if (!alreadyCheckedIn) {
      item.checkedInAt = new Date().toISOString();
      item.checkedInBy = req.localUser.id;
    }

    return { item, alreadyCheckedIn };
  });

  if (!result) {
    return res.status(404).json({ message: "Credencial não encontrada para este evento." });
  }

  res.json({
    registration: serializeLocalRegistration(result.item, hasSensitiveAccess(req, req.localUser)),
    alreadyCheckedIn: result.alreadyCheckedIn,
    message: result.alreadyCheckedIn ? "Participante já estava credenciado." : "Participante credenciado pelo QR Code único."
  });
}));

router.post("/checkin/onsite-registrations", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const { event, areas } = await getPublicSiteContent();
  const providedEmail = normalizeEmail(req.body.email);
  const providedCpf = cleanText(req.body.cpf, 20);
  const providedPhone = cleanText(req.body.phone, 40);
  if (!providedEmail && !providedCpf && !providedPhone) {
    return res.status(400).json({ message: "Informe ao menos um contato: e-mail, CPF ou telefone." });
  }
  const rawEmail = normalizeEmail(req.body.email);
  const email = rawEmail || `presencial-${Date.now()}-${randomToken(6)}@simitec.local`;
  let verifiedInstitution;
  try {
    verifiedInstitution = await institutionFields(req.body);
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
  const participant = {
    name: cleanText(req.body.name, 120),
    socialName: cleanText(req.body.socialName, 120),
    email,
    cpf: cleanText(req.body.cpf, 20),
    phone: cleanText(req.body.phone, 40),
    avatarUrl: cleanUrl(req.body.avatarUrl),
    teacherCardCode: cleanTeacherCardCode(req.body.teacherCardCode),
    teacherValidationStatus: cleanTeacherCardCode(req.body.teacherCardCode) ? "approved" : "not-requested",
    teacherValidationRequestedAt: cleanTeacherCardCode(req.body.teacherCardCode) ? new Date().toISOString() : null,
    teacherValidationReviewedAt: cleanTeacherCardCode(req.body.teacherCardCode) ? new Date().toISOString() : null,
    role: allowedParticipantRoles.has(cleanText(req.body.role, 40)) ? cleanText(req.body.role, 40) : "Estudante",
    institution: verifiedInstitution.institution,
    institutionPlaceId: verifiedInstitution.institutionPlaceId,
    institutionAddress: verifiedInstitution.institutionAddress,
    institutionGoogleMapsUri: verifiedInstitution.institutionGoogleMapsUri,
    institutionVerifiedAt: verifiedInstitution.institutionVerifiedAt,
    course: cleanText(req.body.course, 120),
    shift: cleanText(req.body.shift, 80),
    city: verifiedInstitution.institutionCity || cleanText(req.body.city, 120),
    accessibility: cleanText(req.body.accessibility, 300)
  };
  if (!participant.name) return res.status(400).json({ message: "Informe pelo menos o nome do participante." });
  if (participant.role === "Professor(a)" && !participant.teacherCardCode) {
    return res.status(400).json({ message: "Para liberar Professor(a), informe e confira o código da CNDB no site oficial do MEC." });
  }

  const areaSlug = cleanText(req.body.activitySlug, 80);
  if (!areaSlug || areaSlug === "main") return res.status(400).json({ message: "Escolha uma área para concluir o cadastro presencial." });
  const area = areas.find((item) => item.slug === areaSlug);
  if (!area) return res.status(404).json({ message: "Área escolhida não encontrada." });
  const period = selectedAreaPeriod(area, req.body.period);
  if (!period) return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });
  const capacityStore = await readLocalStore();
  const takenSeats = capacityStore.registrations.filter(
    (item) => item.eventId === event.id && item.activitySlug === area.slug && item.status === "confirmed" && item.details?.period === period
  ).length;
  if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
    return res.status(409).json({ message: `As ${area.seats} vagas da ${period.toLowerCase()} foram preenchidas. Escolha o outro turno.` });
  }
  const existingUser = capacityStore.users.find((item) => item.email === email);
  const scheduleConflict = localUserScheduleConflict(capacityStore, existingUser?.id, event.id, area, period, areas);
  if (scheduleConflict) return res.status(409).json({ message: scheduleConflictMessage(scheduleConflict) });

  const result = await updateLocalStore(async (store) => {
    let user = store.users.find((item) => item.email === email);
    if (!user) {
      user = {
        id: createId(),
        name: participant.name,
        socialName: participant.socialName,
        email,
        phone: participant.phone,
        passwordHash: await bcrypt.hash(randomPasswordSeed(), 12),
        role: "participant",
        emailVerified: true,
        acceptedTermsAt: new Date().toISOString(),
        avatarUrl: "/assets/avatar-default.svg",
        badges: ["Cadastro presencial"],
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store.users.push(user);
    }

    const now = new Date().toISOString();
    let main = store.registrations.find((item) => item.userId === user.id && item.eventId === event.id && item.activitySlug === "main");
    if (!main) {
      main = { id: createId(), userId: user.id, eventId: event.id, activitySlug: "main", ticketCode: createTicketCode(event.edition || event.year), createdAt: now };
      store.registrations.push(main);
    }
    Object.assign(main, {
      activityTitle: "Credenciamento geral",
      participant,
      acceptedTermsAt: now,
      status: "confirmed",
      checkedInAt: now,
      checkedInBy: req.localUser.id,
      updatedAt: now
    });

    let areaRegistration = store.registrations.find((item) => item.userId === user.id && item.eventId === event.id && item.activitySlug === area.slug);
    if (!areaRegistration) {
      areaRegistration = { id: createId(), userId: user.id, eventId: event.id, activitySlug: area.slug, ticketCode: createTicketCode(event.edition || event.year), createdAt: now };
      store.registrations.push(areaRegistration);
    }
    Object.assign(areaRegistration, {
      activityTitle: area.title,
      participant,
      details: { period },
      acceptedTermsAt: now,
      status: "confirmed",
      checkedInAt: now,
      checkedInBy: req.localUser.id,
      updatedAt: now
    });

    return areaRegistration;
  });

  res.status(201).json({
    registration: serializeLocalRegistration(result, hasSensitiveAccess(req, req.localUser)),
    message: `Participante cadastrado e credenciado em ${area.shortTitle || area.title}.`
  });
}));

router.post("/checkin/group-registrations", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const { event, areas } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req, req.localUser);
  const areaSlug = cleanText(req.body.activitySlug, 80);
  if (!areaSlug || areaSlug === "main") return res.status(400).json({ message: "Escolha uma área para cadastrar o grupo." });
  const area = areas.find((item) => item.slug === areaSlug);
  if (!area) return res.status(404).json({ message: "Área escolhida não encontrada." });
  const period = selectedAreaPeriod(area, req.body.period);
  if (!period) return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });

  let verifiedInstitution;
  try {
    verifiedInstitution = await institutionFields(req.body);
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
  const institution = verifiedInstitution.institution;
  const course = cleanText(req.body.course, 120);
  const shift = cleanText(req.body.shift, 80);
  const city = verifiedInstitution.institutionCity || cleanText(req.body.city, 120);
  const responsibleName = cleanText(req.body.responsibleName, 120);
  const responsiblePhone = cleanText(req.body.responsiblePhone, 40);
  const responsibleEmail = normalizeEmail(req.body.responsibleEmail);
  const responsibleRole = cleanText(req.body.responsibleRole, 80) || "Responsável";
  const certificateDelivery = cleanText(req.body.certificateDelivery, 40) === "responsible" ? "responsible" : "student";
  const notes = cleanText(req.body.notes || req.body.accessibility, 300);
  if (!institution || !course) return res.status(400).json({ message: "Informe a instituição e o ano/série ou turma do grupo." });
  if (!responsibleName || (!responsiblePhone && !responsibleEmail)) {
    return res.status(400).json({ message: "Informe o responsável e pelo menos telefone ou e-mail dele." });
  }

  const members = localGroupMembersFromBody(req.body);
  if (!members.length) return res.status(400).json({ message: "Informe pelo menos um participante do grupo." });
  const missingCertificateEmail = members.some((member) => !member.email && !member.certificateEmail);
  if ((certificateDelivery === "responsible" || missingCertificateEmail) && !responsibleEmail) {
    return res.status(400).json({ message: "Informe o e-mail do responsável para envio dos certificados do grupo." });
  }

  const capacityStore = await readLocalStore();
  const takenSeats = capacityStore.registrations.filter(
    (item) => item.eventId === event.id && item.activitySlug === area.slug && item.status === "confirmed" && item.details?.period === period
  ).length;
  if (Number(area.seats || 0) && takenSeats + members.length > Number(area.seats)) {
    return res.status(409).json({
      message: `Esta área tem ${Math.max(Number(area.seats || 0) - takenSeats, 0)} vaga(s) disponível(is). Reduza o grupo ou escolha outra área.`
    });
  }
  for (const member of members) {
    if (!member.email) continue;
    const existingUser = capacityStore.users.find((item) => item.email === member.email);
    const scheduleConflict = localUserScheduleConflict(capacityStore, existingUser?.id, event.id, area, period, areas);
    if (scheduleConflict) return res.status(409).json({ message: `${member.name}: ${scheduleConflictMessage(scheduleConflict)}` });
  }

  const now = new Date().toISOString();
  const group = {
    id: `GRP-${String(event.edition || event.year || new Date().getFullYear()).match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear()}-${randomToken(6).toUpperCase()}`,
    institution,
    institutionPlaceId: verifiedInstitution.institutionPlaceId,
    institutionAddress: verifiedInstitution.institutionAddress,
    institutionGoogleMapsUri: verifiedInstitution.institutionGoogleMapsUri,
    institutionVerifiedAt: verifiedInstitution.institutionVerifiedAt,
    course,
    shift,
    city,
    responsibleName,
    responsiblePhone,
    responsibleEmail,
    responsibleRole,
    certificateDelivery,
    certificateEmail: certificateDelivery === "responsible" ? responsibleEmail : "",
    size: members.length,
    notes,
    createdBy: req.localUser.id,
    createdAt: now
  };

  const created = await updateLocalStore(async (store) => {
    const output = [];
    for (const [index, member] of members.entries()) {
      const email = member.email || `grupo-${group.id.toLowerCase()}-${index + 1}-${randomToken(4)}@simitec.local`;
      const participant = {
        name: member.name,
        socialName: member.socialName,
        email,
        cpf: member.cpf,
        phone: member.phone,
        avatarUrl: cleanUrl(member.avatarUrl),
        role: member.role,
        institution,
        institutionPlaceId: verifiedInstitution.institutionPlaceId,
        institutionAddress: verifiedInstitution.institutionAddress,
        institutionGoogleMapsUri: verifiedInstitution.institutionGoogleMapsUri,
        institutionVerifiedAt: verifiedInstitution.institutionVerifiedAt,
        course,
        shift,
        city,
        certificateEmail: certificateDelivery === "responsible" ? responsibleEmail : (member.email || member.certificateEmail || responsibleEmail || ""),
        accessibility: member.accessibility
      };
      let user = store.users.find((item) => item.email === email);
      if (!user) {
        user = {
          id: createId(),
          name: participant.name,
          socialName: participant.socialName,
          email,
          phone: participant.phone || responsiblePhone,
          passwordHash: await bcrypt.hash(randomPasswordSeed(), 12),
          role: "participant",
          emailVerified: true,
          acceptedTermsAt: now,
          avatarUrl: "/assets/avatar-default.svg",
          badges: ["Cadastro em grupo"],
          points: 0,
          createdAt: now,
          updatedAt: now
        };
        store.users.push(user);
      }

      let main = store.registrations.find((item) => item.userId === user.id && item.eventId === event.id && item.activitySlug === "main");
      if (!main) {
        main = { id: createId(), userId: user.id, eventId: event.id, activitySlug: "main", ticketCode: createTicketCode(event.edition || event.year), createdAt: now };
        store.registrations.push(main);
      }
      Object.assign(main, {
        activityTitle: "Credenciamento geral",
        participant,
        group,
        acceptedTermsAt: now,
        status: "confirmed",
        checkedInAt: now,
        checkedInBy: req.localUser.id,
        updatedAt: now,
        changeHistory: [...(main.changeHistory || []), { field: "group.id", from: "", to: group.id, reason: "Cadastro presencial em grupo", changedBy: req.localUser.id, changedAt: now }]
      });

      let areaRegistration = store.registrations.find((item) => item.userId === user.id && item.eventId === event.id && item.activitySlug === area.slug);
      if (!areaRegistration) {
        areaRegistration = { id: createId(), userId: user.id, eventId: event.id, activitySlug: area.slug, ticketCode: createTicketCode(event.edition || event.year), createdAt: now };
        store.registrations.push(areaRegistration);
      }
      Object.assign(areaRegistration, {
        activityTitle: area.title,
        participant,
        group,
        details: { period },
        acceptedTermsAt: now,
        status: "confirmed",
        checkedInAt: now,
        checkedInBy: req.localUser.id,
        updatedAt: now,
        changeHistory: [...(areaRegistration.changeHistory || []), { field: "group.id", from: "", to: group.id, reason: "Cadastro presencial em grupo", changedBy: req.localUser.id, changedAt: now }]
      });
      output.push(serializeLocalRegistration(areaRegistration, revealSensitive));
    }
    return output;
  });

  res.status(201).json({
    group: protectGroup(group, revealSensitive),
    registrations: created,
    registration: created[0],
    message: `${created.length} participante(s) cadastrados e credenciados para ${institution} · ${course}.`
  });
}));

router.patch("/checkin/registrations/:id", localAuth, localCheckin, asyncHandler(async (req, res) => {
  const reason = cleanText(req.body.reason, 240);
  const participantPatch = req.body.participant || {};
  const editableFields = ["name", "socialName", "email", "cpf", "phone", "teacherCardCode", "role", "institution", "course", "shift", "city", "accessibility"];
  const { event, areas } = await getPublicSiteContent();
  let verifiedInstitution = null;
  if (cleanText(participantPatch.institutionPlaceId, 220)) {
    try {
      verifiedInstitution = await institutionFields(participantPatch);
      participantPatch.institution = verifiedInstitution.institution;
      participantPatch.city = verifiedInstitution.institutionCity || participantPatch.city;
    } catch (error) {
      if (sendInstitutionError(res, error)) return;
      throw error;
    }
  }

  const result = await updateLocalStore((store) => {
    const item = store.registrations.find((entry) => entry.id === req.params.id && entry.status === "confirmed");
    if (!item) return null;

    const finalEmail = "email" in participantPatch ? cleanText(participantPatch.email, 160) : item.participant?.email;
    const finalCpf = "cpf" in participantPatch ? cleanText(participantPatch.cpf, 20) : item.participant?.cpf;
    const finalPhone = "phone" in participantPatch ? cleanText(participantPatch.phone, 40) : item.participant?.phone;
    if (!finalEmail && !finalCpf && !finalPhone) {
      return { error: "Informe e-mail, CPF ou telefone antes de salvar.", status: 400 };
    }
    const finalTeacherCardCode = cleanTeacherCardCode(
      "teacherCardCode" in participantPatch
        ? participantPatch.teacherCardCode
        : item.participant?.teacherCardCode
    );
    if (cleanText(participantPatch.role, 40) === "Professor(a)" && !finalTeacherCardCode) {
      return { error: "Para liberar Professor(a), informe e confira o código da CNDB no site oficial do MEC.", status: 400 };
    }
    const submittedInstitution = cleanText(participantPatch.institution, 160);
    const existingInstitution = cleanText(item.participant?.institution, 160);
    if (submittedInstitution !== existingInstitution && institutionVerificationEnabled() && !verifiedInstitution) {
      return { error: "Selecione uma instituição encontrada na busca.", status: 400 };
    }

    item.changeHistory ||= [];
    const entries = [];
    for (const field of editableFields) {
      if (!(field in participantPatch)) continue;
      const nextValue = field === "teacherCardCode"
        ? cleanTeacherCardCode(participantPatch[field])
        : cleanText(participantPatch[field], field === "accessibility" ? 300 : 160);
      const previousValue = item.participant?.[field] || "";
      if (String(previousValue) === nextValue) continue;
      item.participant[field] = nextValue;
      entries.push({
        field: `participant.${field}`,
        from: previousValue,
        to: nextValue,
        reason,
        changedBy: req.localUser.id,
        changedAt: new Date().toISOString()
      });
    }

    if (finalTeacherCardCode && cleanText(participantPatch.role || item.participant?.role, 40) === "Professor(a)") {
      const previousStatus = item.participant.teacherValidationStatus || "not-requested";
      item.participant.teacherCardCode = finalTeacherCardCode;
      item.participant.teacherValidationStatus = "approved";
      item.participant.teacherValidationRequestedAt ||= new Date().toISOString();
      item.participant.teacherValidationReviewedAt = new Date().toISOString();
      if (previousStatus !== "approved") {
        entries.push({
          field: "participant.teacherValidationStatus",
          from: previousStatus,
          to: "approved",
          reason,
          changedBy: req.localUser.id,
          changedAt: new Date().toISOString()
        });
      }
    }

    if (verifiedInstitution) {
      const previousPlaceId = item.participant?.institutionPlaceId || "";
      item.participant.institutionPlaceId = verifiedInstitution.institutionPlaceId;
      item.participant.institutionAddress = verifiedInstitution.institutionAddress;
      item.participant.institutionGoogleMapsUri = verifiedInstitution.institutionGoogleMapsUri;
      item.participant.institutionVerifiedAt = verifiedInstitution.institutionVerifiedAt;
      if (previousPlaceId !== verifiedInstitution.institutionPlaceId) {
        entries.push({
          field: "participant.institutionPlaceId",
          from: previousPlaceId,
          to: verifiedInstitution.institutionPlaceId,
          reason,
          changedBy: req.localUser.id,
          changedAt: new Date().toISOString()
        });
      }
    } else if (submittedInstitution !== existingInstitution) {
      item.participant.institutionPlaceId = "";
      item.participant.institutionAddress = "";
      item.participant.institutionGoogleMapsUri = "";
      item.participant.institutionVerifiedAt = null;
    }

    const nextActivitySlug = cleanText(req.body.activitySlug, 80);
    const requestedPeriod = cleanText(req.body.period, 40);
    if (nextActivitySlug && nextActivitySlug !== item.activitySlug) {
      if (item.activitySlug === "main") {
        const area = areas.find((entry) => entry.slug === nextActivitySlug);
        if (!area) return { error: "Área de destino não encontrada." };
        const period = selectedAreaPeriod(area, requestedPeriod);
        if (!period) return { error: "Escolha o turno da atividade: manhã ou tarde.", status: 400 };
        const scheduleConflict = localUserScheduleConflict(store, item.userId, item.eventId, area, period, areas);
        if (scheduleConflict) return { error: scheduleConflictMessage(scheduleConflict) };
        const duplicate = store.registrations.some(
          (entry) =>
            entry.userId === item.userId &&
            entry.eventId === item.eventId &&
            entry.activitySlug === nextActivitySlug &&
            entry.status === "confirmed"
        );
        if (duplicate) return { error: "O participante já possui inscrição nesta área." };
        const takenSeats = store.registrations.filter(
          (entry) =>
            entry.eventId === item.eventId &&
            entry.activitySlug === nextActivitySlug &&
            entry.status === "confirmed" &&
            entry.details?.period === period
        ).length;
        if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
          return { error: "Esta área está lotada. Não é possível inscrever o participante." };
        }

        const now = new Date().toISOString();
        const areaEntries = [
          {
            field: "activitySlug",
            from: "main",
            to: nextActivitySlug,
            reason,
            changedBy: req.localUser.id,
            changedAt: now
          },
          {
            field: "activityTitle",
            from: "Credenciamento geral",
            to: area.title,
            reason,
            changedBy: req.localUser.id,
            changedAt: now
          }
        ];
        item.changeHistory.push(...entries, ...areaEntries);
        item.updatedAt = now;
        const areaRegistration = {
          id: createId(),
          userId: item.userId,
          eventId: item.eventId,
          activitySlug: nextActivitySlug,
          activityTitle: area.title,
          participant: { ...(item.participant || {}) },
          details: { period },
          acceptedTermsAt: item.acceptedTermsAt || now,
          status: "confirmed",
          ticketCode: createTicketCode(event.edition || event.year),
          createdAt: now,
          updatedAt: now,
          changeHistory: areaEntries
        };
        store.registrations.push(areaRegistration);
        return { item: areaRegistration, changed: true };
      }
      const area = areas.find((entry) => entry.slug === nextActivitySlug);
      if (!area) return { error: "Área de destino não encontrada." };
      const period = selectedAreaPeriod(area, requestedPeriod);
      if (!period) return { error: "Escolha o turno da atividade: manhã ou tarde.", status: 400 };
      const scheduleConflict = localUserScheduleConflict(store, item.userId, item.eventId, area, period, areas);
      if (scheduleConflict) return { error: scheduleConflictMessage(scheduleConflict) };
      const duplicate = store.registrations.some(
        (entry) =>
          entry.id !== item.id &&
          entry.userId === item.userId &&
          entry.eventId === item.eventId &&
          entry.activitySlug === nextActivitySlug &&
          entry.status === "confirmed"
      );
      if (duplicate) return { error: "O participante já possui inscrição nesta área." };
      const takenSeats = store.registrations.filter(
        (entry) =>
          entry.id !== item.id &&
          entry.eventId === item.eventId &&
          entry.activitySlug === nextActivitySlug &&
          entry.status === "confirmed" &&
          entry.details?.period === period
      ).length;
      if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
        return { error: "Esta área está lotada. Não é possível transferir o participante." };
      }
      entries.push({
        field: "activitySlug",
        from: item.activitySlug,
        to: nextActivitySlug,
        reason,
        changedBy: req.localUser.id,
        changedAt: new Date().toISOString()
      });
      entries.push({
        field: "activityTitle",
        from: item.activityTitle,
        to: area.title,
        reason,
        changedBy: req.localUser.id,
        changedAt: new Date().toISOString()
      });
      item.activitySlug = nextActivitySlug;
      item.activityTitle = area.title;
      item.details = { period };
    } else if (item.activitySlug !== "main" && requestedPeriod && requestedPeriod !== item.details?.period) {
      const area = areas.find((entry) => entry.slug === item.activitySlug);
      const period = selectedAreaPeriod(area, requestedPeriod);
      if (!area || !period) return { error: "Escolha o turno da atividade: manhã ou tarde.", status: 400 };
      const scheduleConflict = localUserScheduleConflict(store, item.userId, item.eventId, area, period, areas);
      if (scheduleConflict) return { error: scheduleConflictMessage(scheduleConflict) };
      const takenSeats = store.registrations.filter(
        (entry) =>
          entry.id !== item.id &&
          entry.eventId === item.eventId &&
          entry.activitySlug === item.activitySlug &&
          entry.status === "confirmed" &&
          entry.details?.period === period
      ).length;
      if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
        return { error: `As ${area.seats} vagas da ${period.toLowerCase()} foram preenchidas. Escolha o outro turno.` };
      }
      entries.push({
        field: "details.period",
        from: item.details?.period || "",
        to: period,
        reason,
        changedBy: req.localUser.id,
        changedAt: new Date().toISOString()
      });
      item.details = { ...(item.details || {}), period };
    }

    item.changeHistory.push(...entries);
    item.updatedAt = new Date().toISOString();
    return { item, changed: entries.length };
  });

  if (!result) return res.status(404).json({ message: "Inscrição não encontrada." });
  if (result.error) return res.status(result.status || 409).json({ message: result.error });

  res.json({
    registration: serializeLocalRegistration(result.item, hasSensitiveAccess(req, req.localUser)),
    message: result.changed ? "Inscrição atualizada e registrada no histórico." : "Nenhuma alteração realizada."
  });
}));

router.get("/admin/content", localAuth, localAdmin, asyncHandler(async (_req, res) => {
  const { getSiteContent } = await import("../services/siteContent.js");
  res.json({ content: await getSiteContent() });
}));

router.get("/admin/email-previews", localAuth, localSuperAdmin, asyncHandler(async (_req, res) => {
  const { buildEmailPreviews } = await import("../services/mailer.js");
  res.json({ previews: buildEmailPreviews() });
}));

router.put("/admin/content", localAuth, localSuperAdmin, asyncHandler(async (req, res) => {
  const { saveSiteContent } = await import("../services/siteContent.js");
  const content = await saveSiteContent(req.body, req.localUser.id);
  res.json({ content, message: "Conteúdo publicado no site." });
}));

router.post("/admin/media", localAuth, localSuperAdmin, asyncHandler(async (req, res) => {
  const { saveUploadedAdminMedia } = await import("../services/adminMedia.js");
  const media = await saveUploadedAdminMedia(req.body);
  res.status(201).json({ media, message: "Arquivo enviado com segurança." });
}));

router.get("/admin/stats", localAuth, localAdmin, asyncHandler(async (_req, res) => {
  const store = await readLocalStore();
  const { getSiteContent } = await import("../services/siteContent.js");
  const content = await getSiteContent();
  res.json({
    stats: {
      users: store.users.length,
      verifiedUsers: store.users.filter(u => u.emailVerified).length,
      registrations: store.registrations.length,
      confirmedRegistrations: store.registrations.filter(r => r.status === "confirmed").length,
      activities: content.areas?.length || 0,
      gallery: content.gallery?.length || 0,
      speakers: content.people?.length || 0
    }
  });
}));

router.get("/admin/registrations", localAuth, localAdmin, asyncHandler(async (req, res) => {
  const store = await readLocalStore();
  const revealSensitive = hasSensitiveAccess(req, req.localUser);
  const registrations = [...store.registrations]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 500)
    .map((registration) => serializeLocalRegistration(registration, revealSensitive));

  res.json({ registrations });
}));

router.get("/admin/users", localAuth, localSuperAdmin, asyncHandler(async (req, res) => {
  const store = await readLocalStore();
  const search = cleanText(req.query.search, 120).toLowerCase();
  const digits = search.replace(/\D/g, "");
  const latestByUser = new Map();

  for (const registration of [...store.registrations].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))) {
    if (!latestByUser.has(registration.userId)) latestByUser.set(registration.userId, registration);
  }

  const users = store.users.filter((user) => {
    if (!search) return true;
    const latest = latestByUser.get(user.id);
    const haystack = [
      user.name,
      user.email,
      user.phone,
      latest?.participant?.name,
      latest?.participant?.email,
      latest?.participant?.cpf,
      latest?.participant?.phone
    ].filter(Boolean).join(" ").toLowerCase();
    const onlyDigits = haystack.replace(/\D/g, "");
    return haystack.includes(search) || (digits && onlyDigits.includes(digits));
  });

  const revealSensitive = hasSensitiveAccess(req, req.localUser);
  res.json({
    users: users.map((user) => {
      const latest = latestByUser.get(user.id);
      return {
        id: user.id,
        name: user.name,
        email: protectValue(user.email, revealSensitive),
        phone: protectValue(user.phone || latest?.participant?.phone || "", revealSensitive),
        cpf: protectValue(latest?.participant?.cpf || "", revealSensitive),
        latestActivity: latest?.activityTitle || "",
        role: user.role,
        avatarUrl: user.avatarUrl || latest?.participant?.avatarUrl || "/assets/avatar-default.svg",
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      };
    })
  });
}));

router.patch("/admin/users/:id/role", localAuth, localSuperAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;
  const allowedRoles = new Set(["participant", "checkin", "admin", "super_admin"]);
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ message: "Cargo inválido." });
  }
  const store = await readLocalStore();
  const user = store.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
  if (user.role === "super_admin" && role !== "super_admin") {
    const superAdmins = store.users.filter((item) => item.role === "super_admin").length;
    if (superAdmins <= 1) {
      return res.status(409).json({ message: "O cargo Geral é exclusivo e não pode ficar vazio." });
    }
  }
  
  user.role = role;
  await updateLocalStore(async (s) => {
    const idx = s.users.findIndex(u => u.id === req.params.id);
    if (idx >= 0) s.users[idx] = user;
  });
  
  res.json({ user: publicUser(user, hasSensitiveAccess(req, req.localUser)), message: "Cargo atualizado." });
}));

router.delete("/admin/users/:id", localAuth, localSuperAdmin, asyncHandler(async (req, res) => {
  const store = await readLocalStore();
  const user = store.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
  if (req.localUser?.id === req.params.id) {
    return res.status(409).json({ message: "Você não pode excluir a própria conta." });
  }
  if (user.role === "super_admin") {
    const superAdmins = store.users.filter((item) => item.role === "super_admin").length;
    if (superAdmins <= 1) {
      return res.status(409).json({ message: "Não é possível excluir o último Administrador Geral." });
    }
  }

  await updateLocalStore(async (s) => {
    s.users = s.users.filter(u => u.id !== req.params.id);
  });

  res.json({ message: "Conta do funcionário excluída." });
}));

export default router;
