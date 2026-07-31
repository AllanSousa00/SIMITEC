import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_PATH = path.resolve(__dirname, "..", "data", "inep-schools.json");
const INEP_SOURCE_URL = "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/catalogo-de-escolas";

export class InstitutionLookupError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "InstitutionLookupError";
    this.statusCode = statusCode;
  }
}

let catalogCache = null;

function cleanText(value, maxLength = 240) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalize(value = "") {
  return cleanText(value, 500)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function relaxedNormalize(value = "") {
  return normalize(value).replace(/([a-z])\1+/g, "$1");
}

function searchableFields(school = {}, normalizer = normalize) {
  return [
    school.name,
    ...(school.aliases || []),
    school.city,
    school.uf,
    school.dependency,
    school.address
  ].map(normalizer);
}

function prepareSchool(school = {}) {
  const fields = searchableFields(school);
  const relaxedFields = searchableFields(school, relaxedNormalize);
  return {
    ...school,
    _search: {
      code: cleanText(school.code, 20).replace(/\D/g, ""),
      fields,
      full: fields.join(" "),
      relaxedFields,
      relaxedFull: relaxedFields.join(" ")
    }
  };
}

function schoolCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const raw = fs.readFileSync(CATALOG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    catalogCache = Array.isArray(parsed.schools) ? parsed.schools.map(prepareSchool) : [];
  } catch (_error) {
    catalogCache = [];
  }
  return catalogCache;
}

export function institutionVerificationEnabled() {
  return schoolCatalog().length > 0;
}

function inepCodeFromPlaceId(value = "") {
  return cleanText(value, 80).replace(/^inep:/i, "").replace(/\D/g, "");
}

function normalizedInstitution(school = {}) {
  const code = cleanText(school.code, 20).replace(/\D/g, "");
  const cityLine = [school.city, school.uf].filter(Boolean).join(" - ");
  const address = cleanText(
    school.address || [school.street, school.number, school.district, cityLine, school.cep].filter(Boolean).join(", "),
    240
  );
  return {
    placeId: `inep:${code}`,
    code,
    name: cleanText(school.name, 160),
    address,
    city: cleanText(school.city, 120),
    uf: cleanText(school.uf, 2),
    dependency: cleanText(school.dependency, 80),
    source: "INEP/MEC",
    googleMapsUri: cleanText(school.sourceUrl || INEP_SOURCE_URL, 500),
    primaryType: "school",
    verifiedAt: new Date().toISOString()
  };
}

function searchScore(school, query) {
  const q = normalize(query);
  const search = school._search || prepareSchool(school)._search;
  const code = search.code;
  if (!q) return 0;
  const numericQuery = q.replace(/\D/g, "");
  if (numericQuery && code && code.includes(numericQuery)) return 1000;

  const { fields, full, relaxedFields, relaxedFull } = search;
  if (fields[0] === q) return 900;
  if (fields.some((field) => field.startsWith(q))) return 760;
  if (fields.some((field) => field.includes(q))) return 620;

  const tokens = q.split(/\s+/).filter((token) => token.length >= 2);
  if (!tokens.length) return 0;
  const hits = tokens.filter((token) => full.includes(token)).length;
  const directScore = hits ? (hits === tokens.length ? 500 + hits * 20 : hits * 80) : 0;
  const relaxedQuery = relaxedNormalize(query);
  if (relaxedFields.some((field) => field.includes(relaxedQuery))) return Math.max(directScore, 560);
  const relaxedTokens = relaxedQuery.split(/\s+/).filter((token) => token.length >= 2);
  const relaxedHits = relaxedTokens.filter((token) => relaxedFull.includes(token)).length;
  const relaxedScore = relaxedHits
    ? (relaxedHits === relaxedTokens.length ? 460 + relaxedHits * 20 : relaxedHits * 70)
    : 0;
  return Math.max(directScore, relaxedScore);
}

export async function searchInstitutions(query) {
  const input = cleanText(query, 120);
  if (!institutionVerificationEnabled()) {
    return { enabled: false, source: "INEP/MEC", institutions: [] };
  }
  if (input.length < 3) {
    return { enabled: true, source: "INEP/MEC", institutions: [] };
  }

  const institutions = schoolCatalog()
    .map((school) => ({ school, score: searchScore(school, input) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name, "pt-BR"))
    .slice(0, 8)
    .map((item) => normalizedInstitution(item.school))
    .filter((school) => school.code && school.name);

  return { enabled: true, source: "INEP/MEC", institutions };
}

export async function verifyInstitutionSelection(placeId) {
  if (!institutionVerificationEnabled()) return null;

  const code = inepCodeFromPlaceId(placeId);
  if (!code) {
    throw new InstitutionLookupError("Selecione uma instituição encontrada na base oficial do INEP.", 400);
  }

  const school = schoolCatalog().find((item) => cleanText(item.code, 20).replace(/\D/g, "") === code);
  if (!school) {
    throw new InstitutionLookupError("A instituição selecionada não foi encontrada na base oficial do INEP.", 422);
  }
  return normalizedInstitution(school);
}
