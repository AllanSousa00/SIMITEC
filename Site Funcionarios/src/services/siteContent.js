// Servico do conteudo publico.
// Ele junta o que vem do banco com os dados padrao do evento.
// Traducao: e daqui que o site, painel e app pegam a mesma versao da historia.
import mongoose from "mongoose";
import { eventAreas, eventFaq, eventInfo, eventPeople, eventSchedule } from "../eventData.js";
import { SiteContent } from "../models/SiteContent.js";
import { readLocalStore, updateLocalStore } from "./localStore.js";

const OFFICIAL_LOGO_URL = "/assets/simitec-logo-oficial-2026-transparente.png";
const SITE_CONTENT_CACHE_MS = Math.max(Number(process.env.SITE_CONTENT_CACHE_MS || 10000), 1000);
let siteContentCache = null;
let siteContentCacheExpiresAt = 0;
let publicSitePayloadCache = null;
let publicSitePayloadCacheExpiresAt = 0;
const defaultAreaBySlug = new Map(eventAreas.map((area) => [area.slug, area]));

const DEFAULT_GALLERY = [
  {
    year: "2026",
    edition: "SIMITEC 2026",
    src: "/assets/galeria-1.jpg",
    alt: "Participantes da SIMITEC em atividade",
    caption: "Registros da edição 2026",
    visible: true
  },
  {
    year: "2025",
    edition: "SIMITEC 2025",
    src: "/assets/galeria-2.jpg",
    alt: "Apresentação da SIMITEC",
    caption: "Atividades e experiências da SIMITEC 2025",
    visible: true
  },
  {
    year: "2024",
    edition: "SIMITEC 2024",
    src: "/assets/galeria-3.jpg",
    alt: "Estudantes em programação da SIMITEC",
    caption: "Protagonismo estudantil e tecnologia em 2024",
    visible: true
  },
  {
    year: "2023",
    edition: "SIMITEC 2023",
    src: "/assets/galeria-4.jpg",
    alt: "Público acompanhando atividade da SIMITEC",
    caption: "Comunidade escolar reunida na edição 2023",
    visible: true
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setSiteContentCache(content) {
  siteContentCache = clone(content);
  siteContentCacheExpiresAt = Date.now() + SITE_CONTENT_CACHE_MS;
  publicSitePayloadCache = null;
  publicSitePayloadCacheExpiresAt = 0;
}

function invalidateSiteContentCache() {
  siteContentCache = null;
  siteContentCacheExpiresAt = 0;
  publicSitePayloadCache = null;
  publicSitePayloadCacheExpiresAt = 0;
}

function normalizeLogoUrl(url) {
  if (
    !url ||
    url === "/assets/simitec-logo.png" ||
    url === "/assets/simitec-logo-email.png" ||
    url === "/assets/simitec-logo-oficial-2026.jpeg"
  ) {
    return OFFICIAL_LOGO_URL;
  }
  return url;
}

function normalizeEvent(event = {}) {
  const year = String(event.year || event.edition || eventInfo.edition || "2026").match(/\d{4}/)?.[0] || "2026";
  const footer = event.footer || {};
  return {
    ...event,
    logoUrl: normalizeLogoUrl(event.logoUrl),
    footer: {
      ...(eventInfo.footer || {}),
      ...footer,
      organizerName: footer.organizerName || eventInfo.footer?.organizerName || event.location || "",
      email: footer.email || event.contactEmail || eventInfo.footer?.email || "",
      instagram: footer.instagram || eventInfo.footer?.instagram || "",
      whatsapp: footer.whatsapp || event.contactPhone || eventInfo.footer?.whatsapp || "",
      footerText: footer.footerText || eventInfo.footer?.footerText || `© ${year} SIMITEC · Todos os direitos reservados`,
      termsEnabled: footer.termsEnabled !== false,
      privacyEnabled: footer.privacyEnabled !== false
    }
  };
}

function normalizeContent(content) {
  return {
    ...content,
    event: normalizeEvent(content?.event || {})
  };
}

export function defaultSiteContent() {
  return {
    key: "main",
    event: normalizeEvent(clone(eventInfo)),
    areas: clone(eventAreas),
    schedule: clone(eventSchedule),
    faq: clone(eventFaq),
    people: clone(eventPeople),
    gallery: clone(DEFAULT_GALLERY),
    ticket: {
      headline: "Credencial SIMITEC",
      instructions: "Apresente o QR Code no credenciamento da atividade.",
      footer: "Documento pessoal e intransferível para controle de presença."
    }
  };
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export function publicSitePayload(content) {
  // O publico so recebe o que esta visivel.
  // Item escondido fica guardado, mas nao aparece no site.
  return {
    event: {
      ...normalizeEvent(content.event || {}),
      schedule: content.schedule || [],
      faq: content.faq || [],
      people: (content.people || []).filter((person) => person.visible !== false),
      gallery: (content.gallery || []).filter((image) => image.visible !== false),
      ticket: content.ticket || {}
    },
    areas: (content.areas || [])
      .filter((area) => area.visible !== false)
      .map((area) => {
        const defaults = defaultAreaBySlug.get(area.slug) || {};
        return {
          ...area,
          sessionOptions: Array.isArray(area.sessionOptions) && area.sessionOptions.length
            ? area.sessionOptions
            : ["Manhã", "Tarde"],
          sessionSlots: area.sessionSlots || defaults.sessionSlots || {}
        };
      })
  };
}

export async function getSiteContent({ force = false } = {}) {
  const now = Date.now();
  if (!force && siteContentCache && siteContentCacheExpiresAt > now) {
    return clone(siteContentCache);
  }

  const defaults = defaultSiteContent();
  let content;

  if (!isDatabaseConnected()) {
    const store = await readLocalStore();
    content = normalizeContent(store.siteContent || defaults);
  } else {
    const document = await SiteContent.findOneAndUpdate(
      { key: "main" },
      { $setOnInsert: defaults },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    content = normalizeContent(document || defaults);
  }

  setSiteContentCache(content);
  return clone(content);
}

export async function getPublicSiteContent() {
  const now = Date.now();
  if (publicSitePayloadCache && publicSitePayloadCacheExpiresAt > now) {
    return clone(publicSitePayloadCache);
  }

  const payload = publicSitePayload(await getSiteContent());
  publicSitePayloadCache = clone(payload);
  publicSitePayloadCacheExpiresAt = Date.now() + SITE_CONTENT_CACHE_MS;
  return clone(payload);
}

export async function findContentArea(slug) {
  const { areas } = publicSitePayload(await getSiteContent());
  return areas.find((area) => area.slug === slug);
}

export async function saveSiteContent(patch, userId) {
  const current = await getSiteContent({ force: true });
  const next = normalizeContent({
    key: "main",
    event: {
      ...current.event,
      ...(patch.event || {})
    },
    areas: Array.isArray(patch.areas) ? patch.areas : current.areas,
    schedule: Array.isArray(patch.schedule) ? patch.schedule : current.schedule,
    faq: Array.isArray(patch.faq) ? patch.faq : current.faq,
    people: Array.isArray(patch.people) ? patch.people : current.people,
    gallery: Array.isArray(patch.gallery) ? patch.gallery : current.gallery,
    ticket: {
      ...(current.ticket || {}),
      ...(patch.ticket || {})
    },
    updatedBy: userId
  });

  if (!isDatabaseConnected()) {
    await updateLocalStore((store) => {
      store.siteContent = {
        ...next,
        updatedBy: userId?.toString?.() || userId || null,
        updatedAt: new Date().toISOString()
      };
      return store.siteContent;
    });
    const saved = normalizeContent((await readLocalStore()).siteContent);
    setSiteContentCache(saved);
    return saved;
  }

  invalidateSiteContentCache();
  const content = await SiteContent.findOneAndUpdate(
    { key: "main" },
    { $set: next },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const saved = normalizeContent(content.toJSON());
  setSiteContentCache(saved);
  return saved;
}


