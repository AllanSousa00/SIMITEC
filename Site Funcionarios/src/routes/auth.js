// Rotas de conta: criar, entrar, sair, confirmar e-mail e recuperar senha.
// Parte seria do sistema: mexer aqui muda como as pessoas acessam tudo.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import validator from "validator";
import { Registration } from "../models/Registration.js";
import { User } from "../models/User.js";
import {
  clearSessionCookie,
  createSensitiveAccessToken,
  createSessionToken,
  mobileSessionPayload,
  hasSensitiveAccess,
  optionalAuth,
  requireAuth,
  setSessionCookie
} from "../middleware/auth.js";
import { InstitutionLookupError, verifyInstitutionSelection } from "../services/institutions.js";
import { legalAcceptanceFields } from "../services/legalRelease.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/mailer.js";
import { protectValue } from "../services/sensitiveData.js";

const router = Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Aguarde um pouco e tente novamente." }
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanText(value, maxLength = 160) {
  return String(value || "").trim().slice(0, maxLength);
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

function cleanUrl(value, maxLength = 240) {
  const raw = String(value || "").trim();
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(raw) && raw.length <= 240000) return raw;
  const input = cleanText(raw, maxLength);
  if (!input) return "";

  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (_error) {
    return "";
  }
}

function makeToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

function validatePassword(password) {
  // Regra simples de senha. Nada de "12345678", porque ai tambem complica.
  const value = String(password || "");

  if (value.length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Use letras e numeros na senha.";
  }

  return null;
}

function googleClientIds() {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function isLocalGoogleFallbackAllowed(req) {
  const host = String(req?.hostname || req?.headers?.host || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("localhost:");
}

function googleProfileFromPayload(payload, allowedAudiences) {
  const aud = String(payload?.aud || "");
  const iss = String(payload?.iss || "");
  const exp = Number(payload?.exp || 0);
  if (!allowedAudiences.includes(aud)) {
    const error = new Error("Conta Google enviada para um aplicativo não autorizado.");
    error.statusCode = 401;
    throw error;
  }
  if (!["accounts.google.com", "https://accounts.google.com"].includes(iss)) {
    const error = new Error("Emissor da conta Google inválido.");
    error.statusCode = 401;
    throw error;
  }
  if (!exp || exp * 1000 <= Date.now()) {
    const error = new Error("Sessão Google expirada. Tente entrar novamente.");
    error.statusCode = 401;
    throw error;
  }
  if (String(payload.email_verified) !== "true" && payload.email_verified !== true) {
    const error = new Error("Use uma conta Google com e-mail verificado.");
    error.statusCode = 401;
    throw error;
  }
  if (!validator.isEmail(payload.email || "")) {
    const error = new Error("A conta Google não retornou um e-mail válido.");
    error.statusCode = 401;
    throw error;
  }
  return {
    googleId: String(payload.sub || ""),
    email: normalizeEmail(payload.email),
    name: cleanText(payload.name || payload.given_name || payload.email, 120),
    avatarUrl: cleanUrl(payload.picture || "")
  };
}

function verifyGoogleCredentialLocally(token, allowedAudiences) {
  const payload = jwt.decode(token);
  if (!payload || typeof payload !== "object") {
    const error = new Error("Token do Google inválido.");
    error.statusCode = 401;
    throw error;
  }
  return googleProfileFromPayload(payload, allowedAudiences);
}

async function verifyGoogleCredential(credential, req) {
  const token = String(credential || "").trim();
  const allowedAudiences = googleClientIds();
  if (!allowedAudiences.length) {
    const error = new Error("Login com Google ainda não configurado no servidor.");
    error.statusCode = 503;
    throw error;
  }
  if (!token) {
    const error = new Error("Token do Google ausente.");
    error.statusCode = 400;
    throw error;
  }

  let response;
  try {
    response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(8000)
    });
  } catch (error) {
    if (isLocalGoogleFallbackAllowed(req)) {
      return verifyGoogleCredentialLocally(token, allowedAudiences);
    }
    const timeoutError = new Error("Não foi possível validar a conta Google agora. Tente novamente em instantes.");
    timeoutError.statusCode = 504;
    throw timeoutError;
  }
  const profile = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Não foi possível validar a conta Google.");
    error.statusCode = 401;
    throw error;
  }
  return googleProfileFromPayload(profile, allowedAudiences);
}

function publicUser(user, revealSensitive = false) {
  return {
    id: user._id,
    name: user.name,
    email: protectValue(user.email, revealSensitive),
    phone: protectValue(user.phone, revealSensitive),
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
    role: user.role,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl || "/assets/avatar-default.svg",
    badges: user.badges || [],
    points: user.points || 0,
    sensitiveDataVisible: revealSensitive
  };
}

router.get("/me", optionalAuth, (req, res) => {
  res.json({ user: req.user ? publicUser(req.user, hasSensitiveAccess(req)) : null });
});

router.get("/google/config", (_req, res) => {
  res.json({
    enabled: Boolean(googleClientIds().length),
    clientId: process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ""
  });
});

router.post("/register", authLimiter, asyncHandler(async (req, res) => {
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

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Este e-mail já está cadastrado." });
  }

  const { raw, hash } = makeToken();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    socialName,
    email,
    phone,
    passwordHash,
    ...legalAcceptanceFields(),
    badges: ["Conta criada"],
    points: 10,
    verificationTokenHash: hash,
    verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  const delivery = await sendVerificationEmail(user, raw);
  const previewUrl = !delivery.delivered && process.env.NODE_ENV !== "production"
    ? delivery.previewUrl
    : "";
  const session = createSessionToken(user);
  setSessionCookie(res, session);

  res.status(201).json({
    user: publicUser(user),
    message: "Conta criada. Confirme seu e-mail para liberar inscrições.",
    sessionToken: session,
    ...mobileSessionPayload(req, session),
    ...(previewUrl ? { previewUrl } : {})
  });
}));

router.post("/bootstrap-super-admin", authLimiter, asyncHandler(async (req, res) => {
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

  const existingSuperAdmin = await User.exists({ role: "super_admin" });
  if (existingSuperAdmin) {
    return res.status(409).json({ message: "Administrador principal já configurado." });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "Crie a conta antes de promovê-la." });
  }

  user.role = "super_admin";
  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpiresAt = undefined;
  await user.save();

  res.json({ user: publicUser(user), message: "Administrador principal configurado." });
}));

router.post("/login", authLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!validator.isEmail(email) || !password) {
    return res.status(400).json({ message: "Informe e-mail e senha." });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "E-mail ou senha inválidos." });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: "E-mail ou senha inválidos." });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = createSessionToken(user);
  setSessionCookie(res, session);

  res.json({
    user: publicUser(user),
    message: "Entrada realizada.",
    sessionToken: session,
    ...mobileSessionPayload(req, session)
  });
}));

router.post("/google", authLimiter, asyncHandler(async (req, res) => {
  let googleProfile;
  try {
    googleProfile = await verifyGoogleCredential(req.body.credential || req.body.idToken, req);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Falha no login com Google." });
  }

  let user = await User.findOne({
    $or: [
      { email: googleProfile.email },
      { googleId: googleProfile.googleId }
    ]
  });

  if (!user) {
    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    user = await User.create({
      name: googleProfile.name,
      email: googleProfile.email,
      passwordHash: randomPasswordHash,
      googleId: googleProfile.googleId,
      authProvider: "google",
      emailVerified: true,
      avatarUrl: googleProfile.avatarUrl || "/assets/avatar-default.svg",
      badges: ["Conta Google"],
      points: 10
    });
  } else {
    user.googleId = user.googleId || googleProfile.googleId;
    user.authProvider = user.authProvider || "google";
    user.emailVerified = true;
    if ((!user.avatarUrl || user.avatarUrl === "/assets/avatar-default.svg") && googleProfile.avatarUrl) {
      user.avatarUrl = googleProfile.avatarUrl;
    }
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = createSessionToken(user);
  setSessionCookie(res, session);
  res.json({
    user: publicUser(user),
    message: user.phone ? "Entrada com Google realizada." : "Conta Google vinculada. Complete seus dados para continuar.",
    needsProfileCompletion: !user.phone,
    sessionToken: session,
    ...mobileSessionPayload(req, session)
  });
}));

router.post("/sensitive-access", authLimiter, requireAuth, asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (!password || !(await bcrypt.compare(password, req.user.passwordHash))) {
    return res.status(401).json({ message: "Senha inválida para visualizar dados sensíveis." });
  }

  res.json({
    sensitiveAccessToken: createSensitiveAccessToken(req.user),
    expiresInSeconds: 300,
    message: "Dados sensíveis liberados por 5 minutos."
  });
}));

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ message: "Sessão encerrada." });
});

router.delete("/me", authLimiter, requireAuth, asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (req.user.role !== "participant") {
    return res.status(403).json({
      message: "Contas da equipe devem ser removidas por um administrador principal."
    });
  }
  if (!password || !(await bcrypt.compare(password, req.user.passwordHash))) {
    return res.status(401).json({ message: "Senha inválida. A conta não foi excluída." });
  }

  await Registration.deleteMany({ userId: req.user._id });
  await User.deleteOne({ _id: req.user._id });
  clearSessionCookie(res);
  return res.json({ message: "Conta e inscrições excluídas permanentemente." });
}));

router.put("/me", requireAuth, asyncHandler(async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const phoneProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "phone");
  const requestedPhone = cleanText(req.body.phone, 40);
  const canEditSensitive = hasSensitiveAccess(req);

  if (!name) {
    return res.status(400).json({ message: "Informe um nome válido." });
  }

  if (phoneProvided && requestedPhone !== String(req.user.phone || "") && !canEditSensitive) {
    return res.status(403).json({
      message: "Use o botão de olho e confirme sua senha para alterar telefone."
    });
  }

  req.user.name = name;
  req.user.socialName = cleanText(req.body.socialName, 120);
  if (phoneProvided && canEditSensitive) {
    req.user.phone = requestedPhone;
  }
  try {
    const officialInstitution = await optionalInstitutionFields(req.body);
    req.user.institution = officialInstitution.institution;
    req.user.institutionPlaceId = officialInstitution.institutionPlaceId;
    req.user.institutionAddress = officialInstitution.institutionAddress;
    req.user.institutionGoogleMapsUri = officialInstitution.institutionGoogleMapsUri;
    req.user.institutionVerifiedAt = officialInstitution.institutionVerifiedAt;
    req.user.course = cleanText(req.body.course, 120);
    req.user.city = officialInstitution.city;
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
  req.user.linkedin = cleanUrl(req.body.linkedin);
  req.user.github = cleanUrl(req.body.github);
  req.user.bio = cleanText(req.body.bio, 300);
  req.user.avatarUrl = cleanUrl(req.body.avatarUrl) || "/assets/avatar-default.svg";
  req.user.badges = Array.isArray(req.user.badges) ? req.user.badges : [];
  req.user.points = Number(req.user.points || 0);

  if (!req.user.badges.includes("Perfil atualizado")) {
    req.user.badges.push("Perfil atualizado");
    req.user.points += 15;
  }

  await req.user.save();

  res.json({ user: publicUser(req.user, hasSensitiveAccess(req)), message: "Perfil atualizado." });
}));

router.get("/verify/:token", asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.params.token);
  const user = await User.findOne({
    verificationTokenHash: tokenHash,
    verificationExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.redirect("/?verified=invalid#/entrar");
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpiresAt = undefined;
  await user.save();

  const session = createSessionToken(user);
  setSessionCookie(res, session);

  return res.redirect("/?verified=1#/inscricao");
}));

router.post("/resend-verification", authLimiter, requireAuth, asyncHandler(async (req, res) => {
  if (req.user.emailVerified) {
    return res.json({ message: "Seu e-mail já foi confirmado." });
  }

  const { raw, hash } = makeToken();
  req.user.verificationTokenHash = hash;
  req.user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await req.user.save();

  const delivery = await sendVerificationEmail(req.user, raw);
  const previewUrl = !delivery.delivered && process.env.NODE_ENV !== "production"
    ? delivery.previewUrl
    : "";

  res.json({
    message: "Enviamos um novo link de confirmação.",
    ...(previewUrl ? { previewUrl } : {})
  });
}));

router.post("/forgot-password", authLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const audience = req.body.audience === "staff" ? "staff" : "public";
  let previewUrl = "";

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Informe um e-mail válido." });
  }

  const user = await User.findOne({ email });

  if (user) {
    const { raw, hash } = makeToken();
    user.resetTokenHash = hash;
    user.resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const delivery = await sendPasswordResetEmail(user, raw, { audience });
    if (!delivery.delivered && process.env.NODE_ENV !== "production") {
      previewUrl = delivery.previewUrl;
    }
  }

  res.json({
    message: "Se o e-mail existir, enviaremos um link de recuperação. Verifique também a caixa de spam ou lixo eletrônico.",
    ...(previewUrl ? { previewUrl } : {})
  });
}));

router.post("/reset-password", authLimiter, asyncHandler(async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  const passwordError = validatePassword(password);

  if (!token) {
    return res.status(400).json({ message: "Token de recuperação ausente." });
  }

  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ message: "Link inválido ou expirado." });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetExpiresAt = undefined;
  await user.save();

  res.json({ message: "Senha atualizada. Entre com a nova senha." });
}));

export default router;
