// Rotas oficiais do credenciamento quando o MongoDB esta conectado.
// O painel e o app batem aqui para buscar participantes, validar QR Code,
// editar dados e confirmar entrada.
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import QRCode from "qrcode";
import rateLimit from "express-rate-limit";
import { hasSensitiveAccess, requireAuth, requireCheckin } from "../middleware/auth.js";
import { Registration } from "../models/Registration.js";
import { User } from "../models/User.js";
import { CHECKIN_RESULT, setRegistrationCheckin } from "../services/checkinOperations.js";
import { releaseCapacity, reserveCapacity } from "../services/capacityReservations.js";
import {
  beginIdempotentOperation,
  completeIdempotentOperation,
  readIdempotencyKey
} from "../services/idempotency.js";
import {
  InstitutionLookupError,
  institutionVerificationEnabled,
  searchInstitutions,
  verifyInstitutionSelection
} from "../services/institutions.js";
import { findContentArea, getPublicSiteContent, isDatabaseConnected } from "../services/siteContent.js";
import { protectGroup, protectRegistration } from "../services/sensitiveData.js";
import {
  areaPeriods,
  findAreaScheduleConflict,
  registrationPeriod,
  scheduleConflictMessage,
  selectedAreaPeriod
} from "../services/activitySchedule.js";

const router = Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const checkinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas ações de credenciamento. Aguarde um pouco." }
});
const allowedParticipantRoles = new Set(["Estudante", "Professor(a)", "Visitante"]);

function requireDatabase(_req, res, next) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({ message: "Banco de dados indisponível para o credenciamento." });
  }

  return next();
}

function cleanText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanTeacherCardCode(value) {
  return cleanText(value, 80).replace(/\s+/g, " ");
}

function checkinConflictResponse(result) {
  const status = result.code === CHECKIN_RESULT.REGISTRATION_NOT_FOUND ? 404 : 409;
  const messages = {
    [CHECKIN_RESULT.REGISTRATION_NOT_FOUND]: "Inscrição não encontrada para credenciamento.",
    [CHECKIN_RESULT.WRONG_EVENT]: "A inscrição não pertence ao evento atual.",
    [CHECKIN_RESULT.INVALID_REGISTRATION_STATUS]: "A inscrição não está disponível para credenciamento.",
    [CHECKIN_RESULT.ALREADY_CHECKED_IN]: "Participante já credenciado.",
    [CHECKIN_RESULT.ALREADY_CHECKED_OUT]: "O credenciamento já estava desfeito."
  };
  return { status, body: { code: result.code, message: messages[result.code] || "Conflito no credenciamento." } };
}

async function idempotentCheckinReplay(operation, req, res, checkedIn) {
  const record = operation.record;
  if (operation.state === "completed" && record.resultCode !== CHECKIN_RESULT.UPDATED) {
    const conflict = checkinConflictResponse({ code: record.resultCode });
    return res.status(record.responseStatus || conflict.status).json({
      ...conflict.body,
      operationId: record.operationId,
      idempotentReplay: true
    });
  }
  const registration = await Registration.findOne({
    _id: record.resourceId,
    "changeHistory.operationId": record.operationId
  });
  if (!registration) {
    return res.status(409).json({
      code: "IDEMPOTENCY_IN_PROGRESS",
      operationId: record.operationId,
      message: "A operação anterior ainda está sendo confirmada. Tente novamente com a mesma chave."
    });
  }

  if (operation.state === "in_progress") {
    await completeIdempotentOperation({
      recordId: record._id,
      responseStatus: 200,
      resultCode: CHECKIN_RESULT.UPDATED
    });
  }
  return res.status(200).json({
    registration: serializeRegistration(registration.toJSON(), hasSensitiveAccess(req)),
    operationId: record.operationId,
    idempotentReplay: true,
    message: checkedIn ? "Participante credenciado." : "Credenciamento desfeito."
  });
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

function sendInstitutionError(res, error) {
  if (!(error instanceof InstitutionLookupError)) return false;
  res.status(error.statusCode).json({ message: error.message });
  return true;
}

function eventYear(value = "") {
  return String(value || "").match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear();
}

function createTicketCodeForEvent(event = {}) {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIM-${eventYear(event.edition || event.year || event.id)}-${suffix}`;
}

function serializeRegistration(registration, revealSensitive = false) {
  const clean = protectRegistration(registration, revealSensitive);
  const userAvatarUrl = clean.user && typeof clean.user === "object" ? clean.user.avatarUrl : "";
  if (userAvatarUrl && clean.participant && !clean.participant.avatarUrl) {
    clean.participant.avatarUrl = userAvatarUrl;
  }
  return {
    ...clean,
    _id: clean._id?.toString?.() || clean._id,
    checkedIn: Boolean(clean.checkedInAt),
    checkedInAt: clean.checkedInAt || null
  };
}

async function buildCredentialTicket(registration, event, revealSensitive = false) {
  const plain = registration.toJSON ? registration.toJSON() : registration;
  const linkedRegistrations = await Registration.find({
    user: plain.user,
    eventId: event.id,
    status: "confirmed"
  }).sort({ activitySlug: 1 }).lean();
  const confirmedAreas = linkedRegistrations
    .filter((item) => item.activitySlug !== "main")
    .map((item) => ({
      code: item.ticketCode,
      slug: item.activitySlug,
      title: item.activityTitle
    }));
  const payload = {
    type: "simitec-credential",
    code: plain.ticketCode,
    eventId: event.id,
    edition: event.edition,
    access: ["main", ...confirmedAreas.map((area) => area.slug)],
    areas: confirmedAreas,
    status: plain.status
  };

  return {
    ...serializeRegistration(plain, revealSensitive),
    areas: confirmedAreas,
    qrCode: await QRCode.toDataURL(JSON.stringify(payload), {
      margin: 1,
      width: 240
    })
  };
}

async function buildAreaStats(event, areas = []) {
  const list = areas || [];
  const areaSlugs = list.map((area) => area.slug).filter(Boolean);
  const counts = areaSlugs.length
    ? await Registration.aggregate([
        {
          $match: {
            eventId: event.id,
            activitySlug: { $in: areaSlugs },
            status: "confirmed"
          }
        },
        {
          $group: {
            _id: { slug: "$activitySlug", period: "$details.period" },
            taken: { $sum: 1 }
          }
        }
      ])
    : [];
  const takenByPeriod = new Map(counts.map((item) => [`${item._id.slug}::${item._id.period || ""}`, item.taken]));

  return list.map((area) => {
    const seatsPerPeriod = Number(area.seats || 0);
    const periods = areaPeriods(area).map((name) => {
      const taken = takenByPeriod.get(`${area.slug}::${name}`) || 0;
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
}

async function buildStats(event, areas = []) {
  // Contadores da entrada: total, credenciados, pendentes e vagas por area.
  // E o placar do evento, basicamente.
  const [statsRow = {}, areaStats] = await Promise.all([
    Registration.aggregate([
      { $match: { eventId: event.id, status: "confirmed" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $ifNull: ["$checkedInAt", false] }, 1, 0] } }
        }
      }
    ]).then((rows) => rows[0] || {}),
    buildAreaStats(event, areas)
  ]);
  const total = Number(statsRow.total || 0);
  const checkedIn = Number(statsRow.checkedIn || 0);

  return { total, checkedIn, pending: Math.max(total - checkedIn, 0), areas: areaStats };
}

async function mongoUserScheduleConflict(user, eventId, area, period) {
  const userId = user?._id || user;
  if (!userId) return null;
  const { areas } = await getPublicSiteContent();
  const registrations = await Registration.find({
    user: userId,
    eventId,
    activitySlug: { $ne: "main" },
    status: "confirmed"
  }).lean();
  return findAreaScheduleConflict({ area, period, registrations, areas });
}

async function findRegistrations(event, queryParams = {}, revealSensitive = false) {
  const query = cleanText(queryParams.q, 120);
  const activitySlug = cleanText(queryParams.activitySlug, 80);
  const checked = cleanText(queryParams.checked, 20);

  const filter = {
    eventId: event.id,
    status: "confirmed"
  };

  if (activitySlug && activitySlug !== "all") filter.activitySlug = activitySlug;
  if (checked === "yes") filter.checkedInAt = { $ne: null };
  if (checked === "no") filter.checkedInAt = null;

  if (query) {
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { "participant.name": new RegExp(safe, "i") },
      { "participant.email": new RegExp(safe, "i") },
      { "participant.cpf": new RegExp(safe, "i") },
      { "participant.phone": new RegExp(safe, "i") },
      { "participant.institution": new RegExp(safe, "i") },
      { "participant.course": new RegExp(safe, "i") },
      { "participant.shift": new RegExp(safe, "i") },
      { "group.responsibleName": new RegExp(safe, "i") },
      { ticketCode: new RegExp(safe, "i") },
      { activityTitle: new RegExp(safe, "i") }
    ];
  }

  const registrations = await Registration.find(filter)
    .select("-changeHistory")
    .sort({ checkedInAt: 1, createdAt: -1 })
    .limit(300)
    .populate("user", "avatarUrl")
    .lean();

  return registrations.map((item) => serializeRegistration(item, revealSensitive));
}

function ticketCodesFromBody(body = {}) {
  const directCode = cleanText(body.code, 80);
  if (directCode) return [directCode];

  const payload = cleanText(body.payload, 4000);
  if (!payload) return [];

  try {
    const parsed = JSON.parse(payload);
    const codes = [];
    const direct = cleanText(parsed.code || parsed.CODE, 80);
    if (direct) codes.push(direct);
    const areas = Array.isArray(parsed.areas) ? parsed.areas : Array.isArray(parsed.AREAS) ? parsed.AREAS : [];
    for (const area of areas) {
      const areaCode = cleanText(area?.code || area?.CODE, 80);
      if (areaCode) codes.push(areaCode);
    }
    return [...new Set(codes)];
  } catch (_error) {
    return [payload];
  }
}

function historyEntry(field, from, to, userId, reason = "") {
  return {
    field,
    from: from ?? "",
    to: to ?? "",
    reason,
    changedBy: userId?.toString?.() || userId,
    changedAt: new Date()
  };
}

function onsiteEmail(email = "", prefix = "presencial") {
  const clean = cleanText(email, 160).toLowerCase();
  if (clean) return clean;
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@simitec.local`;
}

function onsiteParticipant(body = {}, email) {
  const name = cleanText(body.name, 120);
  if (!name) return null;
  return {
    name,
    socialName: cleanText(body.socialName, 120),
    email,
    cpf: cleanText(body.cpf, 20),
    phone: cleanText(body.phone, 40),
    teacherCardCode: cleanTeacherCardCode(body.teacherCardCode),
    teacherValidationStatus: cleanTeacherCardCode(body.teacherCardCode) ? "approved" : "not-requested",
    teacherValidationRequestedAt: cleanTeacherCardCode(body.teacherCardCode) ? new Date() : null,
    teacherValidationReviewedAt: cleanTeacherCardCode(body.teacherCardCode) ? new Date() : null,
    role: allowedParticipantRoles.has(cleanText(body.role, 40)) ? cleanText(body.role, 40) : "Estudante",
    institution: cleanText(body.institution, 160),
    institutionPlaceId: cleanText(body.institutionPlaceId, 220),
    institutionAddress: cleanText(body.institutionAddress, 240),
    institutionGoogleMapsUri: cleanText(body.institutionGoogleMapsUri, 500),
    institutionVerifiedAt: body.institutionVerifiedAt || null,
    course: cleanText(body.course, 120),
    shift: cleanText(body.shift, 80),
    city: cleanText(body.city, 120),
    accessibility: cleanText(body.accessibility, 300)
  };
}

function groupIdForEvent(event = {}) {
  return `GRP-${eventYear(event.edition || event.year || event.id)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function groupMemberNameAndEmail(value = "") {
  const raw = cleanText(value, 240);
  const emailMatch = raw.match(/<([^<>\s]+@[^<>\s]+\.[^<>\s]+)>/i) || raw.match(/([^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+)/i);
  const email = cleanText(emailMatch?.[1], 160).toLowerCase();
  const name = raw
    .replace(emailMatch?.[0] || "", "")
    .replace(/[<>()]/g, "")
    .replace(/\s*[,;|-]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { name: cleanText(name, 120), email };
}

function groupMembersFromBody(body = {}) {
  const raw = Array.isArray(body.participants) ? body.participants : [];
  const members = raw
    .map((item) => {
      const parsed = groupMemberNameAndEmail(item?.name || item);
      const email = cleanText(item?.email, 160).toLowerCase() || parsed.email;
      return {
        name: parsed.name || cleanText(item?.name, 120),
        socialName: cleanText(item?.socialName, 120),
        email,
        cpf: cleanText(item?.cpf, 20),
        phone: cleanText(item?.phone, 40),
        certificateEmail: cleanText(item?.certificateEmail, 160).toLowerCase() || email,
        role: allowedParticipantRoles.has(cleanText(item?.role, 40)) ? cleanText(item?.role, 40) : "Estudante",
        accessibility: cleanText(item?.accessibility, 300)
      };
    })
    .filter((item) => item.name);

  if (body.includeResponsible && cleanText(body.responsibleName, 120)) {
    members.unshift({
      name: cleanText(body.responsibleName, 120),
      socialName: "",
      email: cleanText(body.responsibleEmail, 160).toLowerCase(),
      cpf: cleanText(body.responsibleCpf, 20),
      phone: cleanText(body.responsiblePhone, 40),
      certificateEmail: cleanText(body.responsibleEmail, 160).toLowerCase(),
      role: allowedParticipantRoles.has(cleanText(body.responsibleRole, 40)) ? cleanText(body.responsibleRole, 40) : "Visitante",
      accessibility: ""
    });
  }

  return members.slice(0, 80);
}

function groupParticipant(member = {}, group = {}, index = 0) {
  const email = member.email || onsiteEmail("", `grupo-${String(group.id || "simitec").toLowerCase()}-${index + 1}`);
  return {
    name: member.name,
    socialName: member.socialName,
    email,
    cpf: member.cpf,
    phone: member.phone,
    role: member.role,
    institution: group.institution,
    institutionPlaceId: group.institutionPlaceId,
    institutionAddress: group.institutionAddress,
    institutionGoogleMapsUri: group.institutionGoogleMapsUri,
    institutionVerifiedAt: group.institutionVerifiedAt,
    course: group.course,
    shift: group.shift,
    city: group.city,
    certificateEmail: group.certificateDelivery === "responsible" ? group.responsibleEmail : (member.email || member.certificateEmail || group.responsibleEmail || ""),
    accessibility: member.accessibility
  };
}

router.use(requireDatabase);
router.use(requireAuth);
router.use(requireCheckin);
router.use(checkinLimiter);

router.get("/institutions/search", asyncHandler(async (req, res) => {
  try {
    return res.json(await searchInstitutions(req.query.q));
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
}));

router.get("/stats", asyncHandler(async (_req, res) => {
  const { event, areas } = await getPublicSiteContent();
  res.json({ stats: await buildStats(event, areas) });
}));

router.get("/registrations", asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  res.json({ registrations: await findRegistrations(event, req.query, hasSensitiveAccess(req)) });
}));

router.get("/registrations/:id/ticket", asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const registration = await Registration.findOne({
    _id: req.params.id,
    eventId: event.id,
    status: "confirmed"
  });

  if (!registration) {
    return res.status(404).json({ message: "Credencial não encontrada para impressão." });
  }

  res.json({ ticket: await buildCredentialTicket(registration, event, hasSensitiveAccess(req)) });
}));

router.get("/bootstrap", asyncHandler(async (req, res) => {
  // Pacote unico para o app: evento + areas + estatisticas + inscricoes.
  // Menos viagens pela rede, mais velocidade no celular.
  const { event, areas } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req);
  const [stats, registrations] = await Promise.all([
    buildStats(event, areas),
    findRegistrations(event, req.query, revealSensitive)
  ]);

  res.json({
    database: "connected",
    serverTime: new Date().toISOString(),
    event,
    stats,
    areas: stats.areas,
    registrations
  });
}));

router.patch("/registrations/:id/checkin", asyncHandler(async (req, res) => {
  const checkedIn = req.body.checkedIn !== false;
  const notes = cleanText(req.body.notes, 240);
  const { event } = await getPublicSiteContent();
  const operation = await beginIdempotentOperation({
    key: readIdempotencyKey(req),
    userId: req.user._id,
    method: req.method,
    route: "/api/checkin/registrations/:id/checkin",
    resourceId: req.params.id,
    payload: { checkedIn, notes }
  });

  if (operation.state === "mismatch") {
    return res.status(409).json({
      code: "IDEMPOTENCY_KEY_REUSED",
      message: "Esta Idempotency-Key já foi usada em uma operação diferente."
    });
  }
  if (operation.state === "completed" || operation.state === "in_progress") {
    return idempotentCheckinReplay(operation, req, res, checkedIn);
  }

  const result = await setRegistrationCheckin({
    registrationId: req.params.id,
    eventId: event.id,
    operatorId: req.user._id,
    checkedIn,
    notes,
    operationId: operation.operationId
  });

  if (result.code !== CHECKIN_RESULT.UPDATED) {
    const conflict = checkinConflictResponse(result);
    if (operation.enabled) {
      await completeIdempotentOperation({
        recordId: operation.record._id,
        responseStatus: conflict.status,
        resultCode: result.code
      });
    }
    return res.status(conflict.status).json({ ...conflict.body, operationId: operation.operationId });
  }

  if (operation.enabled) {
    await completeIdempotentOperation({
      recordId: operation.record._id,
      responseStatus: 200,
      resultCode: result.code
    });
  }

  res.json({
    registration: serializeRegistration(result.registration.toJSON(), hasSensitiveAccess(req)),
    operationId: operation.operationId,
    message: checkedIn ? "Participante credenciado." : "Credenciamento desfeito."
  });
}));

router.post("/scan", asyncHandler(async (req, res) => {
  const ticketCodes = ticketCodesFromBody(req.body);
  if (!ticketCodes.length) {
    return res.status(400).json({ message: "QR Code inválido ou sem código de credencial." });
  }

  const { event } = await getPublicSiteContent();
  const registration = await Registration.findOne({
    ticketCode: { $in: ticketCodes },
    status: "confirmed"
  }).sort({ eventId: event.id ? -1 : 1, activitySlug: 1 });

  if (!registration) {
    return res.status(404).json({ message: "Credencial não encontrada para este evento." });
  }

  const linkedFilter = {
    eventId: registration.eventId,
    user: registration.user,
    status: "confirmed"
  };
  const linkedRegistrations = await Registration.find(linkedFilter)
    .select("checkedInAt")
    .lean();
  const alreadyCheckedIn = linkedRegistrations.length > 0 && linkedRegistrations.every((item) => Boolean(item.checkedInAt));
  await Registration.updateMany(
    {
      ...linkedFilter,
      checkedInAt: null
    },
    {
      $set: {
        checkedInAt: new Date(),
        checkedInBy: req.user._id
      }
    }
  );

  const updatedRegistration = await Registration.findById(registration._id).lean();

  res.json({
    registration: serializeRegistration(updatedRegistration || registration.toJSON(), hasSensitiveAccess(req)),
    alreadyCheckedIn,
    message: alreadyCheckedIn ? "Participante já estava credenciado." : "Participante credenciado pelo QR Code único."
  });
}));

router.post("/onsite-registrations", asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const providedEmail = cleanText(req.body.email, 160).toLowerCase();
  const providedCpf = cleanText(req.body.cpf, 20);
  const providedPhone = cleanText(req.body.phone, 40);
  if (!providedEmail && !providedCpf && !providedPhone) {
    return res.status(400).json({ message: "Informe ao menos um contato: e-mail, CPF ou telefone." });
  }
  const email = onsiteEmail(req.body.email);
  let verifiedInstitution;
  try {
    verifiedInstitution = await institutionFields(req.body);
  } catch (error) {
    if (sendInstitutionError(res, error)) return;
    throw error;
  }
  const participant = onsiteParticipant({
    ...req.body,
    ...verifiedInstitution,
    city: verifiedInstitution.institutionCity || req.body.city
  }, email);
  if (!participant) {
    return res.status(400).json({ message: "Informe pelo menos o nome do participante." });
  }
  if (participant.role === "Professor(a)" && !participant.teacherCardCode) {
    return res.status(400).json({ message: "Para liberar Professor(a), informe e confira o código da CNDB no site oficial do MEC." });
  }

  const areaSlug = cleanText(req.body.activitySlug, 80);
  if (!areaSlug || areaSlug === "main") {
    return res.status(400).json({ message: "Escolha uma área para concluir o cadastro presencial." });
  }
  const area = await findContentArea(areaSlug);
  if (!area) {
    return res.status(404).json({ message: "Área escolhida não encontrada." });
  }
  const period = selectedAreaPeriod(area, req.body.period);
  if (!period) {
    return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });
  }
  let user = await User.findOne({ email });
  const scheduleConflict = await mongoUserScheduleConflict(user, event.id, area, period);
  if (scheduleConflict) {
    return res.status(409).json({ message: scheduleConflictMessage(scheduleConflict) });
  }
  const existingAreaRegistration = user ? await Registration.findOne({
    user: user._id,
    eventId: event.id,
    activitySlug: area.slug
  }) : null;
  const previousPeriod = existingAreaRegistration?.status === "confirmed"
    ? existingAreaRegistration?.details?.period || ""
    : "";
  const needsReservation = !existingAreaRegistration || previousPeriod !== period;
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
      ...(existingAreaRegistration ? { _id: { $ne: existingAreaRegistration._id } } : {})
    })
  }) : { reserved: true };
  if (!reservation.reserved) {
    return res.status(409).json({ message: `As ${area.seats} vagas da ${period.toLowerCase()} foram preenchidas. Escolha o outro turno.` });
  }

  const checkedAt = new Date();
  let areaRegistration;
  try {
    if (!user) {
      user = await User.create({
        name: participant.name,
        socialName: participant.socialName,
        email,
        phone: participant.phone,
        passwordHash: await bcrypt.hash(crypto.randomBytes(18).toString("hex"), 12),
        role: "participant",
        emailVerified: true,
        acceptedTermsAt: new Date()
      });
    }
    await Registration.findOneAndUpdate(
      { user: user._id, eventId: event.id, activitySlug: "main" },
      {
        $setOnInsert: { ticketCode: createTicketCodeForEvent(event) },
        $set: {
          activityTitle: "Credenciamento geral",
          participant,
          acceptedTermsAt: checkedAt,
          status: "confirmed",
          checkedInAt: checkedAt,
          checkedInBy: req.user._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    areaRegistration = await Registration.findOneAndUpdate(
      { user: user._id, eventId: event.id, activitySlug: area.slug },
      {
        $setOnInsert: { ticketCode: createTicketCodeForEvent(event) },
        $set: {
          activityTitle: area.title,
          participant,
          details: { period },
          acceptedTermsAt: checkedAt,
          status: "confirmed",
          checkedInAt: checkedAt,
          checkedInBy: req.user._id
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

  res.status(201).json({
    registration: serializeRegistration(areaRegistration.toJSON(), hasSensitiveAccess(req)),
    message: `Participante cadastrado e credenciado em ${area.shortTitle || area.title}.`
  });
}));

router.post("/group-registrations", asyncHandler(async (req, res) => {
  const { event } = await getPublicSiteContent();
  const revealSensitive = hasSensitiveAccess(req);
  const areaSlug = cleanText(req.body.activitySlug, 80);
  if (!areaSlug || areaSlug === "main") {
    return res.status(400).json({ message: "Escolha uma área para cadastrar o grupo." });
  }

  const area = await findContentArea(areaSlug);
  if (!area) {
    return res.status(404).json({ message: "Área escolhida não encontrada." });
  }
  const period = selectedAreaPeriod(area, req.body.period);
  if (!period) {
    return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });
  }

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
  const responsibleEmail = cleanText(req.body.responsibleEmail, 160).toLowerCase();
  const responsibleRole = cleanText(req.body.responsibleRole, 80) || "Responsável";
  const certificateDelivery = cleanText(req.body.certificateDelivery, 40) === "responsible" ? "responsible" : "student";
  const notes = cleanText(req.body.notes || req.body.accessibility, 300);

  if (!institution || !course) {
    return res.status(400).json({ message: "Informe a instituição e o ano/série ou turma do grupo." });
  }
  if (!responsibleName || (!responsiblePhone && !responsibleEmail)) {
    return res.status(400).json({ message: "Informe o responsável e pelo menos telefone ou e-mail dele." });
  }

  const members = groupMembersFromBody(req.body);
  if (!members.length) {
    return res.status(400).json({ message: "Informe pelo menos um participante do grupo." });
  }
  const missingCertificateEmail = members.some((member) => !member.email && !member.certificateEmail);
  if ((certificateDelivery === "responsible" || missingCertificateEmail) && !responsibleEmail) {
    return res.status(400).json({ message: "Informe o e-mail do responsável para envio dos certificados do grupo." });
  }

  const takenSeats = await Registration.countDocuments({
    eventId: event.id,
    activitySlug: area.slug,
    status: "confirmed",
    "details.period": period
  });
  if (Number(area.seats || 0) && takenSeats + members.length > Number(area.seats)) {
    return res.status(409).json({
      message: `Esta área tem ${Math.max(Number(area.seats || 0) - takenSeats, 0)} vaga(s) disponível(is). Reduza o grupo ou escolha outra área.`
    });
  }

  const memberEmails = [...new Set(members.map((member) => member.email).filter(Boolean))];
  const existingUsers = memberEmails.length
    ? await User.find({ email: { $in: memberEmails } }).select("email").lean()
    : [];
  const usersByEmail = new Map(existingUsers.map((user) => [user.email, user]));
  const existingUserIds = existingUsers.map((user) => user._id);
  const existingRegistrations = existingUserIds.length
    ? await Registration.find({
        user: { $in: existingUserIds },
        eventId: event.id,
        activitySlug: { $ne: "main" },
        status: "confirmed"
      })
        .select("user activitySlug details")
        .lean()
    : [];
  const registrationsByUser = new Map();
  for (const registration of existingRegistrations) {
    const userId = registration.user?.toString?.() || String(registration.user || "");
    if (!registrationsByUser.has(userId)) registrationsByUser.set(userId, []);
    registrationsByUser.get(userId).push(registration);
  }

  for (const member of members) {
    if (!member.email) continue;
    const user = usersByEmail.get(member.email);
    if (!user) continue;
    const userRegistrations = registrationsByUser.get(user._id?.toString?.() || String(user._id)) || [];
    const scheduleConflict = findAreaScheduleConflict({ area, period, registrations: userRegistrations, areas });
    if (scheduleConflict) {
      return res.status(409).json({ message: `${member.name}: ${scheduleConflictMessage(scheduleConflict)}` });
    }
  }

  const checkedAt = new Date();
  const group = {
    id: groupIdForEvent(event),
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
    createdBy: req.user._id,
    createdAt: checkedAt
  };
  const created = [];

  for (const [index, member] of members.entries()) {
    const participant = groupParticipant(member, group, index);
    let user = usersByEmail.get(participant.email);
    if (!user) {
      user = await User.create({
        name: participant.name,
        socialName: participant.socialName,
        email: participant.email,
        phone: participant.phone || responsiblePhone,
        passwordHash: await bcrypt.hash(crypto.randomBytes(18).toString("hex"), 12),
        role: "participant",
        emailVerified: true,
        acceptedTermsAt: checkedAt
      });
      usersByEmail.set(participant.email, user);
    }

    await Registration.findOneAndUpdate(
      { user: user._id, eventId: event.id, activitySlug: "main" },
      {
        $setOnInsert: {
          ticketCode: createTicketCodeForEvent(event)
        },
        $set: {
          activityTitle: "Credenciamento geral",
          participant,
          group,
          acceptedTermsAt: checkedAt,
          status: "confirmed",
          checkedInAt: checkedAt,
          checkedInBy: req.user._id
        },
        $push: {
          changeHistory: historyEntry("group.id", "", group.id, req.user._id, "Cadastro presencial em grupo")
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const areaRegistration = await Registration.findOneAndUpdate(
      { user: user._id, eventId: event.id, activitySlug: area.slug },
      {
        $setOnInsert: {
          ticketCode: createTicketCodeForEvent(event)
        },
        $set: {
          activityTitle: area.title,
          participant,
          group,
          details: { period },
          acceptedTermsAt: checkedAt,
          status: "confirmed",
          checkedInAt: checkedAt,
          checkedInBy: req.user._id
        },
        $push: {
          changeHistory: historyEntry("group.id", "", group.id, req.user._id, "Cadastro presencial em grupo")
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    created.push(serializeRegistration(areaRegistration.toJSON(), revealSensitive));
  }

  res.status(201).json({
    group: protectGroup(group, revealSensitive),
    registrations: created,
    registration: created[0],
    message: `${created.length} participante(s) cadastrados e credenciados para ${institution} · ${course}.`
  });
}));

router.patch("/registrations/:id", asyncHandler(async (req, res) => {
  const registration = await Registration.findById(req.params.id);
  if (!registration || registration.status !== "confirmed") {
    return res.status(404).json({ message: "Inscrição não encontrada." });
  }

  const reason = cleanText(req.body.reason, 240);
  const { event } = await getPublicSiteContent();
  const participantPatch = req.body.participant || {};
  const editableFields = ["name", "socialName", "email", "cpf", "phone", "teacherCardCode", "role", "institution", "course", "shift", "city", "accessibility"];
  const entries = [];
  const finalEmail = "email" in participantPatch ? cleanText(participantPatch.email, 160) : registration.participant.email;
  const finalCpf = "cpf" in participantPatch ? cleanText(participantPatch.cpf, 20) : registration.participant.cpf;
  const finalPhone = "phone" in participantPatch ? cleanText(participantPatch.phone, 40) : registration.participant.phone;

  if (!finalEmail && !finalCpf && !finalPhone) {
    return res.status(400).json({ message: "Informe e-mail, CPF ou telefone antes de salvar." });
  }
  const finalTeacherCardCode = cleanTeacherCardCode(
    "teacherCardCode" in participantPatch
      ? participantPatch.teacherCardCode
      : registration.participant.teacherCardCode
  );
  if (cleanText(participantPatch.role, 40) === "Professor(a)" && !finalTeacherCardCode) {
    return res.status(400).json({ message: "Para liberar Professor(a), informe e confira o código da CNDB no site oficial do MEC." });
  }

  const submittedInstitution = cleanText(participantPatch.institution, 160);
  const existingInstitution = cleanText(registration.participant.institution, 160);
  const institutionChanged = "institution" in participantPatch && submittedInstitution !== existingInstitution;
  const selectedPlaceId = cleanText(participantPatch.institutionPlaceId, 220);
  let verifiedInstitution = null;
  if (institutionChanged || selectedPlaceId) {
    try {
      verifiedInstitution = await institutionFields(participantPatch);
      participantPatch.institution = verifiedInstitution.institution;
      participantPatch.city = verifiedInstitution.institutionCity || participantPatch.city;
    } catch (error) {
      if (sendInstitutionError(res, error)) return;
      throw error;
    }
  }

  for (const field of editableFields) {
    if (!(field in participantPatch)) continue;
    const nextValue = field === "teacherCardCode"
      ? cleanTeacherCardCode(participantPatch[field])
      : cleanText(participantPatch[field], field === "accessibility" ? 300 : 160);
    const previousValue = registration.participant[field] || "";
    if (String(previousValue) === nextValue) continue;
    registration.participant[field] = nextValue;
    entries.push(historyEntry(`participant.${field}`, previousValue, nextValue, req.user._id, reason));
  }

  if (finalTeacherCardCode && cleanText(participantPatch.role || registration.participant.role, 40) === "Professor(a)") {
    const previousStatus = registration.participant.teacherValidationStatus || "not-requested";
    registration.participant.teacherCardCode = finalTeacherCardCode;
    registration.participant.teacherValidationStatus = "approved";
    registration.participant.teacherValidationRequestedAt ||= new Date();
    registration.participant.teacherValidationReviewedAt = new Date();
    if (previousStatus !== "approved") {
      entries.push(historyEntry("participant.teacherValidationStatus", previousStatus, "approved", req.user._id, reason));
    }
  }

  if (verifiedInstitution) {
    const previousPlaceId = registration.participant.institutionPlaceId || "";
    registration.participant.institutionPlaceId = verifiedInstitution.institutionPlaceId;
    registration.participant.institutionAddress = verifiedInstitution.institutionAddress;
    registration.participant.institutionGoogleMapsUri = verifiedInstitution.institutionGoogleMapsUri;
    registration.participant.institutionVerifiedAt = verifiedInstitution.institutionVerifiedAt;
    if (previousPlaceId !== verifiedInstitution.institutionPlaceId) {
      entries.push(historyEntry("participant.institutionPlaceId", previousPlaceId, verifiedInstitution.institutionPlaceId, req.user._id, reason));
    }
  }

  const nextActivitySlug = cleanText(req.body.activitySlug, 80);
  const requestedPeriod = cleanText(req.body.period, 40);
  if (nextActivitySlug && nextActivitySlug !== registration.activitySlug) {
    if (registration.activitySlug === "main") {
      const area = await findContentArea(nextActivitySlug);
      if (!area) {
        return res.status(404).json({ message: "Área de destino não encontrada." });
      }
      const period = selectedAreaPeriod(area, requestedPeriod);
      if (!period) {
        return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });
      }
      const scheduleConflict = await mongoUserScheduleConflict(registration.user, registration.eventId, area, period);
      if (scheduleConflict) {
        return res.status(409).json({ message: scheduleConflictMessage(scheduleConflict) });
      }

      const duplicate = await Registration.exists({
        user: registration.user,
        eventId: registration.eventId,
        activitySlug: nextActivitySlug,
        status: "confirmed"
      });
      if (duplicate) {
        return res.status(409).json({ message: "O participante já possui inscrição nesta área." });
      }

      const takenSeats = await Registration.countDocuments({
        eventId: registration.eventId,
        activitySlug: nextActivitySlug,
        status: "confirmed",
        "details.period": period
      });
      if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
        return res.status(409).json({ message: "Esta área está lotada. Não é possível inscrever o participante." });
      }

      entries.push(historyEntry("activitySlug", "main", nextActivitySlug, req.user._id, reason));
      entries.push(historyEntry("activityTitle", "Credenciamento geral", area.title, req.user._id, reason));
      registration.changeHistory.push(...entries);
      await registration.save();

      const participant = registration.participant?.toObject?.() || registration.participant;
      const areaRegistration = await Registration.create({
        user: registration.user,
        eventId: registration.eventId,
        ticketCode: createTicketCodeForEvent(event),
        activitySlug: nextActivitySlug,
        activityTitle: area.title,
        participant,
        details: { period },
        acceptedTermsAt: registration.acceptedTermsAt || new Date(),
        status: "confirmed",
        changeHistory: [
          historyEntry("activitySlug", "main", nextActivitySlug, req.user._id, reason),
          historyEntry("activityTitle", "Credenciamento geral", area.title, req.user._id, reason)
        ]
      });

      return res.json({
        registration: serializeRegistration(areaRegistration.toJSON(), hasSensitiveAccess(req)),
        message: "Inscrição de área criada e registrada no histórico."
      });
    }

    const area = await findContentArea(nextActivitySlug);
    if (!area) {
      return res.status(404).json({ message: "Área de destino não encontrada." });
    }
    const period = selectedAreaPeriod(area, requestedPeriod);
    if (!period) {
      return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });
    }
    const scheduleConflict = await mongoUserScheduleConflict(registration.user, registration.eventId, area, period);
    if (scheduleConflict) {
      return res.status(409).json({ message: scheduleConflictMessage(scheduleConflict) });
    }

    const duplicate = await Registration.exists({
      _id: { $ne: registration._id },
      user: registration.user,
      eventId: registration.eventId,
      activitySlug: nextActivitySlug,
      status: "confirmed"
    });
    if (duplicate) {
      return res.status(409).json({ message: "O participante já possui inscrição nesta área." });
    }
    const takenSeats = await Registration.countDocuments({
      _id: { $ne: registration._id },
      eventId: registration.eventId,
      activitySlug: nextActivitySlug,
      status: "confirmed",
      "details.period": period
    });
    if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
      return res.status(409).json({ message: "Esta área está lotada. Não é possível transferir o participante." });
    }

    entries.push(historyEntry("activitySlug", registration.activitySlug, nextActivitySlug, req.user._id, reason));
    entries.push(historyEntry("activityTitle", registration.activityTitle, area.title, req.user._id, reason));
    registration.activitySlug = nextActivitySlug;
    registration.activityTitle = area.title;
    registration.details = { period };
  } else if (registration.activitySlug !== "main" && requestedPeriod && requestedPeriod !== registrationPeriod(registration)) {
    const area = await findContentArea(registration.activitySlug);
    const period = selectedAreaPeriod(area, requestedPeriod);
    if (!area || !period) {
      return res.status(400).json({ message: "Escolha o turno da atividade: manhã ou tarde." });
    }
    const scheduleConflict = await mongoUserScheduleConflict(registration.user, registration.eventId, area, period);
    if (scheduleConflict) {
      return res.status(409).json({ message: scheduleConflictMessage(scheduleConflict) });
    }
    const takenSeats = await Registration.countDocuments({
      _id: { $ne: registration._id },
      eventId: registration.eventId,
      activitySlug: registration.activitySlug,
      status: "confirmed",
      "details.period": period
    });
    if (Number(area.seats || 0) && takenSeats >= Number(area.seats)) {
      return res.status(409).json({ message: `As ${area.seats} vagas da ${period.toLowerCase()} foram preenchidas. Escolha o outro turno.` });
    }
    entries.push(historyEntry("details.period", registrationPeriod(registration), period, req.user._id, reason));
    registration.details = { period };
  }

  registration.changeHistory.push(...entries);
  await registration.save();

  res.json({
    registration: serializeRegistration(registration.toJSON(), hasSensitiveAccess(req)),
    message: entries.length ? "Inscrição atualizada e registrada no histórico." : "Nenhuma alteração realizada."
  });
}));

export default router;

