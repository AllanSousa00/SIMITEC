// Rotas de inscricao do participante.
// Aqui nasce a inscricao geral, a escolha de area e o QR Code da credencial.
import { Router } from "express";
import QRCode from "qrcode";
import crypto from "node:crypto";
import validator from "validator";
import { hasSensitiveAccess, requireAuth, requireVerifiedEmail } from "../middleware/auth.js";
import { Registration } from "../models/Registration.js";
import { User } from "../models/User.js";
import { releaseCapacity, reserveCapacity } from "../services/capacityReservations.js";
import { InstitutionLookupError, searchInstitutions, verifyInstitutionSelection } from "../services/institutions.js";
import { protectRegistration } from "../services/sensitiveData.js";
import { findContentArea, getPublicSiteContent } from "../services/siteContent.js";
import {
  areaPeriods,
  findAreaScheduleConflict,
  scheduleConflictMessage,
  selectedAreaPeriod
} from "../services/activitySchedule.js";

const router = Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function eventYear(value = "") {
  return String(value || "").match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear();
}

function createTicketCodeForEvent(event = {}) {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIM-${eventYear(event.edition || event.year || event.id)}-${suffix}`;
}
const publicParticipantRoles = new Set(["Estudante", "Visitante"]);
const controlledParticipantRoles = new Set(["Professor(a)", "Organizador(a)"]);

function cleanText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanUrl(value, maxLength = 1000) {
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
      teacherValidationRequestedAt: existingParticipant.teacherValidationRequestedAt || new Date(),
      teacherValidationReviewedAt: existingParticipant.teacherValidationReviewedAt || null
    };
  }

  return {
    teacherCardCode: code,
    teacherValidationStatus: "pending",
    teacherValidationRequestedAt: new Date(),
    teacherValidationReviewedAt: null
  };
}

async function optionalInstitutionFields(body = {}) {
  const institution = cleanText(body.institution, 160);
  const placeId = cleanText(body.institutionPlaceId, 220);
  if (!institution && !placeId) return null;
  if (!placeId) return null;

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

function mapParticipant(body, fallbackUser, officialInstitution = null, existingParticipant = {}) {
  const name = cleanText(body.name || fallbackUser.name, 120);
  const email = cleanText(body.email || existingParticipant.email || fallbackUser.email, 160).toLowerCase();
  const cpf = cleanText(body.cpf || existingParticipant.cpf, 20);
  const requestedRole = cleanText(body.role, 40);
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
    role: preservedControlledRole || (publicParticipantRoles.has(requestedRole) ? requestedRole : "Estudante"),
    institution: officialInstitution?.institution || cleanText(body.institution, 160),
    institutionPlaceId: officialInstitution?.institutionPlaceId || "",
    institutionAddress: officialInstitution?.institutionAddress || "",
    institutionGoogleMapsUri: officialInstitution?.institutionGoogleMapsUri || "",
    institutionVerifiedAt: officialInstitution?.institutionVerifiedAt || null,
    course: cleanText(body.course, 120),
    city: officialInstitution?.city || cleanText(body.city, 120),
    accessibility: cleanText(body.accessibility, 300)
  };
}

function cleanDetails(details = {}) {
  const output = {};

  for (const [key, value] of Object.entries(details)) {
    const cleanKey = cleanText(key, 50);
    if (!cleanKey) continue;
    output[cleanKey] = cleanText(value, 500);
  }

  return output;
}

function serializeRegistration(registration, revealSensitive = false) {
  return protectRegistration(registration, revealSensitive);
}

async function buildTicket(registration, revealSensitive = false) {
  // Um QR Code unico carrega entrada geral e areas escolhidas.
  // Assim a equipe nao precisa ficar adivinhando onde a pessoa se meteu.
  const { event } = await getPublicSiteContent();
  const linkedRegistrations = await Registration.find({
    user: registration.user,
    eventId: event.id,
    status: "confirmed"
  })
    .select("activitySlug activityTitle ticketCode status")
    .sort({ activitySlug: 1 })
    .lean();
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
    ...serializeRegistration(registration, revealSensitive),
    qrCode
  };
}

router.get("/event", asyncHandler(async (_req, res) => {
  res.json(await getPublicSiteContent());
}));

router.get("/institutions/search", asyncHandler(async (req, res) => {
  try {
    return res.json(await searchInstitutions(req.query.q));
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
}));

router.get("/mine", requireAuth, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const registrations = await Registration.find({
    user: req.user._id,
    eventId: event.id
  })
    .select("-changeHistory")
    .sort({ createdAt: 1 })
    .lean();

  const revealSensitive = hasSensitiveAccess(req);
  res.json({ registrations: registrations.map((item) => serializeRegistration(item, revealSensitive)) });
}));

router.post("/event", requireAuth, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req);

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

  const existingRegistration = await Registration.findOne({
    user: req.user._id,
    eventId: event.id,
    activitySlug: "main"
  });

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

  const participant = mapParticipant(req.body, req.user, officialInstitution, existingRegistration?.participant || {});
  if (!participant) {
    return res.status(400).json({ message: "Preencha nome, e-mail e CPF válidos." });
  }

  const registration = await Registration.findOneAndUpdate(
    {
      user: req.user._id,
      eventId: event.id,
      activitySlug: "main"
    },
    {
      $setOnInsert: {
        ticketCode: createTicketCodeForEvent(event)
      },
      $set: {
        activityTitle: "Credenciamento geral",
        participant,
        acceptedTermsAt: new Date(),
        status: "confirmed"
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!existingRegistration) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { badges: "Credenciamento confirmado" },
      $inc: { points: 25 }
    });
  }

  res.status(201).json({
    registration: serializeRegistration(registration, revealSensitive),
    ticket: await buildTicket(registration, revealSensitive),
    message: "Inscrição geral confirmada."
  });
}));

router.post("/areas/:slug", requireAuth, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const { event, areas } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req);
  const area = await findContentArea(req.params.slug);

  if (!area) {
    return res.status(404).json({ message: "Área do evento não encontrada." });
  }

  const mainRegistration = await Registration.findOne({
    user: req.user._id,
    eventId: event.id,
    activitySlug: "main",
    status: "confirmed"
  });

  if (!mainRegistration) {
    return res.status(409).json({ message: "Faça primeiro a inscrição geral no evento." });
  }

  const existing = await Registration.findOne({
    user: req.user._id,
    eventId: event.id,
    activitySlug: area.slug
  });

  const details = cleanDetails(req.body.details);
  const period = selectedAreaPeriod(area, details.period);
  if (areaPeriods(area).length && !period) {
    return res.status(400).json({ message: "Escolha o turno: manhã ou tarde." });
  }

  details.period = period;
  const linkedRegistrations = await Registration.find({
    user: req.user._id,
    eventId: event.id,
    activitySlug: { $ne: "main" },
    status: "confirmed"
  }).lean();
  const scheduleConflict = findAreaScheduleConflict({ area, period, registrations: linkedRegistrations, areas });
  if (scheduleConflict) {
    return res.status(409).json({ message: scheduleConflictMessage(scheduleConflict) });
  }

  const previousPeriod = existing?.status === "confirmed" ? existing?.details?.period || "" : "";
  const needsReservation = !existing || previousPeriod !== period;
  const reservation = needsReservation ? await reserveCapacity({
    eventId: event.id,
    activitySlug: area.slug,
    period,
    capacity: Number(area.seats || 0),
    countExisting: () => Registration.countDocuments({
      eventId: event.id,
      activitySlug: area.slug,
      status: "confirmed",
      "details.period": period,
      ...(existing ? { _id: { $ne: existing._id } } : {})
    })
  }) : { reserved: true };
  if (!reservation.reserved) {
    return res.status(409).json({ message: `As ${area.seats} vagas da ${period.toLowerCase()} foram preenchidas. Escolha o outro turno.` });
  }

  for (const field of area.formFields) {
    if (field.required && !details[field.name]) {
      return res.status(400).json({ message: `Preencha: ${field.label}.` });
    }
  }

  let registration;
  try {
    registration = await Registration.findOneAndUpdate(
      {
        user: req.user._id,
        eventId: event.id,
        activitySlug: area.slug
      },
      {
        $setOnInsert: {
          ticketCode: createTicketCodeForEvent(event)
        },
        $set: {
          activityTitle: area.title,
          participant: mainRegistration.participant,
          details,
          acceptedTermsAt: new Date(),
          status: "confirmed"
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (needsReservation && reservation.limited) {
      await releaseCapacity({ eventId: event.id, activitySlug: area.slug, period });
    }
    throw error;
  }
  if (previousPeriod && previousPeriod !== period) {
    await releaseCapacity({ eventId: event.id, activitySlug: area.slug, period: previousPeriod });
  }

  if (!existing) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { badges: `Participante: ${area.shortTitle}` },
      $inc: { points: 50 }
    });
  }

  res.status(201).json({
    registration: serializeRegistration(registration, revealSensitive),
    ticket: await buildTicket(registration, revealSensitive),
    message: `Inscrição em ${area.shortTitle} confirmada.`
  });
}));

router.get("/:id/ticket", requireAuth, asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const registration = await Registration.findOne({
    _id: req.params.id,
    user: req.user._id,
    eventId: event.id
  });

  if (!registration) {
    return res.status(404).json({ message: "Credencial não encontrada." });
  }

  res.json({ ticket: await buildTicket(registration, hasSensitiveAccess(req)) });
}));

export default router;
