// Rotas da administracao.
// Aqui a equipe muda conteudo do site sem precisar abrir codigo.
// Regra de ouro: limpa tudo antes de salvar, porque formulario aceita cada coisa...
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { hasSensitiveAccess, requireAdmin, requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { Registration } from "../models/Registration.js";
import { User } from "../models/User.js";
import { saveUploadedAdminMedia } from "../services/adminMedia.js";
import { googleSheetsConfigured, syncGoogleSheets } from "../services/googleSheetsSync.js";
import { buildEmailPreviews } from "../services/mailer.js";
import { backupMongoDatabase } from "../services/mongoBackup.js";
import { getSiteContent, saveSiteContent } from "../services/siteContent.js";
import { protectRegistration, protectValue } from "../services/sensitiveData.js";

const router = Router();
const OFFICIAL_LOGO_URL = "/assets/simitec-logo-oficial-2026-transparente.png";
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 160,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas ações administrativas. Aguarde um pouco." }
});

function cleanText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanNumber(value, fallback = 0, min = 0, max = 5000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function cleanBool(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (value === "false") return false;
  if (value === "true") return true;
  return fallback;
}

function cleanUrl(value, maxLength = 360) {
  const input = cleanText(value, maxLength);
  if (!input) return "";
  if (/^\/(?:assets|uploads)\//.test(input)) return input;

  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (_error) {
    return "";
  }
}

function cleanTime(value, fallback = "") {
  const input = cleanText(value, 5);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input) ? input : fallback;
}

function cleanSessionSlots(slots = {}) {
  return {
    Manhã: {
      start: cleanTime(slots?.Manhã?.start, "08:00"),
      end: cleanTime(slots?.Manhã?.end, "09:00")
    },
    Tarde: {
      start: cleanTime(slots?.Tarde?.start, "13:30"),
      end: cleanTime(slots?.Tarde?.end, "14:30")
    }
  };
}

function cleanColor(value, fallback = "#00e5ff") {
  const input = cleanText(value, 24);
  return /^#[0-9a-f]{6}$/i.test(input) ? input : fallback;
}

function cleanYear(value, fallback = "2026") {
  const match = cleanText(value, 40).match(/\b(20\d{2})\b/);
  return match ? match[1] : fallback;
}

function slugify(value, fallback = "atividade") {
  // Gera um apelido seguro para URL/codigo. Sem acento, sem espaco, sem susto.
  const slug = cleanText(value, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function cleanList(values, maxItems, maxLength) {
  return (Array.isArray(values) ? values : [])
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanFormFields(fields) {
  return (Array.isArray(fields) ? fields : [])
    .map((field, index) => {
      const type = ["text", "textarea", "select"].includes(field?.type) ? field.type : "text";
      return {
        name: slugify(field?.name || field?.label || `campo-${index + 1}`, `campo-${index + 1}`),
        label: cleanText(field?.label, 80) || `Campo ${index + 1}`,
        type,
        required: cleanBool(field?.required, false),
        options: type === "select" ? cleanList(field?.options, 20, 80) : undefined
      };
    })
    .slice(0, 12);
}

const TEAM_MODULE_KEYS = [
  "dashboard",
  "inscriptions",
  "credentialing",
  "publicSite",
  "teamSite",
  "reports",
  "staff",
  "roles",
  "settings"
];

const STAFF_ROLE_KEYS = ["checkin", "admin", "super_admin"];
const PERMISSION_KEYS = [
  "view_dashboard",
  "search",
  "create_inscription",
  "edit_inscription",
  "delete_inscription",
  "credential",
  "undo_credential",
  "view_reports",
  "export_reports",
  "manage_staff",
  "manage_roles",
  "edit_public_site",
  "edit_team_site",
  "publish",
  "access_settings",
  "access_security",
  "view_history"
];

function cleanRoleSettings(roleSettings = {}, current = {}) {
  return Object.fromEntries(
    STAFF_ROLE_KEYS.map((roleKey) => {
      const incoming = roleSettings?.[roleKey] || {};
      const previous = current?.[roleKey] || {};
      const incomingPermissions = Array.isArray(incoming.permissions)
        ? cleanList(incoming.permissions, PERMISSION_KEYS.length, 40).filter((permission) => PERMISSION_KEYS.includes(permission))
        : null;
      return [
        roleKey,
        {
          ...(previous || {}),
          name: cleanText(incoming.name, 80) || previous.name || "",
          description: cleanText(incoming.description, 220) || previous.description || "",
          level: cleanNumber(incoming.level, previous.level || 5, 1, 10),
          color: cleanColor(incoming.color, previous.color || "#3B82F6"),
          status: incoming.status === "inactive" ? "inactive" : "active",
          permissions: incomingPermissions && incomingPermissions.length
            ? incomingPermissions
            : Array.isArray(previous.permissions)
              ? previous.permissions.filter((permission) => PERMISSION_KEYS.includes(permission))
              : []
        }
      ];
    })
  );
}

function cleanAdminSettings(settings = {}, current = {}) {
  const security = settings.security || {};
  const notifications = settings.notifications || {};
  const backup = settings.backup || {};
  const integrations = settings.integrations || {};
  return {
    ...(current || {}),
    interfaceDensity: ["compacta", "normal", "espacada"].includes(settings.interfaceDensity)
      ? settings.interfaceDensity
      : current.interfaceDensity || "normal",
    security: {
      ...(current.security || {}),
      biometrics: cleanBool(security.biometrics, current.security?.biometrics ?? false),
      facialRecognition: cleanBool(security.facialRecognition, current.security?.facialRecognition ?? false),
      autoLock: cleanBool(security.autoLock, current.security?.autoLock ?? true),
      autoLockMinutes: cleanNumber(security.autoLockMinutes, current.security?.autoLockMinutes ?? 30, 5, 240),
      blockScreenshots: cleanBool(security.blockScreenshots, current.security?.blockScreenshots ?? true),
      maskSensitiveData: cleanBool(security.maskSensitiveData, current.security?.maskSensitiveData ?? true),
      requireConfirmation: cleanBool(security.requireConfirmation, current.security?.requireConfirmation ?? true),
      sessionControl: cleanBool(security.sessionControl, current.security?.sessionControl ?? true),
      maxDevices: cleanNumber(security.maxDevices, current.security?.maxDevices ?? 3, 1, 20)
    },
    notifications: {
      ...(current.notifications || {}),
      onSave: cleanBool(notifications.onSave, current.notifications?.onSave ?? true),
      onError: cleanBool(notifications.onError, current.notifications?.onError ?? true),
      onCredential: cleanBool(notifications.onCredential, current.notifications?.onCredential ?? true),
      onRoleChange: cleanBool(notifications.onRoleChange, current.notifications?.onRoleChange ?? true),
      onStaffAdd: cleanBool(notifications.onStaffAdd, current.notifications?.onStaffAdd ?? true),
      onPublish: cleanBool(notifications.onPublish, current.notifications?.onPublish ?? true),
      onLogin: cleanBool(notifications.onLogin, current.notifications?.onLogin ?? true),
      autoDismiss: cleanBool(notifications.autoDismiss, current.notifications?.autoDismiss ?? true),
      autoDismissSeconds: cleanNumber(notifications.autoDismissSeconds, current.notifications?.autoDismissSeconds ?? 5, 3, 30)
    },
    backup: {
      ...(current.backup || {}),
      frequency: ["daily", "12h", "6h", "disabled"].includes(backup.frequency)
        ? backup.frequency
        : current.backup?.frequency || "daily",
      lastManualBackupAt: cleanText(backup.lastManualBackupAt, 80) || current.backup?.lastManualBackupAt || ""
    },
    integrations: {
      ...(current.integrations || {}),
      googleLogin: cleanBool(integrations.googleLogin, current.integrations?.googleLogin ?? true),
      googleClientId: cleanText(integrations.googleClientId, 220) || current.integrations?.googleClientId || "",
      emailProvider: ["smtp", "disabled"].includes(integrations.emailProvider) ? integrations.emailProvider : current.integrations?.emailProvider || "smtp",
      smtpHost: cleanText(integrations.smtpHost, 160) || current.integrations?.smtpHost || "",
      smtpPort: cleanNumber(integrations.smtpPort, current.integrations?.smtpPort ?? 587, 1, 65535),
      smtpUser: cleanText(integrations.smtpUser, 180) || current.integrations?.smtpUser || "",
      smtpPassConfigured: cleanBool(integrations.smtpPassConfigured, current.integrations?.smtpPassConfigured ?? Boolean(process.env.SMTP_PASS)),
      analyticsEnabled: cleanBool(integrations.analyticsEnabled, current.integrations?.analyticsEnabled ?? false),
      analyticsId: cleanText(integrations.analyticsId, 80) || current.integrations?.analyticsId || "",
      googleSheetsConfigured: googleSheetsConfigured()
    }
  };
}

function cleanTeamModules(modules = {}, current = {}) {
  return Object.fromEntries(
    TEAM_MODULE_KEYS.map((key) => [key, cleanBool(modules?.[key], current?.[key] ?? true)])
  );
}

function cleanTeamSite(teamSite = {}, current = {}) {
  const currentModules = current.modules || {};
  return {
    ...(current || {}),
    loginTitle: cleanText(teamSite.loginTitle, 120) || current.loginTitle || "Acesso da Equipe SIMITEC",
    loginSubtitle:
      cleanText(teamSite.loginSubtitle, 180) ||
      current.loginSubtitle ||
      "Painel de credenciamento, inscrições e administração",
    panelName: cleanText(teamSite.panelName, 120) || current.panelName || "Painel Administrativo",
    welcomeText: cleanText(teamSite.welcomeText, 500) || current.welcomeText || "",
    internalNotice: cleanText(teamSite.internalNotice, 700) || current.internalNotice || "",
    operatorMessage: cleanText(teamSite.operatorMessage, 500) || current.operatorMessage || "",
    supportEmail: cleanText(teamSite.supportEmail, 160) || current.supportEmail || "",
    supportPhone: cleanText(teamSite.supportPhone, 80) || current.supportPhone || "",
    helpText: cleanText(teamSite.helpText, 700) || current.helpText || "",
    successMessage: cleanText(teamSite.successMessage, 220) || current.successMessage || "Alteração salva com sucesso.",
    errorMessage: cleanText(teamSite.errorMessage, 220) || current.errorMessage || "Não foi possível concluir a ação.",
    primaryColor: cleanColor(teamSite.primaryColor, current.primaryColor || "#1BB7F0"),
    secondaryColor: cleanColor(teamSite.secondaryColor, current.secondaryColor || "#20D6A2"),
    accentColor: cleanColor(teamSite.accentColor, current.accentColor || "#0B8FD1"),
    compactMode: cleanBool(teamSite.compactMode, current.compactMode ?? false),
    googleLoginEnabled: cleanBool(teamSite.googleLoginEnabled, current.googleLoginEnabled ?? true),
    passwordRecoveryEnabled: cleanBool(teamSite.passwordRecoveryEnabled, current.passwordRecoveryEnabled ?? true),
    showInternalNotices: cleanBool(teamSite.showInternalNotices, current.showInternalNotices ?? true),
    showHelpTexts: cleanBool(teamSite.showHelpTexts, current.showHelpTexts ?? true),
    modules: cleanTeamModules(teamSite.modules, currentModules),
    moduleOrder: cleanList(teamSite.moduleOrder, TEAM_MODULE_KEYS.length, 40)
      .filter((key) => TEAM_MODULE_KEYS.includes(key))
      .concat(TEAM_MODULE_KEYS.filter((key) => !cleanList(teamSite.moduleOrder, TEAM_MODULE_KEYS.length, 40).includes(key)))
  };
}

function cleanEvent(event = {}, current = {}) {
  const currentYear = cleanYear(current.edition || current.year || "", "2026");
  const editedYear = cleanYear(event.year || event.edition || current.edition || current.year, currentYear);
  return {
    ...current,
    name: cleanText(event.name, 80) || current.name || "SIMITEC",
    fullName:
      cleanText(event.fullName, 180) ||
      current.fullName ||
      "Semana de Inovação e Metodologias Integradas a Tecnologias",
    year: editedYear,
    edition: `SIMITEC ${editedYear}`,
    dateLabel: cleanText(event.dateLabel, 120) || current.dateLabel || "Inscrições abertas",
    startAt: cleanText(event.startAt, 80) || null,
    dateEnd: cleanText(event.dateEnd, 80) || "",
    timeLabel: cleanText(event.timeLabel, 120) || current.timeLabel || "",
    location: cleanText(event.location, 220) || current.location || "",
    maxParticipants: cleanNumber(event.maxParticipants, current.maxParticipants || 500, 0, 20000),
    contactEmail: cleanText(event.contactEmail, 160) || current.contactEmail || "",
    contactPhone: cleanText(event.contactPhone, 80) || current.contactPhone || "",
    timezone: cleanText(event.timezone, 80) || current.timezone || "America/Fortaleza",
    language: cleanText(event.language, 20) || current.language || "pt-BR",
    summary: cleanText(event.summary, 900) || current.summary || "",
    researchNote: cleanText(event.researchNote, 900) || current.researchNote || "",
    logoUrl: cleanUrl(event.logoUrl) || current.logoUrl || OFFICIAL_LOGO_URL,
    bannerUrl: cleanUrl(event.bannerUrl) || current.bannerUrl || "",
    backgroundUrl: cleanUrl(event.backgroundUrl) || current.backgroundUrl || "",
    notice: cleanText(event.notice, 700) || "",
    siteSettings: {
      ...(current.siteSettings || {}),
      primaryColor: cleanColor(event.siteSettings?.primaryColor, current.siteSettings?.primaryColor || "#1BB7F0"),
      secondaryColor: cleanColor(event.siteSettings?.secondaryColor, current.siteSettings?.secondaryColor || "#20D6A2"),
      backgroundColor: cleanColor(event.siteSettings?.backgroundColor, current.siteSettings?.backgroundColor || "#071A2B"),
      font: cleanText(event.siteSettings?.font, 80) || current.siteSettings?.font || "Inter",
      buttonStyle: ["rounded", "square", "pill"].includes(event.siteSettings?.buttonStyle) ? event.siteSettings.buttonStyle : current.siteSettings?.buttonStyle || "rounded",
      darkMode: cleanBool(event.siteSettings?.darkMode, current.siteSettings?.darkMode ?? true),
      inscriptionOpen: cleanBool(event.siteSettings?.inscriptionOpen, current.siteSettings?.inscriptionOpen ?? true),
      loginEnabled: cleanBool(event.siteSettings?.loginEnabled, current.siteSettings?.loginEnabled ?? true),
      createAccountEnabled: cleanBool(event.siteSettings?.createAccountEnabled, current.siteSettings?.createAccountEnabled ?? true),
      passwordRecoveryEnabled: cleanBool(event.siteSettings?.passwordRecoveryEnabled, current.siteSettings?.passwordRecoveryEnabled ?? true)
    },
    footer: {
      ...(current.footer || {}),
      organizerName: cleanText(event.footer?.organizerName, 120) || current.footer?.organizerName || "ECIT ENGENHEIRA MARCIA GUEDES ALCOFORADO DE CARVALHO",
      email: cleanText(event.footer?.email, 160) || current.footer?.email || "simitec.suporte.oficial@gmail.com",
      instagram: cleanText(event.footer?.instagram, 120) || current.footer?.instagram || "@simitec",
      whatsapp: cleanText(event.footer?.whatsapp, 80) || current.footer?.whatsapp || "",
      footerText: cleanText(event.footer?.footerText, 220) || current.footer?.footerText || `© ${editedYear} SIMITEC · Todos os direitos reservados`,
      termsEnabled: cleanBool(event.footer?.termsEnabled, current.footer?.termsEnabled ?? true),
      privacyEnabled: cleanBool(event.footer?.privacyEnabled, current.footer?.privacyEnabled ?? true)
    },
    teamSite: cleanTeamSite(event.teamSite, current.teamSite),
    roleSettings: cleanRoleSettings(event.roleSettings, current.roleSettings),
    adminSettings: cleanAdminSettings(event.adminSettings, current.adminSettings),
    highlights: cleanList(event.highlights, 12, 180),
    documents: (Array.isArray(event.documents) ? event.documents : [])
      .map((doc) => ({
        title: cleanText(doc?.title, 120),
        label: cleanText(doc?.label, 160),
        url: cleanUrl(doc?.url)
      }))
      .filter((doc) => doc.title && doc.url)
      .slice(0, 10),
    sources: (Array.isArray(event.sources) ? event.sources : [])
      .map((source) => ({
        title: cleanText(source?.title, 120),
        url: cleanUrl(source?.url)
      }))
      .filter((source) => source.title && source.url)
      .slice(0, 10)
  };
}

function cleanAreas(areas) {
  return (Array.isArray(areas) ? areas : [])
    .map((area, index) => {
      const title = cleanText(area?.title, 120) || `Atividade ${index + 1}`;
      return {
        slug: slugify(area?.slug || title, `atividade-${index + 1}`),
        title,
        shortTitle: cleanText(area?.shortTitle, 60) || title,
        seats: cleanNumber(area?.seats, 30, 1, 5000),
        accent: cleanColor(area?.accent),
        tag: cleanText(area?.tag, 80) || "Atividade",
        schedule: cleanText(area?.schedule, 120),
        location: cleanText(area?.location, 140),
        imageUrl: cleanUrl(area?.imageUrl),
        customImageUrl: cleanUrl(area?.customImageUrl),
        description: cleanText(area?.description, 800),
        requirements: cleanList(area?.requirements, 10, 180),
        rulesFileUrl: cleanUrl(area?.rulesFileUrl),
        rulesFileLabel: cleanText(area?.rulesFileLabel, 100),
        sessionOptions: cleanList(area?.sessionOptions, 4, 40).length
          ? cleanList(area?.sessionOptions, 4, 40)
          : ["Manhã", "Tarde"],
        sessionSlots: cleanSessionSlots(area?.sessionSlots),
        applicationMode: area?.applicationMode === "external-form" ? "external-form" : "standard",
        externalFormLabel: cleanText(area?.externalFormLabel, 80),
        externalFormUrl: cleanUrl(area?.externalFormUrl),
        externalFormMessage: cleanText(area?.externalFormMessage, 600),
        formFields: cleanFormFields(area?.formFields),
        visible: cleanBool(area?.visible, true)
      };
    })
    .slice(0, 30);
}

function cleanSchedule(schedule) {
  return (Array.isArray(schedule) ? schedule : [])
    .map((day, index) => ({
      day: cleanText(day?.day, 40) || `Dia ${index + 1}`,
      title: cleanText(day?.title, 120) || "Programação",
      status: cleanText(day?.status, 80),
      items: (Array.isArray(day?.items) ? day.items : [])
        .map((item) => ({
          time: cleanText(item?.time, 30),
          title: cleanText(item?.title, 120),
          type: cleanText(item?.type, 60),
          location: cleanText(item?.location, 140),
          description: cleanText(item?.description, 500)
        }))
        .filter((item) => item.title)
        .slice(0, 20)
    }))
    .filter((day) => day.items.length)
    .slice(0, 14);
}

function cleanFaq(faq) {
  return (Array.isArray(faq) ? faq : [])
    .map((group) => ({
      category: cleanText(group?.category, 80) || "Perguntas frequentes",
      items: (Array.isArray(group?.items) ? group.items : [])
        .map((item) => ({
          question: cleanText(item?.question, 180),
          answer: cleanText(item?.answer, 900)
        }))
        .filter((item) => item.question && item.answer)
        .slice(0, 20)
    }))
    .filter((group) => group.items.length)
    .slice(0, 10);
}

function cleanPeople(people) {
  return (Array.isArray(people) ? people : [])
    .map((person, index) => {
      const activityTitle = cleanText(person?.activityTitle, 140);
      const name = cleanText(person?.name, 120);
      return {
        slug: slugify(person?.slug || activityTitle || name, `atividade-${index + 1}`),
        category: cleanText(person?.category, 60),
        activityTitle,
        activitySummary: cleanText(person?.activitySummary, 500),
        details: cleanText(person?.details, 1200),
        schedule: cleanText(person?.schedule, 100),
        location: cleanText(person?.location, 140),
        name,
        role: cleanText(person?.role, 100),
        bio: cleanText(person?.bio, 700),
        photoUrl: cleanUrl(person?.photoUrl),
        sourceStatus: cleanText(person?.sourceStatus, 80),
        visible: cleanBool(person?.visible, true)
      };
    })
    .filter((person) => person.name)
    .slice(0, 60);
}

function cleanGallery(gallery) {
  return (Array.isArray(gallery) ? gallery : [])
    .map((image, index) => {
      const year = cleanYear(image?.year || image?.edition, ["2026", "2025", "2024", "2023"][index] || "2026");

      return {
        year,
        edition: cleanText(image?.edition, 80) || `SIMITEC ${year}`,
        src: cleanUrl(image?.src),
        customSrc: cleanUrl(image?.customSrc),
        alt: cleanText(image?.alt, 160),
        caption: cleanText(image?.caption, 180),
        visible: cleanBool(image?.visible, true)
      };
    })
    .filter((image) => image.src || image.customSrc || image.alt || image.caption)
    .slice(0, 80);
}

function cleanTicket(ticket = {}, current = {}) {
  return {
    headline: cleanText(ticket.headline, 120) || current.headline || "Credencial SIMITEC",
    instructions:
      cleanText(ticket.instructions, 300) ||
      current.instructions ||
      "Apresente o QR Code no credenciamento da atividade.",
    footer:
      cleanText(ticket.footer, 220) ||
      current.footer ||
      "Documento pessoal e intransferível para controle de presença."
  };
}

function syncEditionYearInGallery(gallery = [], previousYear = "", nextYear = "") {
  if (!previousYear || !nextYear || previousYear === nextYear) return gallery;
  return gallery.map((image) => {
    const year = cleanYear(image.year || image.edition || image.caption, "");
    if (year && year !== previousYear) return image;
    const replaceYear = (value = "") => cleanText(value, 220).replaceAll(previousYear, nextYear);
    return {
      ...image,
      year: nextYear,
      edition: replaceYear(image.edition || `SIMITEC ${previousYear}`) || `SIMITEC ${nextYear}`,
      caption: replaceYear(image.caption || "")
    };
  });
}

router.use(requireAuth);
router.use(requireAdmin);
router.use(adminLimiter);

router.get("/google-sheets/status", (_req, res) => {
  res.json({
    configured: googleSheetsConfigured(),
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "",
  });
});

router.post("/google-sheets/sync", asyncHandler(async (_req, res) => {
  const result = await syncGoogleSheets();
  res.json({
    ...result,
    message: `Google Sheets atualizado com ${result.registrations} inscrição(ões).`,
  });
}));

router.post("/backup", requireSuperAdmin, asyncHandler(async (_req, res) => {
  const filePath = await backupMongoDatabase();
  if (!filePath) {
    return res.status(503).json({ message: "Backup disponível apenas quando o MongoDB está conectado." });
  }
  res.json({
    filePath,
    createdAt: new Date().toISOString(),
    message: "Backup gerado com sucesso."
  });
}));

router.get("/content", asyncHandler(async (_req, res) => {
  res.json({ content: await getSiteContent() });
}));

router.get("/email-previews", requireSuperAdmin, (_req, res) => {
  res.json({ previews: buildEmailPreviews() });
});

router.put("/content", requireSuperAdmin, asyncHandler(async (req, res) => {
  const current = await getSiteContent();
  const previousYear = cleanYear(current.event?.edition || current.event?.year || "", "2026");
  const patch = {
    event: cleanEvent(req.body.event, current.event),
    areas: cleanAreas(req.body.areas),
    schedule: cleanSchedule(req.body.schedule),
    faq: cleanFaq(req.body.faq),
    people: cleanPeople(req.body.people),
    gallery: cleanGallery(req.body.gallery),
    ticket: cleanTicket(req.body.ticket, current.ticket)
  };
  const nextYear = cleanYear(patch.event?.edition || patch.event?.year || "", previousYear);
  patch.gallery = syncEditionYearInGallery(patch.gallery, previousYear, nextYear);

  const content = await saveSiteContent(patch, req.user._id);
  res.json({ content, message: "Conteúdo publicado no site." });
}));

router.post("/media", requireSuperAdmin, asyncHandler(async (req, res) => {
  const media = await saveUploadedAdminMedia(req.body);
  res.status(201).json({ media, message: "Arquivo enviado com segurança." });
}));

router.get("/stats", asyncHandler(async (_req, res) => {
  const [userStats, registrationStats, content] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: null,
          users: { $sum: 1 },
          verifiedUsers: { $sum: { $cond: ["$emailVerified", 1, 0] } }
        }
      }
    ]),
    Registration.aggregate([
      {
        $group: {
          _id: null,
          registrations: { $sum: 1 },
          confirmedRegistrations: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } }
        }
      }
    ]),
    getSiteContent()
  ]);

  const users = userStats[0] || {};
  const registrations = registrationStats[0] || {};
  res.json({
    stats: {
      users: users.users || 0,
      verifiedUsers: users.verifiedUsers || 0,
      registrations: registrations.registrations || 0,
      confirmedRegistrations: registrations.confirmedRegistrations || 0,
      activities: content.areas?.length || 0,
      gallery: content.gallery?.length || 0,
      speakers: content.people?.length || 0
    }
  });
}));

router.get("/registrations", asyncHandler(async (req, res) => {
  const registrations = await Registration.find()
    .select("-changeHistory")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const revealSensitive = hasSensitiveAccess(req);
  res.json({ registrations: registrations.map((item) => protectRegistration(item, revealSensitive)) });
}));

router.get("/users", requireSuperAdmin, asyncHandler(async (req, res) => {
  const search = cleanText(req.query.search, 120);
  const digits = search.replace(/\D/g, "");
  const userQuery = {};
  let registrationInfo = new Map();

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const registrationQuery = {
      $or: [
        { "participant.name": regex },
        { "participant.email": regex },
        { "participant.cpf": regex },
        { "participant.phone": regex },
        ...(digits ? [{ "participant.cpf": new RegExp(escapeRegex(digits), "i") }, { "participant.phone": new RegExp(escapeRegex(digits), "i") }] : [])
      ]
    };
    const matchedRegistrations = await Registration.find(registrationQuery)
      .select("user participant activityTitle createdAt")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const matchedUserIds = matchedRegistrations.map((item) => item.user).filter(Boolean);
    registrationInfo = new Map(matchedRegistrations.map((item) => [item.user?.toString?.(), item]));
    userQuery.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      ...(digits ? [{ phone: new RegExp(escapeRegex(digits), "i") }] : []),
      { _id: { $in: matchedUserIds } }
    ];
  }

  const users = await User.find(userQuery)
    .select("name email phone role emailVerified avatarUrl createdAt lastLoginAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  if (!search && users.length) {
    const latestRegistrations = await Registration.aggregate([
      { $match: { user: { $in: users.map((user) => user._id) } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          registration: { $first: "$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$registration" } },
      { $project: { user: 1, participant: 1, activityTitle: 1, createdAt: 1 } }
    ]);
    registrationInfo = new Map(latestRegistrations.map((item) => [item.user?.toString?.(), item]));
  }

  const revealSensitive = hasSensitiveAccess(req);
  res.json({
    users: users.map((user) => {
      const registration = registrationInfo.get(user._id.toString());
      return {
        ...user,
        email: protectValue(user.email, revealSensitive),
        phone: protectValue(user.phone || registration?.participant?.phone || "", revealSensitive),
        cpf: protectValue(registration?.participant?.cpf || "", revealSensitive),
        latestActivity: registration?.activityTitle || ""
      };
    })
  });
}));

router.patch("/users/:id/role", requireSuperAdmin, asyncHandler(async (req, res) => {
  const role = cleanText(req.body.role, 40);
  const allowedRoles = new Set(["participant", "checkin", "admin", "super_admin"]);

  if (!allowedRoles.has(role)) {
    return res.status(400).json({ message: "Cargo inválido." });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  if (user.role === "super_admin" && role !== "super_admin") {
    const superAdmins = await User.countDocuments({ role: "super_admin" });
    if (superAdmins <= 1) {
      return res.status(409).json({ message: "O cargo Geral é exclusivo e não pode ficar vazio." });
    }
  }

  user.role = role;
  await user.save();

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: protectValue(user.email, hasSensitiveAccess(req)),
      role: user.role,
      emailVerified: user.emailVerified
    },
    message: "Cargo atualizado."
  });
}));

router.delete("/users/:id", requireSuperAdmin, asyncHandler(async (req, res) => {
  if (req.user?._id?.toString?.() === req.params.id) {
    return res.status(409).json({ message: "Você não pode excluir a própria conta." });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  if (user.role === "super_admin") {
    const superAdmins = await User.countDocuments({ role: "super_admin" });
    if (superAdmins <= 1) {
      return res.status(409).json({ message: "Não é possível excluir o último Administrador Geral." });
    }
  }

  await User.deleteOne({ _id: user._id });
  res.json({ message: "Conta do funcionário excluída." });
}));

export default router;

