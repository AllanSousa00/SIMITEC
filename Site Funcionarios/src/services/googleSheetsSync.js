import mongoose from "mongoose";
import { google } from "googleapis";
import { Registration } from "../models/Registration.js";
import { User } from "../models/User.js";
import { readLocalStore } from "./localStore.js";
import { getPublicSiteContent } from "./siteContent.js";

const SHEET_HEADERS = {
  resumo: ["Métrica", "Valor"],
  participantes: ["Nome", "CPF", "E-mail", "Telefone", "Tipo", "Instituição", "Curso/Turma", "Turno de estudo", "Cidade", "UF"],
  inscricoes: ["Nome", "Instituição", "Atividade", "Período", "Status", "Código", "Data da inscrição"],
  credenciamentos: ["Nome", "Instituição", "Atividade", "Status", "Credenciado em", "Operador"],
  atividades: ["Atividade", "Slug", "Inscritos", "Credenciados", "Pendentes"],
  instituicoes: ["Instituição", "Cidade", "Inscritos", "Credenciados"],
};

function clean(value = "") {
  return String(value || "").trim();
}

function envPrivateKey() {
  return clean(process.env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");
}

export function googleSheetsConfigured() {
  return Boolean(
    clean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID) &&
    clean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    envPrivateKey()
  );
}

function assertGoogleSheetsConfig() {
  if (!googleSheetsConfigured()) {
    const error = new Error("Google Sheets ainda não está configurado no .env.");
    error.status = 400;
    throw error;
  }
}

function participantOf(registration = {}) {
  return registration.participant || {};
}

function detailsOf(registration = {}) {
  if (!registration.details) return {};
  if (registration.details instanceof Map) return Object.fromEntries(registration.details.entries());
  return registration.details;
}

function registrationRows(registrations = [], operatorById = new Map()) {
  return registrations.map((registration) => {
    const participant = participantOf(registration);
    const details = detailsOf(registration);
    const checkedInBy = clean(registration.checkedInBy?._id || registration.checkedInBy || "");
    return {
      participant,
      activity: clean(registration.activityTitle || registration.activitySlug || "Credenciamento geral"),
      period: clean(details.period || details.turno || ""),
      status: registration.status === "cancelled" ? "Cancelada" : "Confirmada",
      credentialStatus: registration.checkedInAt ? "Credenciado" : "Pendente",
      checkedInAt: registration.checkedInAt ? new Date(registration.checkedInAt).toLocaleString("pt-BR") : "",
      checkedInBy: operatorById.get(checkedInBy) || "",
      ticketCode: clean(registration.ticketCode),
      createdAt: registration.createdAt ? new Date(registration.createdAt).toLocaleString("pt-BR") : "",
      institution: clean(participant.institution || registration.group?.institution || "Não informada"),
      city: clean(participant.city || registration.group?.city || ""),
    };
  });
}

async function loadMongoRegistrations() {
  const registrations = await Registration.find({}).sort({ createdAt: -1 }).lean();
  const operatorIds = [...new Set(registrations.map(item => clean(item.checkedInBy)).filter(Boolean))];
  const operators = operatorIds.length ? await User.find({ _id: { $in: operatorIds } }).select("name").lean() : [];
  const operatorById = new Map(operators.map(user => [String(user._id), user.name]));
  return registrationRows(registrations, operatorById);
}

async function loadLocalRegistrations() {
  const store = await readLocalStore();
  const usersById = new Map(store.users.map(user => [String(user.id), user.name || user.email || ""]));
  return registrationRows(store.registrations, usersById);
}

function uniqueParticipantRows(rows = []) {
  const seen = new Set();
  const output = [];
  rows.forEach((item) => {
    const participant = item.participant;
    const key = clean(participant.email || participant.cpf || participant.phone || participant.name).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push([
      clean(participant.name),
      clean(participant.cpf),
      clean(participant.email),
      clean(participant.phone),
      clean(participant.role || "Estudante"),
      clean(participant.institution || item.institution),
      clean(participant.course),
      clean(participant.shift),
      clean(participant.city || item.city),
      clean(participant.state),
    ]);
  });
  return output;
}

function buildSheetPayload(rows = [], areas = []) {
  const confirmed = rows.filter(row => row.status === "Confirmada").length;
  const credentialed = rows.filter(row => row.credentialStatus === "Credenciado").length;
  const pending = rows.filter(row => row.credentialStatus !== "Credenciado").length;
  const institutions = new Map();
  const activities = new Map();

  rows.forEach((row) => {
    const institutionKey = row.institution || "Não informada";
    const institution = institutions.get(institutionKey) || { city: row.city, total: 0, credentialed: 0 };
    institution.total += 1;
    if (row.credentialStatus === "Credenciado") institution.credentialed += 1;
    institutions.set(institutionKey, institution);

    const activity = activities.get(row.activity) || { slug: "", total: 0, credentialed: 0 };
    activity.total += 1;
    if (row.credentialStatus === "Credenciado") activity.credentialed += 1;
    activities.set(row.activity, activity);
  });

  areas.forEach((area) => {
    if (!activities.has(area.title)) activities.set(area.title, { slug: area.slug, total: 0, credentialed: 0 });
    else activities.get(area.title).slug = area.slug;
  });

  return {
    Resumo: [
      SHEET_HEADERS.resumo,
      ["Atualizado em", new Date().toLocaleString("pt-BR")],
      ["Total de inscrições", rows.length],
      ["Inscrições confirmadas", confirmed],
      ["Credenciados", credentialed],
      ["Pendentes de credenciamento", pending],
      ["Instituições", institutions.size],
      ["Atividades", activities.size],
    ],
    Participantes: [
      SHEET_HEADERS.participantes,
      ...uniqueParticipantRows(rows),
    ],
    Inscricoes: [
      SHEET_HEADERS.inscricoes,
      ...rows.map(row => [
        clean(row.participant.name),
        row.institution,
        row.activity,
        row.period,
        row.status,
        row.ticketCode,
        row.createdAt,
      ]),
    ],
    Credenciamentos: [
      SHEET_HEADERS.credenciamentos,
      ...rows.map(row => [
        clean(row.participant.name),
        row.institution,
        row.activity,
        row.credentialStatus,
        row.checkedInAt,
        row.checkedInBy,
      ]),
    ],
    Atividades: [
      SHEET_HEADERS.atividades,
      ...[...activities.entries()].map(([name, item]) => [
        name,
        item.slug,
        item.total,
        item.credentialed,
        Math.max(item.total - item.credentialed, 0),
      ]),
    ],
    Instituicoes: [
      SHEET_HEADERS.instituicoes,
      ...[...institutions.entries()].map(([name, item]) => [
        name,
        item.city,
        item.total,
        item.credentialed,
      ]),
    ],
  };
}

async function sheetsClient() {
  assertGoogleSheetsConfig();
  const auth = new google.auth.JWT({
    email: clean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    key: envPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

export async function syncGoogleSheets() {
  const sheets = await sheetsClient();
  const spreadsheetId = clean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  const { areas } = await getPublicSiteContent();
  const rows = mongoose.connection.readyState === 1
    ? await loadMongoRegistrations()
    : await loadLocalRegistrations();
  const payload = buildSheetPayload(rows, areas);

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = new Map(spreadsheet.data.sheets?.map(sheet => [sheet.properties?.title, sheet.properties?.sheetId]) || []);
  const missingSheets = Object.keys(payload).filter(title => !existingSheets.has(title));

  if (missingSheets.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missingSheets.map(title => ({ addSheet: { properties: { title } } })),
      },
    });
  }

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: { ranges: Object.keys(payload) },
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: Object.entries(payload).map(([sheetName, values]) => ({
        range: `${sheetName}!A1`,
        values,
      })),
    },
  });

  return {
    syncedAt: new Date().toISOString(),
    spreadsheetId,
    sheets: Object.keys(payload),
    registrations: rows.length,
    participants: Math.max(payload.Participantes.length - 1, 0),
  };
}
