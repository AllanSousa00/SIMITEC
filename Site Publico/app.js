// Site publico da SIMITEC.
// Aqui ficam as rotas da pagina, login, inscricao, perfil, credenciais, galeria,
// FAQ e aquelas animacoes que fazem o site parecer vivo.
// Comentario de estudante: se um botao do site publico parar de obedecer,
// provavelmente a pista esta aqui ou no HTML que cria esse botao.
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const userControls = document.querySelector("#userControls");
const mainNav = document.querySelector("#mainNav");
const menuToggle = document.querySelector("#menuToggle");
const topbar = document.querySelector(".topbar");
const scrollProgressBar = document.querySelector("#scrollProgress");
const backToTopButton = document.querySelector("#backToTop");
const lightboxEl = document.querySelector("#lightbox");
const lightboxImg = document.querySelector("#lightboxImg");
const lightboxCaption = document.querySelector("#lightboxCaption");
const speakerModal = document.querySelector("#speakerModal");
const speakerModalCard = document.querySelector("#speakerModalCard");
const areaRegistrationModal = document.querySelector("#areaRegistrationModal");
const areaRegistrationModalCard = document.querySelector("#areaRegistrationModalCard");
const teacherValidationModal = document.querySelector("#teacherValidationModal");
const teacherValidationModalCard = document.querySelector("#teacherValidationModalCard");
const confirmModal = document.querySelector("#confirmModal");
const GOOGLE_CLIENT_ID = "137840492225-v2lv0g8s67kerh74pqjqmp29tcf1l7tg.apps.googleusercontent.com";
const GOOGLE_AUTH_POPUP_NAME = "simitec_google_login";
const GOOGLE_AUTH_RESULT_KEY = "simitec_google_auth_result";
const PUBLIC_EVENT_CACHE_KEY = "simitec.publicEventCache.v1";
const PUBLIC_EVENT_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const OFFICIAL_LOGO_URL = "/assets/simitec-logo-oficial-2026-256.png";
const CONTRAST_LOGO_URL = OFFICIAL_LOGO_URL;
let googleLoginHandling = false;
let googleLoginPollTimer = null;

function normalizeLogoUrl(url) {
  if (
    !url ||
    url === "/assets/simitec-logo.png" ||
    url === "/assets/simitec-logo-email.png" ||
    url === "/assets/simitec-logo-oficial-2026.jpeg" ||
    url === "/assets/simitec-logo-oficial-2026-transparente.png" ||
    url === "/assets/simitec-logo-oficial-2026-384.png" ||
    url === "/assets/simitec-logo-oficial-2026-512.png" ||
    url === "/assets/simitec-logo-oficial-2026-fundo.jpg"
  ) {
    return OFFICIAL_LOGO_URL;
  }
  return url;
}

let lightboxImages = [];
let lightboxIndex = 0;
let speakerModalPreviousFocus = null;
let areaRegistrationModalPreviousFocus = null;
let teacherValidationModalPreviousFocus = null;
let teacherValidationPreviousRole = "Estudante";
let teacherValidationRevertOnClose = false;
let modalResolve = null;
let navigationTimer = null;
let pageEnterTimer = null;
let scrollRevealObserver = null;
let sectionRevealObserver = null;
let legalTocObserver = null;
let scrollTicking = false;
let checkRowsBound = false;
let publicTourIndex = 0;
let publicTourActive = false;
let publicTourAutoStarted = false;
let publicTourStepsSnapshot = [];
let publicTourPositionFrame = 0;
let publicTourRouteFrame = 0;
let publicTourFocusOrigin = null;
let registrationAutoSaveTimer = null;
let registrationAutoSaveBusy = false;
let registrationAutoSaveQueued = false;
let profileAutoSaveTimer = null;
let profileAutoSaveBusy = false;
let profileAutoSaveQueued = false;
let publicAutoSyncTimer = null;
let publicAutoSyncBusy = false;
const faqTypingTimers = new WeakMap();

const publicTourSteps = [
  {
    route: "/",
    selector: ".hero, .hero-actions",
    targets: [".hero-actions .btn.primary"],
    title: "Comece por aqui",
    text: "Esta é a página inicial. Use os botões para entrar na conta ou iniciar sua inscrição.",
    hint: "Quem já tem conta deve entrar. No primeiro acesso, escolha Inscrever-se."
  },
  {
    route: "/entrar",
    selector: ".auth-panel, .auth-tabs",
    targets: [".auth-tabs button"],
    targetLimit: 1,
    loggedOutOnly: true,
    title: "Acesse sua conta",
    text: "A conta reúne sua inscrição, as atividades escolhidas e suas credenciais.",
    hint: "Use Entrar quando já tiver cadastro. Para o primeiro acesso, escolha Criar conta."
  },
  {
    route: "/inscricao",
    selector: "#eventRegistrationForm, .notice-panel, .page-title",
    targets: ["#eventRegistrationForm .form-grid", ".notice-panel"],
    targetLimit: 1,
    authOnly: true,
    title: "Preencha sua inscrição",
    text: "Confira seus dados antes de salvar. Eles serão usados no credenciamento do evento.",
    hint: "Depois de concluir, abra as áreas para escolher em quais atividades deseja participar."
  },
  {
    route: "/areas",
    selector: ".area-list-tools, .area-card",
    targets: [".area-list-tools"],
    title: "Escolha atividades",
    text: "Cada opção mostra as atividades disponíveis e como participar.",
    hint: "Use a busca quando já souber o que procura."
  },
  {
    route: "/cronograma",
    selector: ".schedule-tabs, .schedule-tab",
    targets: [".schedule-tabs"],
    title: "Consulte a programação",
    text: "Veja o que acontece em cada dia e turno do evento.",
    hint: "Alterne entre manhã e tarde quando houver mais de um horário."
  },
  {
    route: "/palestrantes",
    selector: ".speaker-card, .speakers-grid",
    targets: [".speaker-card"],
    targetLimit: 1,
    title: "Conheça as atividades",
    text: "Aqui estão as palestras, oficinas e as pessoas responsáveis por cada encontro.",
    hint: "Abra uma atividade para ver os detalhes antes de se organizar."
  },
  {
    route: "/faq",
    selector: ".faq-tools, #faqSearchInput, .faq-question",
    targets: ["#faqSearchInput"],
    title: "Tire dúvidas",
    text: "Encontre respostas sobre inscrição, atividades e credenciamento.",
    hint: "Digite uma palavra para filtrar as perguntas."
  },
  {
    route: "/perfil",
    selector: "#profileForm, .profile-layout, .status-panel",
    targets: [".status-panel", "#profileForm"],
    authOnly: true,
    title: "Revise seu perfil",
    text: "Mantenha seus dados atualizados. E-mail e telefone ficam ocultos por segurança.",
    hint: "Use o ícone de olho apenas quando precisar consultar ou alterar esses dados."
  },
  {
    route: "/ingressos",
    selector: ".ticket-card, .credential-layout, .tickets-grid",
    targets: [".ticket-card"],
    targetLimit: 1,
    authOnly: true,
    title: "Apresente sua credencial",
    text: "Aqui ficam as credenciais e o QR Code usados na entrada do evento.",
    hint: "Deixe esta tela pronta quando estiver chegando ao credenciamento."
  }
];

const galleryImages = [
  { year: "2026", edition: "SIMITEC 2026", src: "/assets/galeria-1.jpg", alt: "Participantes da SIMITEC em atividade", caption: "Registros da edição 2026" },
  { year: "2025", edition: "SIMITEC 2025", src: "/assets/galeria-2.jpg", alt: "Apresentação da SIMITEC", caption: "Atividades e experiências da SIMITEC 2025" },
  { year: "2024", edition: "SIMITEC 2024", src: "/assets/galeria-3.jpg", alt: "Estudantes em programação da SIMITEC", caption: "Protagonismo estudantil e tecnologia em 2024" },
  { year: "2023", edition: "SIMITEC 2023", src: "/assets/galeria-4.jpg", alt: "Público acompanhando atividade da SIMITEC", caption: "Comunidade escolar reunida na edição 2023" }
];

function getPublicTourSteps() {
  return publicTourSteps.filter((step) => {
    if (step.authOnly && !state.user) return false;
    if (step.loggedOutOnly && state.user) return false;
    return true;
  });
}

function currentPublicTourSteps() {
  return publicTourActive && publicTourStepsSnapshot.length
    ? publicTourStepsSnapshot
    : getPublicTourSteps();
}

const fallbackGalleryYears = ["2026", "2025", "2024", "2023"];

const legalUpdatedAt = "24 de maio de 2026";
const legalVersion = `Versão 1.0 — ${legalUpdatedAt}`;
const legalContact = "simitec.suporte.oficial@gmail.com";
const legalOrganization = "ECIT ENGENHEIRA MARCIA GUEDES ALCOFORADO DE CARVALHO";
const legalDataRetention = "1 ano após o encerramento da edição do evento, salvo necessidade legal, administrativa, certificação, auditoria ou pedido válido de exclusão antes desse prazo.";
const legalNavLinks = [
  ["Termos e Condições", "/termos"],
  ["Política de Privacidade", "/privacidade"],
  ["Créditos", "/creditos"]
];

let legalPages = null;
let legalPagesLoading = null;

async function loadLegalPages() {
  if (legalPages) return legalPages;
  if (!legalPagesLoading) {
    legalPagesLoading = import("./legal-pages.min.js")
      .then((module) => {
        legalPages = module.legalPages || {};
        return legalPages;
      })
      .finally(() => {
        legalPagesLoading = null;
      });
  }
  return legalPagesLoading;
}

const state = {
  event: null,
  areas: [],
  user: null,
  registrations: [],
  authMode: "login",
  resetToken: "",
  authDraft: {},
  sensitiveAccessToken: "",
  sensitiveAccessExpiresAt: 0,
  theme: localStorage.getItem("theme") || "dark"
};
const PUBLIC_TOUR_SEEN_KEY = "simitec.publicTourSeen";
const PUBLIC_TOUR_AUTO_KEY = "simitec.publicTourAutoShown.v1";
const PUBLIC_TOUR_COMPLETED_KEY = "simitec.publicTourCompleted";
const PUBLIC_TOUR_LAST_STEP_KEY = "simitec.publicTourLastStep";
const registrationDraftKey = "simitec.registrationDraft";
const institutionLookupCache = new Map();
let sensitiveAccessTimer;

let countdownTimer;
function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b1121" : "#f4f6fb");
}

function initials(name) {
  return String(name || "SIMITEC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function galleryYear(value, fallback = "2026") {
  const match = String(value || "").match(/\b(20\d{2})\b/);
  return match ? match[1] : fallback;
}

function currentEventYear(fallback = "2026") {
  return galleryYear(state.event?.year || state.event?.edition || state.event?.id, fallback);
}

function currentEventEdition() {
  return state.event?.edition || `SIMITEC ${currentEventYear()}`;
}

function normalizeGalleryImage(image, index = 0) {
  const fallbackYear = fallbackGalleryYears[index] || fallbackGalleryYears[0];
  const year = galleryYear(image?.year || image?.edition || image?.caption || image?.alt, fallbackYear);

  return {
    ...image,
    src: image?.customSrc || "",
    year,
    edition: image?.edition || `SIMITEC ${year}`
  };
}

function visibleGallery() {
  const source = state.event?.gallery?.length ? state.event.gallery : galleryImages;
  return source.map((image, index) => normalizeGalleryImage(image, index));
}

function galleryGroups(images) {
  const groups = new Map();

  images.forEach((image) => {
    const year = galleryYear(image.year || image.edition);
    if (!groups.has(year)) {
      groups.set(year, {
        year,
        edition: image.edition || `SIMITEC ${year}`,
        images: []
      });
    }

    groups.get(year).images.push(image);
  });

  return [...groups.values()].sort((a, b) => Number(b.year) - Number(a.year));
}

function areaVisualLabel(area) {
  return `${area.shortTitle || area.title} - imagem do evento`;
}

function areaImageUrl(area) {
  return area.customImageUrl || "";
}

function renderAreaVisual(area, variant = "card") {
  const imageUrl = areaImageUrl(area);
  const label = areaVisualLabel(area);

  if (imageUrl) {
    return `
      <figure class="area-visual area-visual-${variant}">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" />
      </figure>
    `;
  }

  return `
    <figure class="area-visual area-visual-${variant} is-placeholder ${variant === "detail" ? "area-detail-placeholder" : "area-card-placeholder-visual"}" aria-label="Imagem da atividade em breve">
      <div class="area-placeholder-content">
        <img class="placeholder-logo" src="${CONTRAST_LOGO_URL}" alt="" loading="lazy" decoding="async" />
        <strong>Imagem em breve</strong>
      </div>
    </figure>
  `;
}

function initTheme() {
  setTheme(state.theme);
}

function renderThemeToggle() {
  const isDark = state.theme === "dark";
  const label = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";

  return `
    <button class="btn ghost theme-button" id="themeToggle" type="button" aria-label="${label}" title="${label}" data-theme-state="${state.theme}">
      <span class="theme-icon-shell" aria-hidden="true"></span>
      <span class="sr-only">${label}</span>
    </button>
  `;
}

function renderTourButton() {
  const completed = localStorage.getItem(PUBLIC_TOUR_COMPLETED_KEY) === "1";
  const label = completed ? "Rever guia" : "Guia do site";
  return `
    <button class="profile-menu-item" data-start-public-tour type="button">
      <i data-lucide="badge-help"></i><span>${label}</span>
    </button>
  `;
}

function renderProfileMenu() {
  const userName = state.user?.name || "Meu Perfil";
  const avatarUrl = state.user?.avatarUrl || "/assets/avatar-default.svg";
  const current = route();
  const profileActive = current === "/perfil";
  const ticketsActive = current === "/ingressos";
  return `
    <div class="profile-menu" id="profileMenu">
      <button class="btn ghost profile-toggle" id="profileToggle" type="button" aria-label="Abrir perfil" aria-expanded="false" title="Perfil">
        <img class="profile-toggle-avatar" src="${escapeHtml(avatarUrl)}" alt="" aria-hidden="true" />
        <span>${escapeHtml(userName.split(" ")[0] || "Perfil")}</span>
        <i data-lucide="chevron-down"></i>
      </button>
      <div class="profile-menu-panel" id="profileMenuPanel" aria-label="Menu do perfil">
        <div class="profile-menu-head">
          <strong>${escapeHtml(userName)}</strong>
          <small>Conta SIMITEC</small>
        </div>
        <button class="profile-menu-item ${profileActive ? "is-active" : ""}" type="button" data-route="/perfil">
          <i data-lucide="user-round"></i><span>Meu Perfil</span>
        </button>
        <button class="profile-menu-item ${ticketsActive ? "is-active" : ""}" type="button" data-route="/ingressos">
          <i data-lucide="badge-check"></i><span>Credenciais</span>
        </button>
        ${renderTourButton()}
        <div class="profile-menu-divider" aria-hidden="true"></div>
        <button class="profile-menu-item danger" id="logoutButton" type="button">
          <i data-lucide="log-out"></i><span>Sair</span>
        </button>
      </div>
    </div>
  `;
}

function toggleTheme() {
  const newTheme = state.theme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  renderUserControls();
  refreshIcons();
}

function applyIconFallbacks() {
  const fallbacks = {
    "arrow-left": "<",
    "arrow-right": ">",
    "arrow-up": "^",
    "badge-check": "OK",
    "badge-help": "?",
    calendar: "D",
    "calendar-days": "D",
    "check-circle": "OK",
    "chevron-down": "v",
    "chevron-left": "<",
    "chevron-right": ">",
    "circle-help": "?",
    "clock-3": "H",
    "clock-alert": "!",
    "cloud-check": "OK",
    compass: "+",
    "external-link": ">",
    "file-clock": "F",
    "file-text": "F",
    home: "IN",
    images: "IM",
    info: "i",
    "link-2": "#",
    "lock-keyhole": "*",
    "lock-keyhole-open": "*",
    "log-in": ">",
    "log-out": "<",
    "map-pin": "L",
    "maximize-2": "+",
    menu: "M",
    "mic-2": "P",
    "mouse-pointer-click": "+",
    plus: "+",
    printer: "P",
    save: "S",
    school: "E",
    search: "?",
    "search-x": "?",
    "share-2": ">",
    sparkles: "+",
    "table-2": "T",
    ticket: "V",
    "ticket-check": "V",
    "user-plus": "+",
    "user-round": "U",
    x: "X"
  };

  document.querySelectorAll("i[data-lucide]").forEach((icon) => {
    const name = icon.getAttribute("data-lucide");
    icon.setAttribute("data-icon-fallback", fallbacks[name] || "");
  });
}

function refreshIcons() {
  applyIconFallbacks();
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeSlug(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "secao";
}

function maskEmail(value = "") {
  const [name = "", domain = ""] = String(value || "").split("@");
  if (!name || !domain) return "E-mail protegido";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(3, name.length - 2))}@${domain.replace(/^[^.]*/, "***")}`;
}

function safePhone(value = "") {
  const text = String(value || "").trim();
  return text.includes("@") ? "" : text;
}

function route() {
  const hashRoute = location.hash.replace(/^#/, "");
  const pathRoute = location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const raw = hashRoute && hashRoute !== "/" ? hashRoute : pathRoute || "/";

  if (raw === "/uso-de-imagem" || raw === "/legal/uso-de-imagem") {
    queueMicrotask(() => history.replaceState({}, "", "/termos"));
    return "/termos";
  }

  if (raw.startsWith("-")) {
    const normalized = `/${raw.slice(1)}`;
    const canonical = normalized.startsWith("/areas-") ? normalized.replace("/areas-", "/areas/") : normalized;
    queueMicrotask(() => history.replaceState({}, "", `#${canonical}`));
    return canonical;
  }

  return raw;
}

function navigate(nextRoute, options = {}) {
  if (route() === nextRoute) {
    if (options.force) render();
    return;
  }

  const commitNavigation = () => {
    location.hash = nextRoute;
    navigationTimer = null;
  };

  window.clearTimeout(navigationTimer);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commitNavigation();
    return;
  }

  app.classList.add("is-leaving");
  navigationTimer = window.setTimeout(commitNavigation, 220);
}

function showToast(message, type = "success") {
  const icon = type === "success" ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="alert-circle"></i>';
  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
  toast.className = `toast is-visible ${type}`;
  refreshIcons();
  window.setTimeout(() => {
    toast.className = "toast";
  }, 4200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(state.sensitiveAccessToken ? { "X-Sensitive-Access": state.sensitiveAccessToken } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível concluir a ação.");
  }

  return data;
}

function sensitiveAccessActive() {
  return Boolean(state.sensitiveAccessToken && Date.now() < state.sensitiveAccessExpiresAt);
}

async function clearSensitiveAccess(reload = false) {
  state.sensitiveAccessToken = "";
  state.sensitiveAccessExpiresAt = 0;
  window.clearTimeout(sensitiveAccessTimer);
  if (reload && state.user) {
    await loadMe();
    render();
  }
}

function renderSensitiveAccessGate(message) {
  return `
    <section class="band">
      <div class="panel notice-panel">
        <h2>Dados protegidos</h2>
        <p>${escapeHtml(message)}</p>
        <button class="btn primary" type="button" data-sensitive-unlock>
          <i data-lucide="lock-keyhole-open"></i> Verificar senha
        </button>
      </div>
    </section>
  `;
}

function readPublicEventCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_EVENT_CACHE_KEY) || "null");
    if (!cached?.event || Date.now() - Number(cached.savedAt || 0) > PUBLIC_EVENT_CACHE_TTL_MS) return null;
    return cached;
  } catch (_error) {
    return null;
  }
}

function writePublicEventCache(event, areas) {
  try {
    localStorage.setItem(PUBLIC_EVENT_CACHE_KEY, JSON.stringify({ event, areas, savedAt: Date.now() }));
  } catch (_error) {
    // Storage can be unavailable in private browsing; the site keeps working without cache.
  }
}

async function loadEvent({ force = false } = {}) {
  const cached = readPublicEventCache();
  if (cached && !force) {
    state.event = cached.event;
    state.areas = cached.areas || [];
    syncEventChrome();
    return;
  }

  try {
    const data = await api("/api/registrations/event");
    state.event = data.event;
    state.areas = data.areas;
    writePublicEventCache(state.event, state.areas);
    syncEventChrome();
  } catch (error) {
    if (cached) {
      state.event = cached.event;
      state.areas = cached.areas || [];
      syncEventChrome();
      return;
    }
    console.error("Failed to load event:", error);
    state.event = {
      name: "SIMITEC",
      fullName: "Semana de Inovação e Metodologias Integradas a Tecnologias",
      edition: "SIMITEC",
      summary: "Evento técnico-científico voltado para inovação e educação.",
      dateLabel: "Inscrições abertas",
      location: "ECIT Márcia Guedes",
      highlights: [],
      documents: [],
      sources: []
    };
    state.areas = [];
    syncEventChrome();
  }
}

function syncEventChrome() {
  const edition = currentEventEdition();
  const year = currentEventYear();
  const settings = state.event?.siteSettings || {};
  const footer = state.event?.footer || {};
  if (settings.primaryColor) document.documentElement.style.setProperty("--accent", settings.primaryColor);
  if (settings.secondaryColor) document.documentElement.style.setProperty("--accent-2", settings.secondaryColor);
  if (settings.backgroundColor) document.documentElement.style.setProperty("--bg", settings.backgroundColor);
  const logoUrl = normalizeLogoUrl(state.event?.logoUrl);
  document.querySelectorAll(".footer-logo, .hero-logo").forEach((image) => {
    image.src = logoUrl;
  });
  const footerBrand = document.querySelector(".footer-brand strong");
  if (footerBrand) footerBrand.textContent = state.event?.name || "SIMITEC";
  const footerSummary = document.querySelector(".footer-brand p:not(.footer-school)");
  if (footerSummary) footerSummary.textContent = state.event?.fullName || "Semana de Inovação e Metodologias Integradas a Tecnologias.";
  const footerSchool = document.querySelector(".footer-school");
  if (footerSchool) footerSchool.textContent = footer.organizerName || legalOrganization;
  renderSyncedFooterContact(footer);
  document.querySelectorAll(".footer span").forEach((span) => {
    if (span.textContent.includes("Todos os direitos reservados")) {
      span.textContent = footer.footerText || `© ${year} SIMITEC · Todos os direitos reservados`;
    }
  });
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${edition} | Inscrições Abertas`);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", `${edition} | Inscrições Abertas`);
}

function renderSyncedFooterContact(footer = {}) {
  const contact = document.querySelector(".footer-contact");
  if (!contact) return;
  const instagramIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4.25" y="4.25" width="15.5" height="15.5" rx="4.5"></rect>
      <circle cx="12" cy="12" r="3.25"></circle>
      <circle cx="16.85" cy="7.15" r="0.85" fill="currentColor" stroke="none"></circle>
    </svg>
  `;
  const email = String(footer.email || "").trim();
  const instagram = String(footer.instagram || "").trim();
  const whatsapp = String(footer.whatsapp || "").trim();
  const organization = String(footer.organizerName || legalOrganization).trim();
  const termsLink = footer.termsEnabled === false ? "" : `<a href="/termos" data-route="/termos">Termos e Condições</a>`;
  const privacyLink = footer.privacyEnabled === false ? "" : `<a href="/privacidade" data-route="/privacidade">Política de Privacidade</a>`;
  const contactRows = [
    organization ? `<p><span class="footer-contact-icon"><i data-lucide="school"></i></span><span>${escapeHtml(organization)}</span></p>` : "",
    email ? `<p><span class="footer-contact-icon"><i data-lucide="mail"></i></span><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : "",
    instagram ? `<p><span class="footer-contact-icon footer-contact-icon-instagram">${instagramIcon}</span><a href="${escapeHtml(instagram)}" target="_blank" rel="noopener noreferrer">${escapeHtml(formatFooterSocialLabel(instagram))}</a></p>` : "",
    whatsapp ? `<p><span class="footer-contact-icon"><i data-lucide="phone"></i></span><span>${escapeHtml(whatsapp)}</span></p>` : ""
  ].filter(Boolean).join("");

  contact.innerHTML = `
    <h4>Contato</h4>
    ${contactRows || `<p><span class="footer-contact-icon"><i data-lucide="school"></i></span><span>${escapeHtml(organization)}</span></p>`}
    <h4>Legal</h4>
    <nav aria-label="Links legais">
      ${termsLink}
      ${privacyLink}
      <a href="/creditos" data-route="/creditos">Créditos</a>
    </nav>
  `;
  refreshIcons();
}

function formatFooterSocialLabel(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
  } catch (_error) {
    return value;
  }
}

function setMetaContent(selector, content) {
  const element = document.querySelector(selector);
  if (element && content) element.setAttribute("content", content);
}

function setCanonicalPath(path) {
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", path);
  setMetaContent('meta[property="og:url"]', path);
}

async function loadMe() {
  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
    await loadRegistrations();
  } catch (_error) {
    state.user = null;
    state.registrations = [];
  }
}

async function loadRegistrations() {
  if (!state.user) {
    state.registrations = [];
    return;
  }

  const data = await api("/api/registrations/mine");
  state.registrations = data.registrations || [];
}

function isUserEditingPublicPage() {
  const active = document.activeElement;
  if (!active) return false;
  return Boolean(active.closest("input, textarea, select, [contenteditable='true'], form"));
}

function canRenderAfterAutoSync() {
  if (isUserEditingPublicPage()) return false;
  if (lightboxEl?.classList.contains("is-open")) return false;
  if (speakerModal?.classList.contains("is-open")) return false;
  if (areaRegistrationModal?.classList.contains("is-open")) return false;
  if (teacherValidationModal?.classList.contains("is-open")) return false;
  return true;
}

async function autoSyncPublicData() {
  if (publicAutoSyncBusy) return;
  if (document.visibilityState !== "visible") return;
  if (navigator.onLine === false) return;

  publicAutoSyncBusy = true;
  try {
    await loadEvent({ force: true });
    await loadMe();
    renderUserControls();
    syncNavigation();
    if (canRenderAfterAutoSync()) {
      render();
    } else {
      refreshIcons();
    }
  } catch (error) {
    console.warn("Atualização automática do site público falhou:", error);
  } finally {
    publicAutoSyncBusy = false;
  }
}

function startPublicAutoSync() {
  window.clearInterval(publicAutoSyncTimer);
  const sync = () => autoSyncPublicData();
  publicAutoSyncTimer = window.setInterval(sync, PUBLIC_AUTO_SYNC_INTERVAL_MS);
  window.addEventListener("focus", sync);
  window.addEventListener("online", sync);
  document.addEventListener("visibilitychange", sync);
}

function mainRegistration() {
  return state.registrations.find((item) => item.activitySlug === "main");
}

function areaRegistration(slug) {
  return state.registrations.find((item) => item.activitySlug === slug);
}

function renderUserControls() {
  if (!state.user) {
    userControls.innerHTML = `
      ${renderThemeToggle()}
      <button class="btn ghost" data-start-public-tour type="button" aria-label="Ver tutorial"><i data-lucide="badge-help"></i><span>Tutorial</span></button>
      <button class="btn ghost" data-auth-mode="login" data-route="/entrar" aria-label="Entrar"><i data-lucide="log-in"></i><span>Entrar</span></button>
      <button class="btn primary" data-auth-mode="register" data-route="/entrar" aria-label="Criar conta"><i data-lucide="user-plus"></i><span>Criar conta</span></button>
    `;
    return;
  }

  userControls.innerHTML = `
    ${renderThemeToggle()}
    ${renderProfileMenu()}
  `;
}

function syncNavigation() {
  const current = route();

  document.querySelectorAll(".main-nav [data-route]").forEach((button) => {
    const itemRoute = button.dataset.route;
    const isActive = itemRoute === "/" ? current === "/" : current === itemRoute || current.startsWith(`${itemRoute}/`);
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function resolveTourTarget(selector) {
  const selectors = String(selector || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const item of selectors) {
    const target = document.querySelector(item);
    if (target) return target;
  }

  return app;
}

function isUsableTourElement(target) {
  if (!target) return false;
  const rect = target.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function resolveTourTargets(selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  return list.flatMap((selector) => {
    try {
      return [...document.querySelectorAll(selector)].filter(isUsableTourElement);
    } catch {
      return [];
    }
  });
}

function getTourRect(step) {
  const allGroupedTargets = resolveTourTargets(step?.targets || []);
  const groupedTargets = step?.targetLimit ? allGroupedTargets.slice(0, step.targetLimit) : allGroupedTargets;
  if (groupedTargets.length) {
    const rects = groupedTargets.map((target) => target.getBoundingClientRect());
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top, target: groupedTargets[0], isExact: true };
  }

  const target = resolveTourTarget(step?.selector);
  if (!isUsableTourElement(target)) return null;
  const rect = target.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, target, isExact: false };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectsOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

function applyTourCardPosition(card, highlightBox) {
  if (window.innerWidth <= 760) {
    card.style.left = "";
    card.style.top = "";
    card.style.right = "";
    card.style.bottom = "";
    card.style.transform = "";
    card.classList.remove("is-left", "is-bottom", "is-top", "is-compact");
    return;
  }

  const margin = 20;
  const gap = 24;
  const leftSideSpace = highlightBox.left - margin - gap;
  const rightSideSpace = window.innerWidth - highlightBox.right - margin - gap;
  const cardWidth = Math.min(380, window.innerWidth - margin * 2);
  card.classList.remove("is-narrow");
  card.style.width = `${Math.round(cardWidth)}px`;
  card.style.right = "auto";
  card.style.bottom = "auto";
  card.style.transform = "none";
  card.style.animation = "none";
  card.classList.remove("is-left", "is-bottom", "is-top", "is-compact");

  const cardRect = card.getBoundingClientRect();
  const cardHeight = Math.min(cardRect.height || 520, window.innerHeight - margin * 2);
  const centerX = highlightBox.left + highlightBox.width / 2;
  const centerY = highlightBox.top + highlightBox.height / 2;
  const candidates = [
    { left: highlightBox.right + gap, top: clampNumber(centerY - cardHeight / 2, margin, window.innerHeight - cardHeight - margin) },
    { left: highlightBox.left - cardWidth - gap, top: clampNumber(centerY - cardHeight / 2, margin, window.innerHeight - cardHeight - margin) },
    { left: clampNumber(centerX - cardWidth / 2, margin, window.innerWidth - cardWidth - margin), top: highlightBox.bottom + gap },
    { left: clampNumber(centerX - cardWidth / 2, margin, window.innerWidth - cardWidth - margin), top: highlightBox.top - cardHeight - gap },
    { left: centerX > window.innerWidth / 2 ? margin : window.innerWidth - cardWidth - margin, top: clampNumber((window.innerHeight - cardHeight) / 2, margin, window.innerHeight - cardHeight - margin) }
  ];

  const chosen = candidates.find((item) => {
    const box = { left: item.left, top: item.top, right: item.left + cardWidth, bottom: item.top + cardHeight };
    const fits = item.left >= margin && item.top >= margin && box.right <= window.innerWidth - margin && box.bottom <= window.innerHeight - margin;
    return fits && !rectsOverlap(highlightBox, box);
  }) || candidates[candidates.length - 1];

  card.style.left = `${Math.round(chosen.left)}px`;
  card.style.top = `${Math.round(chosen.top)}px`;
  card.classList.remove("is-positioning");
}

function schedulePublicTourPosition() {
  if (!publicTourActive || publicTourPositionFrame) return;
  publicTourPositionFrame = window.requestAnimationFrame(() => {
    publicTourPositionFrame = 0;
    updatePublicTourPosition();
  });
}

function cancelPublicTourFrames() {
  if (publicTourPositionFrame) window.cancelAnimationFrame(publicTourPositionFrame);
  if (publicTourRouteFrame) window.cancelAnimationFrame(publicTourRouteFrame);
  publicTourPositionFrame = 0;
  publicTourRouteFrame = 0;
}

function updateTourScrims(highlightBox) {
  const overlay = document.querySelector("#publicTourOverlay");
  if (!overlay) return;

  const pad = 5;
  const holeLeft = clampNumber(highlightBox.left - pad, 0, window.innerWidth);
  const holeTop = clampNumber(highlightBox.top - pad, 0, window.innerHeight);
  const holeRight = clampNumber(highlightBox.right + pad, 0, window.innerWidth);
  const holeBottom = clampNumber(highlightBox.bottom + pad, 0, window.innerHeight);
  const scrims = {
    top: { left: 0, top: 0, width: window.innerWidth, height: holeTop },
    right: { left: holeRight, top: holeTop, width: window.innerWidth - holeRight, height: holeBottom - holeTop },
    bottom: { left: 0, top: holeBottom, width: window.innerWidth, height: window.innerHeight - holeBottom },
    left: { left: 0, top: holeTop, width: holeLeft, height: holeBottom - holeTop }
  };

  Object.entries(scrims).forEach(([name, rect]) => {
    const scrim = overlay.querySelector(`[data-tour-scrim="${name}"]`);
    if (!scrim) return;
    scrim.style.left = `${Math.round(rect.left)}px`;
    scrim.style.top = `${Math.round(rect.top)}px`;
    scrim.style.width = `${Math.max(0, Math.round(rect.width))}px`;
    scrim.style.height = `${Math.max(0, Math.round(rect.height))}px`;
  });
}

function removePublicTour({ restoreFocus = false } = {}) {
  cancelPublicTourFrames();
  document.querySelector("#publicTourOverlay")?.remove();
  document.querySelector("#publicTourHighlight")?.remove();
  document.body.classList.remove("tour-is-open");
  window.removeEventListener("resize", schedulePublicTourPosition);
  window.removeEventListener("scroll", schedulePublicTourPosition, true);
  window.visualViewport?.removeEventListener("resize", schedulePublicTourPosition);
  window.removeEventListener("keydown", handlePublicTourKeydown);
  if (restoreFocus && publicTourFocusOrigin?.isConnected) {
    publicTourFocusOrigin.focus({ preventScroll: true });
  }
  if (restoreFocus) publicTourFocusOrigin = null;
}

function endPublicTour() {
  publicTourActive = false;
  publicTourStepsSnapshot = [];
  removePublicTour({ restoreFocus: true });
  localStorage.setItem(PUBLIC_TOUR_SEEN_KEY, "1");
  localStorage.setItem(PUBLIC_TOUR_LAST_STEP_KEY, String(publicTourIndex));
  renderUserControls();
  refreshIcons();
}

function updatePublicTourPosition() {
  if (!publicTourActive) return;
  const step = currentPublicTourSteps()[publicTourIndex];
  const highlight = document.querySelector("#publicTourHighlight");
  const card = document.querySelector("#publicTourOverlay .tour-card");
  if (!step || !card || !highlight) return;

  const rect = getTourRect(step);
  if (!rect) {
    highlight.classList.remove("is-ready");
    return;
  }

  const gap = 10;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxWidth = Math.min(window.innerWidth - 16, rect.isExact ? window.innerWidth - 16 : 560);
  const maxHeight = Math.min(window.innerHeight - 16, rect.isExact ? window.innerHeight - 16 : 180);
  const width = Math.min(Math.max(54, rect.width + gap * 2), maxWidth);
  const height = Math.min(Math.max(42, rect.height + gap * 2), maxHeight);
  const left = Math.min(Math.max(8, centerX - width / 2), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, centerY - height / 2), window.innerHeight - height - 8);
  const highlightBox = { left, top, width, height, right: left + width, bottom: top + height };

  highlight.style.left = `${highlightBox.left}px`;
  highlight.style.top = `${highlightBox.top}px`;
  highlight.style.width = `${width}px`;
  highlight.style.height = `${height}px`;
  card.dataset.placement = "panel";
  updateTourScrims(highlightBox);
  applyTourCardPosition(card, highlightBox);
  window.requestAnimationFrame(() => {
    card.classList.add("is-ready");
    highlight.classList.add("is-ready");
  });
}

function publicTourDots() {
  const steps = currentPublicTourSteps();
  return steps.map((step, index) => `
    <button class="tour-dot ${index === publicTourIndex ? "is-active" : ""}" type="button" data-tour-step="${index}" aria-label="Ir para ${escapeHtml(step.title)}" ${index === publicTourIndex ? 'aria-current="step"' : ""}></button>
  `).join("");
}

function publicTourOutline() {
  const steps = currentPublicTourSteps();
  return `
    <details class="tour-outline">
      <summary>Passos do guia</summary>
      <div>
        ${steps.map((step, index) => `
          <button class="${index === publicTourIndex ? "is-active" : ""} ${index < publicTourIndex ? "is-done" : ""}" type="button" data-tour-step="${index}">
            <span>${index + 1}</span>
            <strong>${escapeHtml(step.title)}</strong>
          </button>
        `).join("")}
      </div>
    </details>
  `;
}

function publicTourLocationLabel(routeValue) {
  return {
    "/": "Início",
    "/inscricao": "Inscrição",
    "/areas": "Áreas",
    "/cronograma": "Cronograma",
    "/faq": "FAQ",
    "/galeria": "Galeria",
    "/entrar": "Conta",
    "/perfil": "Perfil"
  }[routeValue] || "SIMITEC";
}

function focusPublicTourTarget() {
  const step = currentPublicTourSteps()[publicTourIndex];
  const target = getTourRect(step)?.target || resolveTourTarget(step?.selector);
  target?.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  window.setTimeout(schedulePublicTourPosition, 60);
}

function handlePublicTourKeydown(event) {
  if (!publicTourActive) return;
  if (event.key === "Tab") {
    const overlay = document.querySelector("#publicTourOverlay");
    const focusable = [...(overlay?.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])") || [])]
      .filter((element) => element instanceof HTMLElement && !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    endPublicTour();
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goPublicTourStep(publicTourIndex + 1);
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goPublicTourStep(publicTourIndex - 1);
  }
}

function goPublicTourStep(nextIndex) {
  const steps = currentPublicTourSteps();
  if (nextIndex < 0) return;
  if (nextIndex >= steps.length) {
    localStorage.setItem(PUBLIC_TOUR_COMPLETED_KEY, "1");
    localStorage.setItem(PUBLIC_TOUR_LAST_STEP_KEY, "0");
    return endPublicTour();
  }
  publicTourIndex = nextIndex;
  localStorage.setItem(PUBLIC_TOUR_LAST_STEP_KEY, String(publicTourIndex));
  renderPublicTourStep();
}

function renderPublicTourStep() {
  if (!publicTourActive) return;
  const steps = currentPublicTourSteps();
  if (!steps.length) return endPublicTour();
  if (publicTourIndex >= steps.length) publicTourIndex = steps.length - 1;
  const step = steps[publicTourIndex];
  if (!step) return endPublicTour();

  if (route() !== step.route) {
    navigate(step.route, { force: true });
    let attempts = 0;
    const waitForRoute = () => {
      if (!publicTourActive) return;
      const currentStep = currentPublicTourSteps()[publicTourIndex];
      if (!currentStep || currentStep !== step) return;
      if (route() === step.route || attempts >= 30) {
        renderPublicTourStep();
        return;
      }
      attempts += 1;
      publicTourRouteFrame = window.requestAnimationFrame(waitForRoute);
    };
    publicTourRouteFrame = window.requestAnimationFrame(waitForRoute);
    return;
  }

  removePublicTour();

  const target = getTourRect(step)?.target || resolveTourTarget(step.selector);
  target?.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });

  const overlay = document.createElement("div");
  overlay.id = "publicTourOverlay";
  overlay.className = "tour-overlay";
  overlay.innerHTML = `
    <div class="tour-scrim" data-tour-scrim="top" aria-hidden="true"></div>
    <div class="tour-scrim" data-tour-scrim="right" aria-hidden="true"></div>
    <div class="tour-scrim" data-tour-scrim="bottom" aria-hidden="true"></div>
    <div class="tour-scrim" data-tour-scrim="left" aria-hidden="true"></div>
    <div class="tour-card is-positioning" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="tourTitle">
      <div class="tour-sheet-handle" aria-hidden="true"></div>
      <div class="tour-topbar">
        <div class="tour-identity">
          <span class="tour-icon" aria-hidden="true"><i data-lucide="compass"></i></span>
          <div>
            <p class="tour-kicker">Guia SIMITEC</p>
            <span class="tour-step-count">Passo ${publicTourIndex + 1} de ${steps.length}</span>
          </div>
        </div>
        <button class="tour-close" type="button" data-tour-action="close" aria-label="Fechar tutorial" title="Fechar tutorial"><i data-lucide="x"></i></button>
      </div>
      <div class="tour-head">
        <div class="tour-location"><i data-lucide="map-pin"></i>${escapeHtml(publicTourLocationLabel(step.route))}</div>
        <span>${Math.round(((publicTourIndex + 1) / steps.length) * 100)}%</span>
      </div>
      <h3 id="tourTitle">${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.text)}</p>
      ${step.hint ? `<div class="tour-hint"><i data-lucide="mouse-pointer-click"></i><span>${escapeHtml(step.hint)}</span></div>` : ""}
      <div class="tour-progress" aria-hidden="true"><span style="width:${((publicTourIndex + 1) / steps.length) * 100}%"></span></div>
      <div class="tour-dots" aria-label="Etapas do tutorial">${publicTourDots()}</div>
      <div class="tour-actions">
        <button class="tour-skip" type="button" data-tour-action="close">Pular guia</button>
        <div class="tour-action-main">
          ${publicTourIndex > 0 ? '<button class="btn ghost" type="button" data-tour-action="previous"><i data-lucide="arrow-left"></i><span>Voltar</span></button>' : ""}
          <button class="btn primary" type="button" data-tour-action="next"><span>${publicTourIndex === steps.length - 1 ? "Concluir" : "Próximo"}</span><i data-lucide="${publicTourIndex === steps.length - 1 ? "check" : "arrow-right"}"></i></button>
        </div>
      </div>
    </div>
  `;
  const highlight = document.createElement("div");
  highlight.id = "publicTourHighlight";
  highlight.className = "tour-highlight";
  document.body.append(highlight, overlay);
  document.body.classList.add("tour-is-open");

  overlay.addEventListener("click", (event) => {
    const action = event.target.closest("[data-tour-action]")?.dataset.tourAction;
    const stepButton = event.target.closest("[data-tour-step]");
    if (stepButton) {
      goPublicTourStep(Number(stepButton.dataset.tourStep));
      return;
    }
    if (!action) return;
    if (action === "close") return endPublicTour();
    if (action === "previous") {
      return goPublicTourStep(publicTourIndex - 1);
    }
    if (action === "next") {
      return goPublicTourStep(publicTourIndex + 1);
    }
  });

  window.addEventListener("resize", schedulePublicTourPosition);
  window.addEventListener("scroll", schedulePublicTourPosition, true);
  window.visualViewport?.addEventListener("resize", schedulePublicTourPosition);
  window.addEventListener("keydown", handlePublicTourKeydown);
  schedulePublicTourPosition();
  window.setTimeout(schedulePublicTourPosition, 130);
  window.setTimeout(() => overlay.querySelector("[data-tour-action='close']")?.focus({ preventScroll: true }), 0);
  refreshIcons();
}

function startPublicTour() {
  document.querySelector("#profileMenu")?.classList.remove("is-open");
  document.querySelector("#profileToggle")?.setAttribute("aria-expanded", "false");
  publicTourStepsSnapshot = getPublicTourSteps();
  if (!publicTourStepsSnapshot.length) return;
  publicTourFocusOrigin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  publicTourIndex = 0;
  publicTourActive = true;
  localStorage.setItem(PUBLIC_TOUR_AUTO_KEY, "1");
  localStorage.setItem(PUBLIC_TOUR_LAST_STEP_KEY, "0");
  localStorage.setItem(PUBLIC_TOUR_SEEN_KEY, "1");
  renderPublicTourStep();
}

function maybeStartPublicTour() {
  if (publicTourActive) return;
  if (state.resetToken) return;
  const alreadySawTour = localStorage.getItem(PUBLIC_TOUR_SEEN_KEY) === "1"
    || localStorage.getItem(PUBLIC_TOUR_AUTO_KEY) === "1"
    || localStorage.getItem(PUBLIC_TOUR_COMPLETED_KEY) === "1";
  if (alreadySawTour) return;
  localStorage.setItem(PUBLIC_TOUR_AUTO_KEY, "1");
  window.setTimeout(() => {
    if (!publicTourActive) startPublicTour();
  }, 700);
}

function closeMobileMenu() {
  mainNav?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
}

function renderHero() {
  const event = state.event;
  const subtitleText = event.fullName || "Semana de Inovação e Metodologias Integradas a Tecnologias";
  const heroImage = event.bannerUrl || event.backgroundUrl || event.heroImage || "/assets/galeria-3.jpg";
  return `
    <section class="hero" style="--hero-image: url('${escapeHtml(heroImage)}')">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-content">
        <h1>${escapeHtml(event.name)}</h1>
        <p class="hero-subtitle">${escapeHtml(subtitleText)}</p>
        <div class="hero-meta">
          <span><i data-lucide="calendar"></i> ${escapeHtml(event.dateLabel)}</span>
          ${event.timeLabel ? `<span><i data-lucide="clock"></i> ${escapeHtml(event.timeLabel)}</span>` : ""}
          <span><i data-lucide="map-pin"></i> ${escapeHtml(event.location)}</span>
        </div>
        <div class="hero-actions">
          <button class="btn primary" data-route="/inscricao"><i data-lucide="user-plus"></i> Inscrever-se</button>
          <button class="btn light" data-route="/areas"><i data-lucide="compass"></i> Ver áreas</button>
        </div>
        ${event.startAt ? `
          <div class="countdown-panel" id="countdown">
            <span><strong>00</strong><small>Dias</small></span>
            <span><strong>00</strong><small>Horas</small></span>
            <span><strong>00</strong><small>Min</small></span>
            <span><strong>00</strong><small>Seg</small></span>
          </div>
        ` : `
          <div class="countdown-panel countdown-note">
            <span><strong>${escapeHtml(currentEventEdition())}</strong><small>Inscrições abertas</small></span>
          </div>
        `}
      </div>
    </section>
  `;
}

function initCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  if (!state.event?.startAt) return;

  const targetDate = new Date(state.event.startAt).getTime();
  countdownTimer = setInterval(() => {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      clearInterval(countdownTimer);
      const el = document.getElementById("countdown");
      if (el) el.innerHTML = "<h3>O evento começou!</h3>";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const el = document.getElementById("countdown");
    if (el) {
      el.innerHTML = `
        <span><strong>${days.toString().padStart(2, "0")}</strong><small>Dias</small></span>
        <span><strong>${hours.toString().padStart(2, "0")}</strong><small>Horas</small></span>
        <span><strong>${minutes.toString().padStart(2, "0")}</strong><small>Min</small></span>
        <span><strong>${seconds.toString().padStart(2, "0")}</strong><small>Seg</small></span>
      `;
    }
  }, 1000);
}

function renderHome() {
  app.innerHTML = `
    ${renderHero()}
    ${state.event.notice ? `
      <section class="band">
        <div class="panel notice-panel">
          <h2>Aviso importante</h2>
          <p>${escapeHtml(state.event.notice)}</p>
        </div>
      </section>
    ` : ""}
    <section class="band intro-band">
      <div class="content-grid">
        <div>
          <h2>Ciência, tecnologia, cultura e participação estudantil reunidas na escola.</h2>
          <p>${escapeHtml(state.event.summary)}</p>
        </div>
        ${renderStatusPanel()}
      </div>
    </section>
    ${renderExperiencePanel()}
    <section class="band home-area-band">
      <div class="section-heading">
        <h2>Escolha uma área</h2>
      </div>
      ${renderAreaGrid()}
    </section>
    ${renderSchedulePreview()}
    ${renderFaqPreview()}
    ${renderGalleryPreview({ compact: true })}
  `;
}

function renderSchedulePreview() {
  const days = normalizeScheduleDays(state.event.schedule);
  return `
    <section class="band home-preview-band">
      <div class="section-heading">
        <h2>Resumo da programação</h2>
      </div>
      <div class="home-day-grid">
        ${days.map((day, index) => `
          <article class="panel home-day-card">
            <span>${escapeHtml(day.day || `Dia ${index + 1}`)}</span>
            <h3>${escapeHtml(scheduleDayTitle(day, index))}</h3>
            <div class="home-day-list">
              ${(day.items || []).slice(0, 3).map((item) => `
                <p>
                  <strong>${escapeHtml(item.time)}</strong>
                  <span>${escapeHtml(item.title)}</span>
                  <small>${escapeHtml(item.location)}</small>
                </p>
              `).join("")}
            </div>
          </article>
        `).join("")}
      </div>
      <div class="center-actions">
        <button class="btn ghost" data-route="/cronograma"><i data-lucide="table-2"></i> Ver cronograma completo</button>
      </div>
    </section>
  `;
}

function renderFaqPreview() {
  const items = (state.event.faq || []).flatMap((group) => group.items || []).slice(0, 3);
  return `
    <section class="band home-preview-band">
      <div class="section-heading">
        <h2>Antes de vir ao evento</h2>
      </div>
      <div class="home-faq-grid">
        ${items.map((item) => `
          <article class="panel home-faq-card">
            <h3>${escapeHtml(item.question)}</h3>
            <p>${escapeHtml(item.answer)}</p>
          </article>
        `).join("")}
      </div>
      <div class="center-actions">
        <button class="btn ghost" data-route="/faq"><i data-lucide="circle-help"></i> Ver todas as dúvidas</button>
      </div>
    </section>
  `;
}

function renderExperiencePanel() {
  const highlights = state.event.highlights || [];
  const experienceItems = [
    { icon: "flask-conical", title: "Mostra científica", text: "Projetos, experimentos e apresentações desenvolvidos por estudantes e professores." },
    { icon: "cpu", title: "Trilhas tecnológicas", text: "Robótica, programação e demonstrações nos laboratórios da escola." },
    { icon: "users", title: "Vivência escolar", text: "Integração entre estudantes, convidados, comunidade e escolas da região." }
  ];

  return `
    <section class="band experience-band">
      <div class="section-heading">
        <h2>Mostra, feira e atividades escolares em ciência e tecnologia.</h2>
        <p>${escapeHtml(state.event.researchNote || "")}</p>
      </div>
      <div class="experience-layout">
        <article class="panel experience-feature">
          <h3>O que esperar</h3>
          <ul>${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <div class="experience-grid">
          ${experienceItems.map((item) => `
            <article class="panel experience-card">
              <i data-lucide="${item.icon}"></i>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderStatusPanel() {
  if (!state.user) {
    return `
      <div class="panel auth-compact">
        <h3>Conta SIMITEC</h3>
        <p>Cadastre-se para confirmar presença, escolher atividades e receber a credencial.</p>
      <div class="stack-actions">
        <button class="btn primary" data-auth-mode="register" data-route="/entrar">Criar conta</button>
        <button class="btn ghost" data-auth-mode="login" data-route="/entrar">Entrar</button>
        <button class="btn ghost" data-start-public-tour type="button"><i data-lucide="badge-help"></i> Ver tutorial</button>
      </div>
    </div>
  `;
  }

  const main = mainRegistration();
  const areaCount = state.registrations.filter((item) => item.activitySlug !== "main").length;

  return `
    <div class="panel status-panel">
      <div class="user-profile-header">
        <img src="${escapeHtml(state.user.avatarUrl)}" alt="Avatar" class="user-avatar" />
        <div style="flex: 1;">
          <h3>${escapeHtml(state.user.name)}</h3>
          <p class="points-label"><i data-lucide="badge-check"></i> Conta ativa</p>
        </div>
      </div>
      <dl>
        <div><dt>E-mail</dt><dd>${state.user.emailVerified ? "Confirmado" : "Pendente"}</dd></div>
        <div><dt>Inscrição geral</dt><dd>${main ? "Confirmada" : "Pendente"}</dd></div>
        <div><dt>Áreas escolhidas</dt><dd>${areaCount}</dd></div>
      </dl>
      <div class="stack-actions">
        <button class="btn primary full" data-route="${main ? "/areas" : "/inscricao"}">${main ? "Escolher área" : "Confirmar inscrição"}</button>
        <button class="btn ghost full" data-route="/ingressos"><i data-lucide="badge-check"></i> Abrir credenciais</button>
        <button class="btn ghost full" data-start-public-tour type="button"><i data-lucide="badge-help"></i> Ver tutorial</button>
      </div>
    </div>
  `;
}

function renderAreaGrid(limit) {
  const areas = limit ? state.areas.slice(0, limit) : state.areas;
  return `
    <div class="area-grid area-grid-four area-grid-placeholders">
      ${areas
        .map((area, index) => {
          const registered = Boolean(areaRegistration(area.slug));
          return `
          <article class="area-card area-card-placeholder" data-index="${index}" data-seats="${area.seats}" style="--accent: ${area.accent}">
            ${renderAreaVisual(area, "card")}
            <div class="area-card-placeholder-body">
              <h3>${escapeHtml(area.title)}</h3>
              <p>${escapeHtml(area.description)}</p>
            </div>
            <div class="area-card-footer">
              <span><i data-lucide="ticket"></i> ${area.sessionOptions?.length ? `${area.seats} vagas por turno` : `${area.seats} vagas`}</span>
              <button class="btn small" data-route="/areas/${area.slug}">
                ${registered ? '<i data-lucide="check-circle"></i> Ver credencial' : '<i data-lucide="arrow-right"></i> Participar'}
              </button>
            </div>
          </article>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderGalleryPreview(options = {}) {
  const compact = options.compact === true;
  let lightboxIndex = 0;
  const allImages = visibleGallery().map((image) => ({
    ...image,
    galleryIndex: image.src ? lightboxIndex++ : -1
  }));
  const images = compact ? allImages.slice(0, 8) : allImages;
  const groups = galleryGroups(images);

  return `
    <section class="band gallery-band" data-gallery-scope>
      <div class="section-heading">
        <h2>${compact ? "Registros por edição" : "Fotos por edição"}</h2>
        <p>${compact ? "As fotos ficam organizadas por ano do evento." : "Selecione um ano para consultar os registros de cada edição."}</p>
      </div>
      ${groups.length > 1 ? `
        <div class="gallery-year-tabs" role="list" aria-label="Filtrar galeria por ano">
          <button class="gallery-year-tab is-active" type="button" data-gallery-filter="all" aria-pressed="true">Todos</button>
          ${groups.map((group) => `
            <button class="gallery-year-tab" type="button" data-gallery-filter="${escapeHtml(group.year)}" aria-pressed="false">
              ${escapeHtml(group.year)}
            </button>
          `).join("")}
        </div>
      ` : ""}
      <div class="gallery-year-stack">
        ${groups.map((group) => `
          <section class="gallery-year-group" data-gallery-year-group="${escapeHtml(group.year)}">
            <div class="gallery-year-heading">
              <span>${escapeHtml(group.year)}</span>
              <div>
                <h3>${escapeHtml(group.edition)}</h3>
              </div>
            </div>
            <div class="gallery-grid">
              ${group.images.map((image) => `
                <figure class="gallery-figure">
                  ${image.src ? `
                    <div class="gallery-media">
                      <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || image.caption || "Registro da SIMITEC")}" data-gallery-index="${image.galleryIndex}" loading="lazy" decoding="async" />
                    </div>
                  ` : `
                    <div class="gallery-media gallery-placeholder" aria-label="Registro da SIMITEC em breve">
                      <div>
                        <img class="placeholder-logo" src="${CONTRAST_LOGO_URL}" alt="" loading="lazy" decoding="async" />
                        <strong>Registro em breve</strong>
                      </div>
                    </div>
                  `}
                  ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
                </figure>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAuthPage() {
  const mode = state.resetToken ? "reset" : state.authMode;
  const standaloneMode = mode === "reset" || mode === "forgot";
  const standalonePageClass = mode === "reset" ? "reset-only-page" : mode === "forgot" ? "forgot-only-page" : "";
  const standalonePanelClass = mode === "reset" ? "reset-only-panel" : mode === "forgot" ? "forgot-only-panel" : "";

  document.documentElement.toggleAttribute("data-reset-flow", mode === "reset");
  
  const existingPage = document.querySelector(".auth-page");
  if (existingPage) {
    const isExistingStandalone = existingPage.classList.contains("reset-only-page") || existingPage.classList.contains("forgot-only-page");
    if ((standaloneMode && !existingPage.classList.contains(standalonePageClass)) || (!standaloneMode && isExistingStandalone)) {
      existingPage.remove();
      app.innerHTML = `
        <section class="auth-page ${standalonePageClass}">
          <div class="panel auth-panel ${standalonePanelClass}">
            ${renderAuthForm(mode)}
          </div>
        </section>
      `;
      bindForms();
      return;
    }
    const panel = existingPage.querySelector(".auth-panel");
    if (panel) {
      const tabs = panel.querySelector(".auth-tabs");
      if (standaloneMode) {
        tabs?.remove();
      } else if (tabs) {
        tabs.querySelectorAll("button").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.authMode === mode);
        });
      }
      
      const currentFormId = mode === "login" ? "loginForm" : mode === "register" ? "registerForm" : mode === "forgot" ? "forgotForm" : "resetForm";
      const existingForm = panel.querySelector("form");
      
      if (!existingForm || existingForm.id !== currentFormId) {
        if (existingForm) existingForm.remove();
        panel.insertAdjacentHTML("beforeend", renderAuthForm(mode));
        bindForms();
      }
    }
    return;
  }

  const tabs = `
    <div class="auth-tabs">
      <button class="${mode === "login" || mode === "forgot" ? "active" : ""}" data-auth-mode="login">Entrar</button>
      <button class="${mode === "register" ? "active" : ""}" data-auth-mode="register">Criar conta</button>
    </div>
  `;

  app.innerHTML = `
    <section class="auth-page ${standalonePageClass}">
      ${standaloneMode ? "" : `
        <div class="auth-copy">
          <h1>Entre para se inscrever na SIMITEC.</h1>
          <p>Crie sua conta para confirmar presença, escolher atividades e acompanhar suas credenciais.</p>
        </div>
      `}
      <div class="panel auth-panel ${standalonePanelClass}">
        ${standaloneMode ? "" : tabs}
        ${renderAuthForm(mode)}
      </div>
    </section>
  `;
}

function renderAuthForm(mode) {
  const draft = state.authDraft || {};
  if (mode === "register") {
    return `
      <form id="registerForm" class="form">
        <div class="form-group">
          <label for="name">Nome completo</label>
          <input id="name" name="name" value="${escapeHtml(draft.name || "")}" autocomplete="name" required />
        </div>
        <div class="form-group">
          <label for="socialName">Nome social</label>
          <input id="socialName" name="socialName" value="${escapeHtml(draft.socialName || "")}" />
        </div>
        <div class="form-group">
          <label for="email">E-mail</label>
          <input id="email" name="email" type="email" value="${escapeHtml(draft.email || "")}" autocomplete="email" required />
        </div>
        <div class="form-group">
          <label for="phone">Telefone</label>
          <input id="phone" name="phone" value="${escapeHtml(draft.phone || "")}" autocomplete="tel" />
        </div>
        <div class="form-group">
          <label for="passwordInput">Senha</label>
          <div class="password-field">
            <input id="passwordInput" name="password" type="password" value="${escapeHtml(draft.password || "")}" autocomplete="new-password" minlength="8" required />
          </div>
        </div>
        <div class="password-meter" id="passwordMeter"><span></span><small>Use letras e números com pelo menos 8 caracteres.</small></div>
        <div class="form-group">
          <label for="confirmPassword">Confirmar senha</label>
          <div class="password-field">
            <input id="confirmPassword" name="confirmPassword" type="password" value="${escapeHtml(draft.confirmPassword || "")}" autocomplete="new-password" minlength="8" required />
          </div>
          <small class="field-hint" id="passwordMatchHint">Repita a mesma senha.</small>
        </div>
        <div class="check-row">
          <input id="acceptedTerms" name="acceptedTerms" type="checkbox" ${draft.acceptedTerms ? "checked" : ""} />
          <label for="acceptedTerms">Li e concordo com os <a href="/termos" data-route="/termos">Termos e Condições</a>, incluindo as regras de uso de imagem e voz, e com a <a href="/privacidade" data-route="/privacidade">Política de Privacidade</a> da SIMITEC.</label>
        </div>
        ${renderGoogleAuthButton()}
        <button class="btn primary full" type="submit">Criar conta</button>
      </form>
    `;
  }

  if (mode === "forgot") {
    return `
      <form id="forgotForm" class="form">
        <h2>Recuperar senha</h2>
        <p class="form-note">Informe seu e-mail para receber o link de redefinição. Confira também spam e lixo eletrônico.</p>
        <label>E-mail cadastrado<input name="email" type="email" value="${escapeHtml(draft.email || "")}" autocomplete="email" required /></label>
        <p class="form-note">Se não aparecer na entrada, procure por SIMITEC na caixa de spam e marque como remetente seguro.</p>
        <button class="btn primary full" type="submit">Enviar recuperação</button>
        <button class="btn quiet full" type="button" data-auth-mode="login">Voltar para entrar</button>
      </form>
    `;
  }

  if (mode === "reset") {
    return `
      <form id="resetForm" class="form">
        <div class="reset-only-head">
          <span>Conta segura</span>
          <h2>Definir nova senha</h2>
          <p>Digite a nova senha duas vezes para evitar erro. Depois você volta para a entrada do SIMITEC.</p>
        </div>
        <label>Nova senha
          <div class="password-field">
            <input id="resetPasswordInput" name="password" type="password" value="${escapeHtml(draft.password || "")}" autocomplete="new-password" minlength="8" required />
            <button type="button" data-password-toggle="resetPasswordInput" aria-label="Mostrar senha"><i data-lucide="eye"></i></button>
          </div>
        </label>
        <label>Confirmar nova senha
          <div class="password-field">
            <input id="resetConfirmPasswordInput" name="confirmPassword" type="password" value="${escapeHtml(draft.confirmPassword || "")}" autocomplete="new-password" minlength="8" required />
            <button type="button" data-password-toggle="resetConfirmPasswordInput" aria-label="Mostrar senha"><i data-lucide="eye"></i></button>
          </div>
          <small class="field-hint" id="passwordMatchHint">Repita a mesma senha.</small>
        </label>
        <button class="btn primary full" type="submit">Atualizar senha</button>
      </form>
    `;
  }

  return `
    <form id="loginForm" class="form">
      <div class="form-group">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" value="${escapeHtml(draft.email || "")}" autocomplete="email" required />
      </div>
      <div class="form-group">
        <label for="password">Senha</label>
        <div class="password-field">
          <input id="password" name="password" type="password" value="${escapeHtml(draft.password || "")}" autocomplete="current-password" required />
          <button type="button" data-password-toggle="password" aria-label="Mostrar senha"><i data-lucide="eye"></i></button>
        </div>
      </div>
      ${renderGoogleAuthButton()}
      <button class="btn primary full" type="submit">Entrar</button>
      <button class="btn quiet full" type="button" data-auth-mode="forgot">Recuperar senha</button>
    </form>
  `;
}

function renderGoogleAuthButton() {
  return `
    <div class="google-auth-slot" data-google-login-slot>
      <button class="btn ghost full" type="button" data-google-login>
        <i data-lucide="user-round"></i> Entrar com Google
      </button>
    </div>
  `;
}

function googleClientId() {
  return document.querySelector('meta[name="google-client-id"]')?.content || window.SIMITEC_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve(true);
  const existing = document.querySelector('script[src^="https://accounts.google.com/gsi/client"]');
  if (existing) {
    return new Promise((resolve) => {
      const done = () => resolve(Boolean(window.google?.accounts?.id));
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      window.setTimeout(done, 1800);
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(Boolean(window.google?.accounts?.id));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

async function startGoogleLogin() {
  let clientId = googleClientId();
  if (!clientId) {
    const config = await api("/api/auth/google/config").catch(() => ({}));
    clientId = config.clientId || "";
  }
  if (!clientId) {
    showToast("Login com Google ainda não configurado.", "error");
    return;
  }

  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem("simitec_google_nonce", nonce);
  const redirectUri = `${window.location.origin}/google-auth-callback.html`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    state: nonce,
    prompt: "select_account"
  });
  const width = 520;
  const height = 680;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const popup = window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    GOOGLE_AUTH_POPUP_NAME,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!popup) {
    showToast("Permita pop-ups para entrar com Google.", "error");
    return;
  }
  showToast("Conclua o acesso na janela do Google.");
  beginGoogleLoginPolling(popup);
}

async function initGoogleAuthButtons(retry = 0) {
  const slots = [...document.querySelectorAll("[data-google-login-slot]")];
  if (!slots.length) return;

  let clientId = googleClientId();
  if (!clientId) {
    const config = await api("/api/auth/google/config").catch(() => ({}));
    clientId = config.clientId || "";
  }

  if (!clientId) {
    slots.forEach((slot) => {
      slot.innerHTML = `
        <button class="btn ghost full" type="button" data-google-login>
          <i data-lucide="user-round"></i> Entrar com Google
        </button>
      `;
    });
    refreshIcons();
    return;
  }

  slots.forEach((slot) => {
    if (slot.dataset.googleRendered === "true") return;
    slot.innerHTML = `
      <button class="btn ghost full" type="button" data-google-login>
        <i data-lucide="user-round"></i> Entrar com Google
      </button>
    `;
    slot.dataset.googleRendered = "true";
  });
  refreshIcons();
}

async function handleGoogleLogin(credential) {
  try {
    const data = await api("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential })
    });
    await clearSensitiveAccess();
    state.user = data.user;
    await loadRegistrations();
    showToast(data.needsProfileCompletion ? "Conta Google conectada. Complete seus dados." : "Entrada com Google realizada.");
    navigate(data.needsProfileCompletion ? "/perfil" : "/inscricao");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function shouldAcceptGoogleAuthPayload(payload = {}) {
  const expectedNonce = sessionStorage.getItem("simitec_google_nonce") || "";
  if (expectedNonce && payload.nonce && payload.nonce !== expectedNonce) {
    showToast("Login com Google recusado por validação de segurança.", "error");
    return false;
  }
  return true;
}

function processGoogleAuthPayload(payload = {}) {
  if (!shouldAcceptGoogleAuthPayload(payload)) return;
  sessionStorage.removeItem("simitec_google_nonce");
  if (payload.sessionReady || payload.user) {
    if (googleLoginHandling) return;
    googleLoginHandling = true;
    showToast("Finalizando entrada com Google...");
    (async () => {
      try {
        await clearSensitiveAccess();
        if (payload.user) {
          state.user = payload.user;
          await loadRegistrations();
        } else {
          await loadMe();
        }
        navigate(payload.needsProfileCompletion ? "/perfil" : "/inscricao");
        showToast(payload.needsProfileCompletion ? "Conta Google conectada. Complete seus dados." : "Entrada com Google realizada.");
      } catch (error) {
        showToast(error.message || "Não foi possível carregar sua conta Google.", "error");
      } finally {
        googleLoginHandling = false;
      }
    })();
  } else if (payload.credential) {
    if (googleLoginHandling) return;
    googleLoginHandling = true;
    showToast("Conectando conta Google...");
    handleGoogleLogin(payload.credential).finally(() => {
      googleLoginHandling = false;
    });
  } else {
    showToast(payload.error || "Não foi possível entrar com Google.", "error");
  }
}

function beginGoogleLoginPolling(popup) {
  window.clearInterval(googleLoginPollTimer);
  const startedAt = Date.now();
  googleLoginPollTimer = window.setInterval(() => {
    consumeStoredGoogleLogin();
    const expired = Date.now() - startedAt > 2 * 60 * 1000;
    if (expired || popup?.closed || state.user) {
      window.clearInterval(googleLoginPollTimer);
      googleLoginPollTimer = null;
    }
  }, 350);
}

function consumeStoredGoogleLogin() {
  const raw = localStorage.getItem(GOOGLE_AUTH_RESULT_KEY);
  if (!raw) return;
  localStorage.removeItem(GOOGLE_AUTH_RESULT_KEY);
  try {
    const payload = JSON.parse(raw);
    if (!payload || payload.type !== "simitec-google-credential") return;
    if (payload.createdAt && Date.now() - Number(payload.createdAt) > 2 * 60 * 1000) return;
    processGoogleAuthPayload(payload);
  } catch (_error) {
    showToast("Não foi possível ler o retorno do Google.", "error");
  }
}

window.addEventListener("message", (event) => {
  if (event.data?.type !== "simitec-google-credential") return;
  const allowedOrigins = new Set([
    window.location.origin,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]);
  if (!allowedOrigins.has(event.origin)) return;
  processGoogleAuthPayload(event.data);
});

window.addEventListener("focus", consumeStoredGoogleLogin);
window.addEventListener("pageshow", consumeStoredGoogleLogin);
window.addEventListener("storage", (event) => {
  if (event.key === GOOGLE_AUTH_RESULT_KEY) consumeStoredGoogleLogin();
});

function renderInstitutionLookupField(data = {}) {
  const institution = data.institution || "";
  const placeId = data.institutionPlaceId || "";
  const address = data.institutionAddress || "";
  const mapsUri = data.institutionGoogleMapsUri || "";
  return `
    <label class="institution-field" data-institution-field>
      Instituição ou escola
      <input name="institution" value="${escapeHtml(institution)}" autocomplete="off" data-institution-input />
      <input type="hidden" name="institutionPlaceId" value="${escapeHtml(placeId)}" />
      <input type="hidden" name="institutionAddress" value="${escapeHtml(address)}" />
      <input type="hidden" name="institutionGoogleMapsUri" value="${escapeHtml(mapsUri)}" />
      <div class="institution-lookup-panel" data-institution-results hidden></div>
      <small class="institution-lookup-status" data-institution-status>
        ${placeId ? "Instituição confirmada pela base INEP/MEC." : "Digite ao menos 3 letras para buscar na base INEP/MEC."}
      </small>
    </label>
  `;
}

function isProtectedValue(value) {
  return String(value || "").trim().toLowerCase() === "protegido";
}

function firstVisibleValue(...values) {
  return values.find((value) => String(value || "").trim() && !isProtectedValue(value)) || "";
}

function teacherValidationInfo(participant = {}) {
  const status = participant.role === "Professor(a)"
    ? "approved"
    : participant.teacherValidationStatus || "not-requested";
  const labels = {
    "not-requested": "Opcional",
    pending: "Aguardando conferência",
    approved: "Professor(a) validado",
    rejected: "Código não confirmado"
  };
  const help = status === "approved"
    ? "Seu perfil de professor já foi liberado pela equipe."
    : status === "pending"
      ? "Seu código foi enviado. A equipe fará a conferência no site oficial do MEC."
      : status === "rejected"
        ? "Confira a CNDB no site oficial e envie novamente o código correto."
        : "A Carteira Nacional Docente do Brasil é usada para confirmar o perfil de professor.";
  return { status, labels, help };
}

function renderTeacherValidationModal(participant = {}, codeValue = "") {
  const { status, labels, help } = teacherValidationInfo(participant);
  return `
    <button class="area-modal-close" type="button" data-teacher-modal-close aria-label="Fechar validação">
      <i data-lucide="x"></i>
    </button>
    <header class="area-modal-head teacher-modal-head">
      <span class="activity-card-tag"><i data-lucide="badge-check"></i> Validação docente</span>
      <h2 id="teacherValidationModalTitle">Confirme seu perfil de professor(a)</h2>
      <p id="teacherValidationModalDescription">${escapeHtml(help)}</p>
    </header>
    <div class="teacher-validation-panel" aria-label="Validação de professor pela CNDB">
      <div class="teacher-validation-head">
        <div>
          <strong>Carteira Nacional Docente do Brasil</strong>
          <small>Confirmação pelo portal oficial do MEC</small>
        </div>
        <span class="teacher-validation-status is-${escapeHtml(status)}">${escapeHtml(labels[status] || labels["not-requested"])}</span>
      </div>
      ${status === "approved" ? "" : `
        <div class="teacher-validation-actions teacher-modal-fields">
          <label>Código de validação da CNDB
            <input data-teacher-modal-code value="${escapeHtml(codeValue)}" maxlength="80" autocomplete="off" placeholder="${status === "pending" ? "Digite outro código somente para corrigir" : "Digite o código exibido na carteira"}" />
          </label>
        </div>
        <div class="teacher-validation-support">
          <a class="btn ghost" href="https://www.gov.br/pt-br/servicos/consultar-carteira-nacional-docente-do-brasil" target="_blank" rel="noopener noreferrer">
            <i data-lucide="external-link"></i> Consultar no MEC
          </a>
        </div>
        <p class="teacher-validation-note">
          <i data-lucide="info"></i>
          <span>O código será enviado para conferência. O perfil não é liberado apenas por autodeclaração.</span>
        </p>
      `}
    </div>
    <div class="area-modal-actions">
      <button class="btn ghost" type="button" data-teacher-modal-close>Cancelar</button>
      <button class="btn primary" type="button" data-teacher-modal-confirm>${status === "approved" ? "Fechar" : "Enviar para conferência"}</button>
    </div>
  `;
}

function renderRegistrationPage() {
  if (!state.user) {
    renderAuthRequired("Entre ou crie sua conta para confirmar a inscrição geral.");
    return;
  }

  if (!state.user.emailVerified) {
    renderVerifyNotice();
    return;
  }

  const registration = mainRegistration();
  const participant = registration?.participant || {};
  const draft = loadRegistrationDraft();
  const selectedAreas = state.registrations.filter((item) => item.activitySlug !== "main").length;
  const sensitiveVisible = !registration || sensitiveAccessActive();
  const emailValue = firstVisibleValue(participant.email, draft.email, sensitiveAccessActive() ? state.user.email : "");
  const cpfValue = firstVisibleValue(participant.cpf, draft.cpf);
  const phoneValue = firstVisibleValue(participant.phone, draft.phone, sensitiveAccessActive() ? state.user.phone : "");
  const controlledRole = ["Professor(a)", "Organizador(a)"].includes(participant.role) ? participant.role : "";
  const teacherRequested = ["pending", "rejected"].includes(participant.teacherValidationStatus);
  const roleSelection = participant.role === "Professor(a)" || teacherRequested
    ? "Professor(a)"
    : participant.role || draft.role || "Estudante";
  const teacherCardCode = firstVisibleValue(participant.teacherCardCode);
  const institutionInfo = {
    institution: participant.institution || draft.institution || state.user.institution || "",
    institutionPlaceId: participant.institutionPlaceId || draft.institutionPlaceId || state.user.institutionPlaceId || "",
    institutionAddress: participant.institutionAddress || draft.institutionAddress || state.user.institutionAddress || "",
    institutionGoogleMapsUri: participant.institutionGoogleMapsUri || draft.institutionGoogleMapsUri || state.user.institutionGoogleMapsUri || ""
  };

  app.innerHTML = `
    <section class="page-title">
      <h1>Credenciamento SIMITEC</h1>
      <p>Depois da inscrição geral, escolha uma das áreas do evento.</p>
    </section>
    ${renderJourneyBar("inscricao")}
    <section class="band credential-band">
      <div class="credential-layout is-simple">
        <form id="eventRegistrationForm" class="panel form wide-form credential-form">
          <div class="credential-form-head">
            <div>
              <h2>Dados do participante</h2>
            </div>
            ${registration ? `<button class="btn ghost" type="button" data-route="/areas">${selectedAreas ? "Ver áreas" : "Escolher área"}</button>` : ""}
          </div>
          <div class="form-grid">
            <label>Nome completo<input name="name" value="${escapeHtml(participant.name || draft.name || state.user.name)}" required /></label>
            <label>Nome social<input name="socialName" value="${escapeHtml(participant.socialName || draft.socialName || "")}" /></label>
            ${renderProfileSensitiveContact({
              type: "registration-email",
              label: "E-mail",
              value: sensitiveVisible ? emailValue : participant.email,
              visible: sensitiveVisible,
              inputName: "email",
              inputType: "email",
              required: !registration
            })}
            ${renderProfileSensitiveContact({
              type: "registration-cpf",
              label: "CPF",
              value: sensitiveVisible ? cpfValue : participant.cpf,
              visible: sensitiveVisible,
              inputName: "cpf",
              inputMode: "numeric",
              required: !registration
            })}
            ${renderProfileSensitiveContact({
              type: "registration-phone",
              label: "Telefone",
              value: sensitiveVisible ? phoneValue : participant.phone,
              visible: sensitiveVisible,
              inputName: "phone",
              inputMode: "tel"
            })}
            <label>Perfil
              <select name="role">
                ${controlledRole
                  ? `<option selected>${escapeHtml(controlledRole)}</option>`
                  : ["Estudante", "Professor(a)", "Visitante"]
                    .map((option) => `<option ${roleSelection === option ? "selected" : ""}>${option}</option>`)
                    .join("")}
              </select>
              <small class="field-hint">Organizador(a) é liberado somente pela organização. Professor(a) depende da validação CNDB abaixo.</small>
            </label>
            ${renderInstitutionLookupField(institutionInfo)}
            <label>Curso ou turma<input name="course" value="${escapeHtml(participant.course || draft.course || state.user.course || "")}" /></label>
            <label>Cidade<input name="city" value="${escapeHtml(participant.city || draft.city || state.user.city || "")}" data-institution-city /></label>
          </div>
          <input type="hidden" name="teacherCardCode" value="${escapeHtml(teacherCardCode)}" data-teacher-card-code />
          <label>Necessidade de acessibilidade<textarea name="accessibility">${escapeHtml(participant.accessibility || draft.accessibility || "")}</textarea></label>
          <div class="form-feedback" data-registration-feedback aria-live="polite"></div>
          <input type="hidden" name="acceptedTerms" value="true" />
          <p class="terms-consent">Ao salvar, você confirma a ciência dos documentos legais da SIMITEC: Termos e Condições, incluindo regras de imagem e voz, e Política de Privacidade. No cadastro pelo site, e-mail e CPF são necessários para organizar a entrada, validar a credencial e emitir certificados.</p>
          <div class="form-actions">
            <span class="auto-save-note"><i data-lucide="cloud-check"></i> Alterações salvas automaticamente</span>
            <button class="btn ghost" type="button" data-route="/areas" data-registration-next ${registration ? "" : "hidden"}>Escolher área</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderVerifyNotice() {
  app.innerHTML = `
    <section class="verification-page">
      <div class="verification-card">
        <div class="verification-icon" aria-hidden="true"><i data-lucide="mail-check"></i></div>
        <p class="eyebrow">Conta criada</p>
        <h1>Confirme seu e-mail</h1>
        <p>Enviamos um link para validar sua conta. Depois da confirmação, suas inscrições serão liberadas.</p>
        <div class="verification-note"><i data-lucide="clock-3"></i><span>O link é válido por 24 horas.</span></div>
        <button class="btn primary verification-action" id="resendVerification"><i data-lucide="send"></i> Reenviar e-mail</button>
        <p class="verification-help">Não encontrou a mensagem? Verifique a caixa de spam ou lixo eletrônico.</p>
      </div>
    </section>
  `;
}

function renderAreasPage() {
  app.innerHTML = `
    <section class="page-title areas-title">
      <h1>Áreas de participação</h1>
      <p>Escolha a atividade principal para receber uma credencial específica.</p>
    </section>
    ${renderJourneyBar("areas")}
    <section class="band areas-selection-band">
      <div class="area-list-tools">
        <div class="search-summary" id="areaSearchSummary" aria-live="polite">${state.areas.length} atividades disponíveis</div>
        <div class="area-search">
          <i data-lucide="search"></i>
          <label class="sr-only" for="areaSearchInput">Buscar atividade</label>
          <input type="text" id="areaSearchInput" placeholder="Buscar atividade" autocomplete="off" />
          <button class="area-search-clear" id="areaSearchClear" type="button" aria-label="Limpar busca"><i data-lucide="x"></i></button>
        </div>
      </div>
      ${renderAreaGrid()}
      <div class="empty-state area-empty" id="areaEmptyState" hidden>
        <i data-lucide="search-x"></i>
        <strong>Nenhuma atividade encontrada</strong>
        <span>Tente outro termo de busca.</span>
      </div>
    </section>
  `;
}

function renderAreaDetail(slug) {
  const area = state.areas.find((item) => item.slug === slug);

  if (!area) {
    app.innerHTML = `
      <section class="page-title compact">
        <h1>Área não encontrada</h1>
        <button class="btn primary" data-route="/areas">Ver áreas</button>
      </section>
    `;
    return;
  }

  const registered = areaRegistration(area.slug);
  app.innerHTML = `
    <section class="band area-detail-section" aria-labelledby="area-details-title">
      <button class="btn ghost small area-detail-back" type="button" data-route="/areas"><i data-lucide="arrow-left"></i> Voltar para áreas</button>
      <article class="activity-detail-card" style="--accent: ${area.accent}">
        <div class="activity-card-media">
          ${renderAreaVisual(area, "detail")}
        </div>
        <div class="activity-card-body">
          <header class="activity-card-head">
            <span class="activity-card-tag"><i data-lucide="sparkles"></i>${escapeHtml(area.tag)}</span>
            <h1 id="area-details-title">${escapeHtml(area.title)}</h1>
            <p>${escapeHtml(area.description)}</p>
            <ul class="activity-card-context" aria-label="Informações rápidas">
              <li><i data-lucide="calendar-days"></i>${escapeHtml(area.schedule)}</li>
              <li><i data-lucide="map-pin"></i>${escapeHtml(area.location)}</li>
              ${area.sessionOptions?.length ? `<li><i data-lucide="clock-3"></i>${escapeHtml(areaSessionSummary(area))}</li>` : ""}
            </ul>
          </header>
          <dl class="activity-card-meta" aria-label="Resumo da atividade">
            <div><dt>Vagas</dt><dd>${area.sessionOptions?.length ? `${area.seats} de manhã · ${area.seats} à tarde` : area.seats}</dd></div>
            <div><dt>Situação</dt><dd>${registered ? "Inscrito" : "Disponível"}</dd></div>
          </dl>
          <section class="activity-card-rules" aria-labelledby="area-rules-title">
            <h3 id="area-rules-title">Regras de participação</h3>
            <ul>
              ${area.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            ${area.rulesFileUrl ? `
              <a class="btn ghost small area-rules-file" href="${escapeHtml(area.rulesFileUrl)}" target="_blank" rel="noopener noreferrer">
                <i data-lucide="file-text"></i>${escapeHtml(area.rulesFileLabel || "Abrir regulamento completo")}
              </a>
            ` : ""}
          </section>
          <div class="activity-card-actions" aria-label="Acesso à atividade">
            ${renderAreaAction(area, registered)}
          </div>
        </div>
      </article>
    </section>
  `;
}

function areaUsesExternalForm(area) {
  return area.applicationMode === "external-form";
}

function externalFormIsReady(area) {
  return /^https?:\/\//i.test(String(area.externalFormUrl || ""));
}

function renderAreaSessionField(area) {
  if (!area.sessionOptions?.length) return "";

  return `
    <label>Turno desejado
      <select name="period" required>
        <option value="">Escolha manhã ou tarde</option>
        ${area.sessionOptions.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(areaSessionLabel(area, option))}</option>`).join("")}
      </select>
    </label>
  `;
}

function areaSessionLabel(area, period) {
  const slot = area.sessionSlots?.[period];
  return slot?.start && slot?.end ? `${period} · ${slot.start} às ${slot.end}` : period;
}

function areaSessionSummary(area) {
  return (area.sessionOptions || []).map((period) => areaSessionLabel(area, period)).join(" · ");
}

function renderAreaFormField(field) {
  if (field.type === "textarea") {
    return `<label>${escapeHtml(field.label)}<textarea name="${field.name}" ${field.required ? "required" : ""}></textarea></label>`;
  }

  if (field.type === "select") {
    return `
      <label>${escapeHtml(field.label)}
        <select name="${field.name}" ${field.required ? "required" : ""}>
          <option value="">Selecione</option>
          ${field.options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  return `<label>${escapeHtml(field.label)}<input name="${field.name}" ${field.required ? "required" : ""} /></label>`;
}

function renderAreaAction(area, registered) {
  const renderActionPanel = (content, options = {}) => {
    const tag = options.form ? "form" : "div";
    const classes = options.form
      ? "area-card-action area-card-action-form"
      : `area-card-action${options.compact ? " is-compact-access" : ""}`;
    const attrs = options.form
      ? `id="areaRegistrationForm" class="${classes}" data-area="${escapeHtml(area.slug)}"`
      : `class="${classes}"`;

    return `
      <${tag} ${attrs}>
        <div class="area-action-content">
          ${content}
        </div>
      </${tag}>
    `;
  };

  if (!state.user) {
    return renderActionPanel(`
        <h3>Acesse para participar</h3>
        <div class="area-access-actions">
          <button class="btn primary" data-auth-mode="login" data-route="/entrar"><i data-lucide="log-in"></i> Entrar</button>
          <button class="btn ghost" data-auth-mode="register" data-route="/entrar"><i data-lucide="user-plus"></i> Criar conta</button>
        </div>
    `, { compact: true });
  }

  if (!state.user.emailVerified) {
    return renderActionPanel(`
        <h3>E-mail pendente</h3>
        <p>Confirme seu e-mail antes de escolher uma área.</p>
        <button class="btn primary" data-route="/inscricao">Confirmar e-mail</button>
    `);
  }

  if (areaUsesExternalForm(area)) {
    const hasFormUrl = externalFormIsReady(area);
    return renderActionPanel(`
        <h3>Inscrição por Forms</h3>
        <p class="area-card-action-note">${escapeHtml(area.externalFormMessage || "Essa área passa por avaliação da equipe. Responda ao formulário e aguarde o retorno por e-mail.")}</p>
        <div class="area-form-status">
          <strong>Como funciona</strong>
          <span>Você responde o Forms, a equipe avalia e o resultado chega pelo e-mail da sua conta.</span>
        </div>
        <div class="area-access-actions is-single">
          ${
            hasFormUrl
              ? `<a class="btn primary" href="${escapeHtml(area.externalFormUrl)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> ${escapeHtml(area.externalFormLabel || "Abrir Forms")}</a>`
              : `<button class="btn ghost" type="button" disabled aria-disabled="true"><i data-lucide="file-clock"></i> Forms em breve</button>`
          }
        </div>
    `);
  }

  if (!mainRegistration()) {
    return renderActionPanel(`
        <h3>Inscrição geral pendente</h3>
        <p>O credenciamento geral precisa estar confirmado antes da área.</p>
        <button class="btn primary" data-route="/inscricao">Fazer inscrição geral</button>
    `);
  }

  if (registered) {
    return renderActionPanel(`
        <h3>Participação confirmada</h3>
        <p>Sua credencial para ${escapeHtml(area.shortTitle)} já está pronta.</p>
        <button class="btn primary" data-route="/ingressos">Ver credencial</button>
    `);
  }

  return renderActionPanel(`
      <h3>Inscrição da área</h3>
      <p class="area-card-action-note">Depois de ler as informações, abra a ficha rápida para escolher o turno e confirmar a participação.</p>
      <button class="btn primary full" type="button" data-area-modal-open="${escapeHtml(area.slug)}">
        <i data-lucide="clipboard-list"></i> ${area.sessionOptions?.length ? "Escolher turno e participar" : "Preencher inscrição"}
      </button>
  `);
}

function renderAreaRegistrationModal(area) {
  const hasExtraFields = Array.isArray(area.formFields) && area.formFields.length > 0;
  const modalHelp = area.sessionOptions?.length && !hasExtraFields
    ? "Escolha o turno desejado e confirme sua participação. A página principal fica limpa por trás."
    : "Preencha só o necessário para esta área. A página principal fica por trás, sem ocupar espaço lá embaixo.";

  return `
    <button class="area-modal-close" type="button" data-area-modal-close aria-label="Fechar inscrição">
      <i data-lucide="x"></i>
    </button>
    <header class="area-modal-head">
      <span class="activity-card-tag"><i data-lucide="sparkles"></i>${escapeHtml(area.tag)}</span>
      <h2 id="areaRegistrationModalTitle">${escapeHtml(area.shortTitle || area.title)}</h2>
      <p id="areaRegistrationModalDescription">${escapeHtml(modalHelp)}</p>
    </header>
    <form id="areaRegistrationForm" class="area-modal-form" data-area="${escapeHtml(area.slug)}">
      ${renderAreaSessionField(area)}
      <p class="area-modal-conflict-note"><i data-lucide="clock-alert"></i> Você pode participar de várias áreas. O sistema bloqueia somente horários que coincidirem.</p>
      ${(area.formFields || []).map(renderAreaFormField).join("")}
      <div class="area-modal-actions">
        <button class="btn ghost" type="button" data-area-modal-close>Cancelar</button>
        <button class="btn primary" type="submit">Confirmar participação</button>
      </div>
    </form>
  `;
}

function openAreaRegistrationModal(slug, trigger) {
  const area = state.areas.find((item) => item.slug === slug);
  if (!area || !areaRegistrationModal || !areaRegistrationModalCard) return;

  areaRegistrationModalPreviousFocus = trigger || document.activeElement;
  areaRegistrationModalCard.style.setProperty("--accent", area.accent || "#1bb7f0");
  areaRegistrationModalCard.innerHTML = renderAreaRegistrationModal(area);
  areaRegistrationModal.classList.add("is-open");
  areaRegistrationModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  bindSubmitForm("#areaRegistrationForm", handleAreaRegistration);
  refreshIcons();
  window.setTimeout(() => {
    (areaRegistrationModalCard.querySelector("select, input, textarea") || areaRegistrationModalCard.querySelector("[data-area-modal-close]"))?.focus();
  }, 40);
}

function closeAreaRegistrationModal(options = {}) {
  if (!areaRegistrationModal?.classList.contains("is-open")) return;
  areaRegistrationModal.classList.remove("is-open");
  areaRegistrationModal.setAttribute("aria-hidden", "true");
  areaRegistrationModalCard.innerHTML = "";
  areaRegistrationModalCard.style.removeProperty("--accent");
  document.body.style.overflow = "";
  if (!options.skipFocus) areaRegistrationModalPreviousFocus?.focus?.();
  areaRegistrationModalPreviousFocus = null;
}

function renderSchedulePage() {
  const schedule = normalizeScheduleDays(state.event.schedule);
  app.innerHTML = `
    <section class="page-title">
      <h1>Cronograma SIMITEC</h1>
      <p>Confira a organização dos três dias, com horários, locais e atividades por período.</p>
    </section>
    <section class="band schedule-band" data-schedule-scope>
      <div class="schedule-tabs" role="list" aria-label="Selecionar dia do cronograma">
        ${schedule.map((day, index) => `
          <button class="schedule-tab ${index === 0 ? "is-active" : ""}" type="button" data-schedule-tab="${index}" aria-pressed="${index === 0 ? "true" : "false"}">
            <span>${escapeHtml(day.day || `Dia ${index + 1}`)}</span>
            <small>${escapeHtml(scheduleDayTheme(day, index))}</small>
          </button>
        `).join("")}
      </div>
      <div class="schedule-board">
        ${schedule.map((day, index) => `
          <article class="schedule-sheet ${index === 0 ? "is-active" : ""}" data-schedule-sheet="${index}" ${index === 0 ? "" : "hidden"}>
            <header class="schedule-sheet-head">
              <div>
                <h2>${escapeHtml(scheduleDayTitle(day, index))}</h2>
                <small>${escapeHtml(scheduleDayTheme(day, index))}</small>
              </div>
              <div class="schedule-periods" role="group" aria-label="Selecionar período do ${escapeHtml(day.day)}">
                ${schedulePeriods(day).map((period, periodIndex) => `
                  <button class="schedule-period ${periodIndex === 0 ? "is-active" : ""}" type="button" data-schedule-period="${escapeHtml(period)}" aria-pressed="${periodIndex === 0 ? "true" : "false"}">
                    ${escapeHtml(period)}
                  </button>
                `).join("")}
              </div>
            </header>
            <div class="schedule-table" role="table" aria-label="Cronograma ${escapeHtml(day.day)}">
              <div class="schedule-row schedule-row-head" role="row">
                <span role="columnheader">Hora</span>
                <span role="columnheader">Atividade</span>
                <span role="columnheader">Tipo</span>
                <span role="columnheader">Local</span>
                <span role="columnheader">Descrição</span>
              </div>
              ${day.items.length ? day.items.map((item, itemIndex) => `
                <div class="schedule-row" role="row" data-schedule-row-period="${escapeHtml(scheduleTurn(item.time))}">
                  <span class="schedule-time" role="cell" data-label="Hora">
                    <strong>${escapeHtml(item.time)}</strong>
                    <small>${escapeHtml(scheduleTurn(item.time))}</small>
                  </span>
                  <strong class="schedule-activity-title" role="cell" data-label="Atividade">
                    <span>${escapeHtml(item.title)}</span>
                    <small>${escapeHtml(day.day || `Dia ${index + 1}`)} · ${escapeHtml(scheduleTurn(item.time))}</small>
                  </strong>
                  <span role="cell" data-label="Tipo"><span class="tag">${escapeHtml(item.type)}</span></span>
                  <span class="schedule-location" role="cell" data-label="Local"><i data-lucide="map-pin"></i>${escapeHtml(item.location)}</span>
                  <p role="cell" data-label="Descrição">${escapeHtml(item.description)}</p>
                </div>
              `).join("") : `
                <div class="schedule-row schedule-row-empty" role="row">
                  <p role="cell" data-label="Aviso">A programação deste dia será informada pela organização.</p>
                </div>
              `}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function normalizeScheduleDays(schedule) {
  const source = Array.isArray(schedule) ? schedule : [];
  return [0, 1, 2].map((index) => {
    const day = source[index] || {};
    return {
      day: day.day || `Dia ${index + 1}`,
      title: day.title || `Programação do Dia ${index + 1}`,
      status: day.status || "Programação",
      items: Array.isArray(day.items) ? day.items : []
    };
  });
}

function scheduleTurn(time) {
  const hour = Number(String(time || "").split(":")[0]);
  if (!Number.isFinite(hour)) return "Horário";
  if (hour < 12) return "Manhã";
  if (hour < 18) return "Tarde";
  return "Noite";
}

function scheduleDayTheme(day, index) {
  const themes = [
    "Abertura e integração",
    "Mostras e experiências",
    "Projetos e cultura"
  ];
  return themes[index] || day.title || day.day || "Programação";
}

function scheduleDayTitle(day, index) {
  const titles = [
    "Abertura, credenciamento e integração",
    "Trilhas tecnológicas",
    "Feira de ciências, cultura e encerramento"
  ];
  return titles[index] || day.title || `Programação do ${day.day || "evento"}`;
}

function schedulePeriods(day) {
  return [...new Set((day.items || []).map((item) => scheduleTurn(item.time)).filter((period) => period !== "Horário"))];
}

function bindScheduleTabs() {
  document.querySelectorAll("[data-schedule-scope]").forEach((scope) => {
    const tabs = [...scope.querySelectorAll("[data-schedule-tab]")];
    const sheets = [...scope.querySelectorAll("[data-schedule-sheet]")];
    if (!tabs.length || !sheets.length) return;

    const selectPeriod = (sheet, selected) => {
      sheet.querySelectorAll("[data-schedule-period]").forEach((button) => {
        const active = button.dataset.schedulePeriod === selected;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      sheet.querySelectorAll("[data-schedule-row-period]").forEach((row) => {
        row.hidden = row.dataset.scheduleRowPeriod !== selected;
      });
    };

    const resetPeriod = (sheet) => {
      const first = sheet.querySelector("[data-schedule-period]");
      if (first) selectPeriod(sheet, first.dataset.schedulePeriod);
    };

    sheets.forEach((sheet) => {
      sheet.querySelectorAll("[data-schedule-period]").forEach((button) => {
        button.addEventListener("click", () => selectPeriod(sheet, button.dataset.schedulePeriod));
      });
      resetPeriod(sheet);
    });

    tabs.forEach((tab) => {
      if (tab.dataset.scheduleBound === "true") return;
      tab.dataset.scheduleBound = "true";

      tab.addEventListener("click", (event) => {
        event.preventDefault();
        const selected = tab.dataset.scheduleTab;

        tabs.forEach((item) => {
          const active = item.dataset.scheduleTab === selected;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });

        sheets.forEach((sheet) => {
          const active = sheet.dataset.scheduleSheet === selected;
          sheet.hidden = !active;
          sheet.classList.toggle("is-active", active);
          if (active) resetPeriod(sheet);
        });
      });
    });
  });
}

function renderFaqPage() {
  const faq = state.event.faq || [];
  app.innerHTML = `
    <section class="page-title">
      <h1>Dúvidas frequentes</h1>
      <p>Encontre respostas rápidas sobre inscrição, atividades e credenciais.</p>
    </section>
    <section class="band">
      <div class="faq-tools">
        <label class="faq-search">
          <i data-lucide="search"></i>
          <input id="faqSearchInput" type="search" placeholder="Buscar dúvida" autocomplete="off" />
        </label>
        <button class="btn ghost small" id="faqReset" type="button">Limpar</button>
        <button class="btn ghost small" id="faqExpandAll" type="button">Abrir todas</button>
      </div>
      <div class="search-summary" id="faqSearchSummary" aria-live="polite"></div>
      <div class="faq-grid">
        ${faq.map((group, groupIndex) => `
          <section class="faq-group" data-faq-group>
            <h3 class="faq-category"><i data-lucide="ticket"></i> ${escapeHtml(group.category)}</h3>
            ${group.items.map((item, itemIndex) => {
              const id = `faq-${groupIndex}-${itemIndex}`;
              return `
                <article class="panel faq-panel" data-faq-panel>
                  <button class="faq-question" type="button" data-faq-toggle aria-expanded="false" aria-controls="${id}">
                    <span>${escapeHtml(item.question)}</span>
                    <i data-lucide="plus" class="faq-icon"></i>
                  </button>
                  <div class="faq-answer" id="${id}" role="region">
                  <div><p data-faq-answer-text="${escapeHtml(item.answer)}"></p></div>
                  </div>
                </article>
              `;
            }).join("")}
          </section>
        `).join("")}
      </div>
      <div class="empty-state faq-empty" id="faqEmptyState" hidden>
        <i data-lucide="circle-help"></i>
        <strong>Nenhuma dúvida encontrada</strong>
        <span>Tente buscar por outra palavra.</span>
      </div>
    </section>
  `;
}

function renderSpeakersPage() {
  const people = speakerProfiles();

  if (!people.length) {
    app.innerHTML = `
      <section class="page-title compact">
        <h1>Os perfis das atividades serão publicados pela organização.</h1>
        <button class="btn primary" data-route="/">Voltar ao início</button>
      </section>
    `;
    return;
  }

  const groups = [
    {
      key: "palestra",
      eyebrow: "Conversas e apresentações",
      title: "Palestras"
    },
    {
      key: "oficina",
      eyebrow: "Aprendizagem prática",
      title: "Oficinas e minicursos"
    }
  ];

  app.innerHTML = `
    <section class="page-title speaker-directory-title">
      <h1>Palestras e oficinas</h1>
      <p>Conheça os temas e quem conduz cada atividade.</p>
    </section>
    <section class="band speaker-groups">
      ${groups.map((group) => {
        const profiles = people.filter((person) => speakerCategoryKey(person) === group.key);
        if (!profiles.length) return "";
        return `
          <section class="speaker-group" aria-labelledby="speaker-group-${group.key}">
            <div class="speaker-group-heading">
              <h2 id="speaker-group-${group.key}">${escapeHtml(group.title)}</h2>
            </div>
            <div class="speakers-grid">
              ${profiles.map(renderSpeakerCard).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </section>
  `;
}

function speakerProfiles() {
  return (state.event.people || []).filter((person) => speakerCategoryKey(person));
}

function speakerCategoryKey(person) {
  const category = normalizeSlug(person?.category || "");
  if (category.includes("oficina") || category.includes("minicurso") || category.includes("workshop")) return "oficina";
  if (category.includes("palestra")) return "palestra";
  return "";
}

function speakerCategoryLabel(person) {
  return speakerCategoryKey(person) === "oficina" ? "Oficina ou minicurso" : "Palestra";
}

function speakerSlug(person, index = 0) {
  return normalizeSlug(person.slug || person.activityTitle || person.name || `perfil-${index + 1}`);
}

function speakerAvatar(person, detail = false) {
  const sizeClass = detail ? "xl" : "lg";
  return person.photoUrl
    ? `<img class="user-avatar ${sizeClass}" src="${escapeHtml(person.photoUrl)}" alt="${escapeHtml(person.name)}" />`
    : `<div class="avatar-placeholder ${sizeClass}">${escapeHtml(initials(person.name))}</div>`;
}

function speakerCardPhoto(person) {
  return person.photoUrl
    ? `<img class="speaker-card-photo" src="${escapeHtml(person.photoUrl)}" alt="${escapeHtml(person.name)}" />`
    : `<div class="speaker-card-photo speaker-card-photo-placeholder">${escapeHtml(initials(person.name))}</div>`;
}

function renderSpeakerCard(person, index) {
  const slug = speakerSlug(person, index);
  return `
    <article class="speaker-card">
      <button class="speaker-card-media" type="button" data-speaker-modal="${escapeHtml(slug)}" aria-label="Abrir perfil de ${escapeHtml(person.name)}">
        ${speakerCardPhoto(person)}
        <span class="speaker-card-kind">${escapeHtml(speakerCategoryLabel(person))}</span>
        <span class="speaker-card-hint" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
      </button>
      <div class="speaker-card-copy">
        <h3>${escapeHtml(person.name)}</h3>
        <p>${escapeHtml(person.activityTitle || "Atividade da programação")}</p>
        ${person.schedule ? `<span class="speaker-card-time"><i data-lucide="calendar-days"></i>${escapeHtml(person.schedule)}</span>` : ""}
      </div>
    </article>
  `;
}

function speakerModalPhoto(person) {
  return person.photoUrl
    ? `<img class="speaker-modal-photo" src="${escapeHtml(person.photoUrl)}" alt="${escapeHtml(person.name)}" />`
    : `<div class="speaker-modal-photo speaker-modal-photo-placeholder">${escapeHtml(initials(person.name))}</div>`;
}

function openSpeakerModal(slug, trigger) {
  const person = speakerProfiles().find((item, index) => speakerSlug(item, index) === slug);
  if (!person || !speakerModal || !speakerModalCard) return;

  speakerModalPreviousFocus = trigger || document.activeElement;
  speakerModalCard.innerHTML = `
    <button class="speaker-modal-close" type="button" data-speaker-modal-close aria-label="Fechar perfil">
      <i data-lucide="x"></i>
    </button>
    <div class="speaker-modal-visual">
      ${speakerModalPhoto(person)}
    </div>
    <div class="speaker-modal-content">
      <span class="speaker-card-kind speaker-modal-kind">${escapeHtml(speakerCategoryLabel(person))}</span>
      <h2 id="speakerModalTitle">${escapeHtml(person.name)}</h2>
      <strong>${escapeHtml(person.role || "Responsável pela atividade")}</strong>
      <h3>${escapeHtml(person.activityTitle || "Atividade da programação")}</h3>
      <p>${escapeHtml(person.bio || person.activitySummary || "Mais informações serão publicadas em breve.")}</p>
      <dl class="speaker-modal-facts">
        ${person.schedule ? `<div><dt><i data-lucide="calendar-days"></i> Horário</dt><dd>${escapeHtml(person.schedule)}</dd></div>` : ""}
        ${person.location ? `<div><dt><i data-lucide="map-pin"></i> Local</dt><dd>${escapeHtml(person.location)}</dd></div>` : ""}
      </dl>
    </div>
  `;

  speakerModal.classList.add("is-open");
  speakerModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  refreshIcons();
  window.setTimeout(() => speakerModalCard.querySelector("[data-speaker-modal-close]")?.focus(), 40);
}

function closeSpeakerModal() {
  if (!speakerModal?.classList.contains("is-open")) return;
  speakerModal.classList.remove("is-open");
  speakerModal.setAttribute("aria-hidden", "true");
  speakerModalCard.innerHTML = "";
  document.body.style.overflow = "";
  speakerModalPreviousFocus?.focus?.();
  speakerModalPreviousFocus = null;
}

function renderSpeakerDetail(slug) {
  const people = speakerProfiles();
  const person = people.find((item, index) => speakerSlug(item, index) === slug);

  if (!person) {
    app.innerHTML = `
      <section class="page-title compact">
        <h1>Atividade não encontrada.</h1>
        <button class="btn primary" data-route="/palestrantes">Ver atividades</button>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="page-title speaker-detail-title">
      <button class="btn ghost small" type="button" data-route="/palestrantes"><i data-lucide="arrow-left"></i> Voltar para atividades</button>
      <h1>${escapeHtml(person.activityTitle || "Atividade da programação")}</h1>
      <p>${escapeHtml(person.activitySummary || "Mais informações sobre esta atividade serão publicadas em breve.")}</p>
    </section>
    <section class="band speaker-detail-band">
      <div class="speaker-detail-layout">
        <aside class="panel speaker-profile-card">
          ${speakerAvatar(person, true)}
          <span class="speaker-type">${escapeHtml(speakerCategoryLabel(person))}</span>
          <h2>${escapeHtml(person.name)}</h2>
          <strong>${escapeHtml(person.role || "Responsável pela atividade")}</strong>
          <p>${escapeHtml(person.bio || "O perfil da pessoa responsável será publicado pela organização.")}</p>
          <dl class="speaker-detail-facts">
            ${person.schedule ? `<div><dt><i data-lucide="clock-3"></i> Horário</dt><dd>${escapeHtml(person.schedule)}</dd></div>` : ""}
            ${person.location ? `<div><dt><i data-lucide="map-pin"></i> Local</dt><dd>${escapeHtml(person.location)}</dd></div>` : ""}
          </dl>
        </aside>
        <div class="speaker-detail-content">
          <article class="panel">
            <h2>${escapeHtml(person.activityTitle || "Atividade da programação")}</h2>
            <p>${escapeHtml(person.details || person.activitySummary || "Os detalhes desta atividade serão publicados pela organização.")}</p>
          </article>
          <article class="panel">
            <h2>${escapeHtml(person.name)}</h2>
            <p>${escapeHtml(person.bio || "O perfil da pessoa responsável será publicado pela organização.")}</p>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderGalleryPage() {
  app.innerHTML = `
    <section class="page-title">
      <h1>Galeria SIMITEC</h1>
      <p>Fotos e materiais visuais publicados pela organização.</p>
    </section>
    ${renderGalleryPreview()}
  `;
}

function renderLegalTable(table) {
  if (!table) return "";

  return `
    <div class="legal-table-wrap">
      <table class="legal-table">
        <caption>${escapeHtml(table.caption)}</caption>
        <thead>
          <tr>
            ${table.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${table.rows
            .map((row) => `
              <tr>
                ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
              </tr>
            `)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function legalSectionDomId(section) {
  return `legal-${section.id || normalizeSlug(section.title)}`;
}

function legalReadTime(page) {
  const chunks = [
    page.title,
    page.intro,
    ...page.sections.flatMap((section) => [
      section.title,
      ...(section.paragraphs || []),
      ...(section.bullets || []),
      ...(section.table?.columns || []),
      ...((section.table?.rows || []).flat())
    ])
  ];
  const words = chunks.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 180));
}

function renderLegalToc(page) {
  return `
    <aside class="legal-toc-panel" aria-label="Índice desta página">
      <div class="legal-toc-card">
        <p class="legal-block-label">Índice</p>
        <nav class="legal-toc" aria-label="Seções da página">
          ${page.sections
            .map((section, index) => {
              const sectionId = legalSectionDomId(section);
              const current = index === 0 ? ' aria-current="true"' : "";
              return `<a href="#${escapeHtml(sectionId)}" data-legal-section-link${current}>${escapeHtml(section.title)}</a>`;
            })
            .join("")}
        </nav>
      </div>
    </aside>
  `;
}

function renderLegalSection(section) {
  const sectionId = legalSectionDomId(section);
  const headingId = `${sectionId}-title`;
  const paragraphs = section.paragraphs || (section.text ? [section.text] : []);
  const links = section.links
    ? `<div class="source-list">${section.links
        .map(([title, url, label]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}<small>${escapeHtml(label)}</small></a>`)
        .join("")}</div>`
    : "";
  const bullets = section.bullets
    ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  return `
    <section id="${escapeHtml(sectionId)}" class="panel legal-card" aria-labelledby="${escapeHtml(headingId)}" tabindex="-1">
      <div class="legal-section-heading">
        <h2 id="${escapeHtml(headingId)}">${escapeHtml(section.title)}</h2>
        <button class="legal-copy-link" type="button" data-copy-section="${escapeHtml(sectionId)}" aria-label="Copiar link da seção ${escapeHtml(section.title)}">
          <i data-lucide="link-2"></i>
          <span>Copiar link</span>
        </button>
      </div>
      ${paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
      ${bullets}
      ${renderLegalTable(section.table)}
      ${links}
    </section>
  `;
}

function renderLegalInstitutionalNav(page) {
  const links = legalNavLinks.filter(([, target]) => target !== page.route);

  return `
    <nav class="legal-institutional-nav" aria-label="Páginas institucionais">
      <button class="btn primary" type="button" data-legal-scroll-top>Voltar ao início</button>
      ${links.map(([label, target]) => `<a class="btn ghost" href="${escapeHtml(target)}" data-route="${escapeHtml(target)}">${escapeHtml(label)}</a>`).join("")}
    </nav>
  `;
}

function renderLegalHero(page) {
  return `
    <section class="legal-hero" aria-labelledby="legalPageTitle">
      <div class="legal-hero-main">
        <p class="legal-block-label">SIMITEC</p>
        <h1 id="legalPageTitle">${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.intro || page.description || "")}</p>
      </div>
      <dl class="legal-meta-list" aria-label="Informações do documento">
        <div>
          <dt>Documento</dt>
          <dd>${escapeHtml(page.title)}</dd>
        </div>
        <div>
          <dt>Versão</dt>
          <dd>${escapeHtml(page.version || legalVersion)}</dd>
        </div>
        <div>
          <dt>Evento</dt>
          <dd>${escapeHtml(currentEventEdition())}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderLegalPage(type) {
  const page = legalPages?.[type];

  if (!page) {
    app.innerHTML = renderSkeleton();
    loadLegalPages()
      .then(() => {
        const current = route();
        if (current === `/${type}` || current === `/legal/${type}`) {
          render();
        }
      })
      .catch(() => {
        app.innerHTML = `
          <section class="page-title compact">
            <h1>Não foi possível carregar este documento.</h1>
            <button class="btn primary" data-route="/">Voltar ao início</button>
          </section>
        `;
      });
    return;
  }

  app.innerHTML = `
    <div class="legal-page" aria-label="${escapeHtml(page.title)}">
      ${renderLegalHero(page)}
      <div class="legal-layout">
        ${renderLegalToc(page)}
        <div class="legal-content">
          <div class="band legal-grid" aria-label="Conteúdo institucional completo">
            ${page.sections.map((section) => renderLegalSection(section)).join("")}
          </div>
          <div class="legal-actions">
            ${renderLegalInstitutionalNav(page)}
          </div>
        </div>
      </div>
    </div>
  `;
  setupLegalReadingTools();
}

function renderTicketsPage() {
  const ticket = state.event.ticket || {};

  if (!state.user) {
    renderAuthRequired("Entre para ver suas credenciais.");
    return;
  }

  if (!state.registrations.length) {
    app.innerHTML = `
      <section class="page-title compact">
        <h1>Nenhuma inscrição encontrada.</h1>
        <button class="btn primary" data-route="/inscricao">Confirmar inscrição</button>
      </section>
    `;
    return;
  }

  const main = mainRegistration() || state.registrations[0];
  const areas = state.registrations.filter((registration) => registration.activitySlug !== "main");

  app.innerHTML = `
    <section class="page-title">
      <h1>${escapeHtml(ticket.headline || "Sua credencial SIMITEC")}</h1>
      <p>${escapeHtml(ticket.instructions || "Use o mesmo QR Code na entrada do evento e nas atividades escolhidas.")}</p>
    </section>
    ${renderJourneyBar("ingressos")}
    <section class="band ticket-list">
      <article class="ticket-card" id="ticket-${main._id}">
        <div class="ticket-print-head">
          <div class="school-mark school-mark-left">
            <img src="/assets/escola-brasao-512.png" alt="" aria-label="Brasão da escola" loading="lazy" decoding="async" />
          </div>
          <div class="ticket-title-block">
            <strong>${escapeHtml(currentEventEdition())}</strong>
            <span>Credencial oficial de participação</span>
          </div>
          <img class="simitec-ticket-logo" src="${OFFICIAL_LOGO_URL}" alt="" aria-label="SIMITEC" loading="lazy" decoding="async" />
        </div>
        <div>
          <span class="ticket-kicker">Credencial de entrada</span>
          <h2>${escapeHtml(main.participant.name)}</h2>
          <p class="ticket-event-line">${escapeHtml(state.event.edition)} · Entrada oficial</p>
          <strong class="ticket-code">${escapeHtml(main.ticketCode)}</strong>
          <div class="ticket-areas">
            <span>Entrada geral</span>
            ${areas.length
              ? areas.map((area) => `<span>${escapeHtml(area.activityTitle)}</span>`).join("")
              : ""}
          </div>
        </div>
        <div class="qr-placeholder">QR</div>
      </article>
      <div class="center-actions"><button class="btn ghost" id="printTickets"><i data-lucide="printer"></i> Imprimir</button><button class="share-btn" id="shareTickets"><i data-lucide="share-2"></i> Compartilhar</button></div>
    </section>
  `;

  loadTicketQr(main);
}

function renderAuthRequired(message) {
  app.innerHTML = `
    <section class="page-title compact">
      <h1>${escapeHtml(message)}</h1>
      <div class="hero-actions centered">
        <button class="btn primary" data-auth-mode="login" data-route="/entrar">Entrar</button>
        <button class="btn ghost" data-auth-mode="register" data-route="/entrar">Criar conta</button>
      </div>
    </section>
  `;
}

function renderProfileSensitiveContact({ type, label, value, visible, inputName = "", inputType = "text", inputMode = "", required = false }) {
  const hasStoredValue = Boolean(String(value || "").trim());
  const displayValue = visible ? value : (hasStoredValue ? "Protegido" : "Não informado");
  const icon = visible ? "eye-off" : "eye";
  const action = visible ? "Ocultar" : "Ver";
  const describedBy = `profile-${type}-hint`;

  if (inputName) {
    return `
      <div class="sensitive-form-field ${visible ? "is-visible" : "is-hidden"}">
        <div class="sensitive-field-head">
          <span>${escapeHtml(label)}</span>
          <button class="btn ghost small" type="button" data-profile-sensitive-toggle aria-label="${visible ? `Ocultar ${label}` : `Ver ${label}`}">
            <i data-lucide="${icon}"></i> ${action}
          </button>
        </div>
        ${visible ? `
          <input name="${escapeHtml(inputName)}" type="${escapeHtml(inputType)}" ${inputMode ? `inputmode="${escapeHtml(inputMode)}"` : ""} value="${escapeHtml(value || "")}" aria-describedby="${describedBy}" ${required ? "required" : ""} />
        ` : `
          <div class="sensitive-placeholder" aria-describedby="${describedBy}">
            <i data-lucide="lock-keyhole"></i>
            <span>${escapeHtml(displayValue)}</span>
          </div>
        `}
        <small id="${describedBy}" class="field-hint">${visible ? "Você pode editar este dado agora." : "Clique no olho e confirme sua senha para ver ou alterar."}</small>
      </div>
    `;
  }

  return `
    <div class="protected-email-box sensitive-summary ${visible ? "is-visible" : "is-hidden"}">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(displayValue)}</strong>
      </div>
      <button class="btn ghost small" type="button" data-profile-sensitive-toggle aria-label="${visible ? `Ocultar ${label}` : `Ver ${label}`}">
        <i data-lucide="${icon}"></i>
        ${action}
      </button>
    </div>
  `;
}

function renderProfilePage() {
  if (!state.user) {
    renderAuthRequired("Entre para ver seu perfil.");
    return;
  }

  const sensitiveVisible = sensitiveAccessActive() && state.user.sensitiveDataVisible !== false;
  const visibleEmail = sensitiveVisible ? state.user.email : state.user.email;
  const phoneValue = sensitiveVisible ? safePhone(state.user.phone) : state.user.phone;

  app.innerHTML = `
    <section class="page-title profile-title">
      <h1>Meu Perfil</h1>
      <p>Mantenha seus dados atualizados. E-mail e telefone ficam ocultos até você tocar no olho e confirmar a senha.</p>
    </section>
    <section class="band profile-content-band">
      <div class="profile-layout">
        <div class="panel profile-editor-card">
          <div class="profile-panel-head">
          <div>
            <h2>Seu perfil</h2>
          </div>
        </div>
          <form id="profileForm" class="form profile-form">
            <div class="profile-photo-editor">
              <label class="profile-photo-picker">
                <input id="avatarPreviewInput" type="file" accept="image/png,image/jpeg,image/webp" />
                <img class="user-avatar profile-photo-large" src="${escapeHtml(state.user.avatarUrl || "/assets/avatar-default.svg")}" alt="Foto do perfil" />
                <span>Trocar foto</span>
              </label>
              <input name="avatarUrl" type="hidden" value="${escapeHtml(state.user.avatarUrl || "")}" />
              <div>
                <strong data-profile-display-name>${escapeHtml(state.user.name || "Participante")}</strong>
                <p>A foto ajuda a equipe a identificar você no credenciamento.</p>
              </div>
            </div>
            <div class="form-grid">
              <label>Nome que aparecerá na credencial<input name="name" value="${escapeHtml(state.user.name || "")}" required /></label>
              <label>Nome Social<input name="socialName" value="${escapeHtml(state.user.socialName || "")}" /></label>
              ${renderProfileSensitiveContact({
                type: "phone",
                label: "Telefone",
                value: phoneValue,
                visible: sensitiveVisible,
                inputName: "phone",
                inputType: "tel",
                inputMode: "tel"
              })}
              ${renderInstitutionLookupField({
                institution: state.user.institution || "",
                institutionPlaceId: state.user.institutionPlaceId || "",
                institutionAddress: state.user.institutionAddress || "",
                institutionGoogleMapsUri: state.user.institutionGoogleMapsUri || ""
              })}
              <label>Curso ou turma<input name="course" value="${escapeHtml(state.user.course || "")}" /></label>
              <label>Cidade<input name="city" value="${escapeHtml(state.user.city || "")}" data-institution-city /></label>
            </div>
            ${renderProfileSensitiveContact({
              type: "email",
              label: "E-mail da conta",
              value: visibleEmail,
              visible: sensitiveVisible
            })}
            <label>Resumo do participante<textarea name="bio">${escapeHtml(state.user.bio || "")}</textarea></label>
            <div class="form-actions profile-save-actions">
              <button class="btn primary" type="submit"><i data-lucide="save"></i> Salvar alterações</button>
              <span class="auto-save-status profile-auto-save-status" data-profile-save-status data-status="idle" role="status" aria-live="polite">
                Salvamento automático ativo.
              </span>
            </div>
          </form>
        </div>
        ${renderStatusPanel()}
      </div>
      <div class="panel registration-history profile-history-card">
        <div class="profile-panel-head">
          <div>
            <h2>Histórico</h2>
          </div>
          <span>${state.registrations.length} registro(s)</span>
        </div>
        ${state.registrations.length ? `
          <div class="history-list">
            ${state.registrations.map((item) => `
              <article>
                <strong>${escapeHtml(item.activityTitle)}</strong>
                <span>Credencial ${escapeHtml(item.ticketCode)}</span>
                <small>${escapeHtml(registrationStatusLabel(item.status))}</small>
              </article>
            `).join("")}
          </div>
        ` : "<p>Nenhuma inscrição registrada ainda.</p>"}
      </div>
      ${state.user.role === "participant" ? `
        <div class="panel account-danger-zone">
          <div>
            <h2>Excluir conta</h2>
            <p>Esta ação remove permanentemente sua conta, perfil, inscrições e credenciais.</p>
          </div>
          <form id="deleteAccountForm" class="account-danger-form">
            <label>
              Confirme sua senha
              <input name="password" type="password" autocomplete="current-password" minlength="8" required />
            </label>
            <button class="btn account-delete-button" type="submit">
              <i data-lucide="trash-2"></i> Excluir minha conta
            </button>
          </form>
        </div>
      ` : ""}
    </section>
  `;
}

function registrationStatusLabel(status = "") {
  return {
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    pending: "Pendente"
  }[String(status).toLowerCase()] || "Confirmada";
}

function renderJourneyBar(active) {
  const steps = [
    ["inscricao", "Inscrição geral", "/inscricao"],
    ["areas", "Escolher área", "/areas"],
    ["ingressos", "Credenciais", "/ingressos"]
  ];
  return `
    <section class="journey-wrap" aria-label="Etapas da participação">
      <div class="journey-bar">
        ${steps.map(([id, label, target]) => `
          <button class="${id === active ? "is-active" : ""}" type="button" data-route="${target}">
            <span>${escapeHtml(label)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

async function loadTicketQr(registration) {
  try {
    const data = await api(`/api/registrations/${registration._id}/ticket`);
    const ticket = data.ticket;
    const card = document.querySelector(`#ticket-${registration._id}`);
    if (!card) return;
    const placeholder = card.querySelector(".qr-placeholder");
    if (!placeholder) return;
    placeholder.outerHTML = `
      <div class="qr-box">
        <img src="${ticket.qrCode}" alt="QR Code da credencial ${escapeHtml(ticket.ticketCode)}" />
        <span>QR Code único</span>
      </div>
    `;
  } catch (error) {
    showToast(error.message, "error");
  }
}

function bindForms() {
  bindSubmitForm("#loginForm", handleLogin);
  bindSubmitForm("#registerForm", handleRegister);
  bindSubmitForm("#forgotForm", handleForgotPassword);
  bindSubmitForm("#resetForm", handleResetPassword);
  bindSubmitForm("#eventRegistrationForm", handleEventRegistration);
  bindSubmitForm("#areaRegistrationForm", handleAreaRegistration);
  bindSubmitForm("#profileForm", handleUpdateProfile);
  bindSubmitForm("#deleteAccountForm", handleDeleteAccount);
  bindCredentialProgress();
  document.querySelector("#resendVerification")?.addEventListener("click", handleResendVerification);
  document.querySelector("#printTickets")?.addEventListener("click", () => window.print());
  bindPasswordMeter();
  bindCheckRows();
  bindPasswordToggles();
  bindTeacherValidationToggle();
  bindRegistrationDraft();
  bindEventRegistrationAutoSave();
  bindProfileAutoSave();
  bindPublicInstitutionLookup();
  bindAvatarPreview();
}

function bindTeacherValidationToggle() {
  const form = document.querySelector("#eventRegistrationForm");
  const select = form?.elements?.role;
  const codeInput = form?.querySelector("[data-teacher-card-code]");
  if (!form || !select || !codeInput) return;

  if (select.value !== "Professor(a)") teacherValidationPreviousRole = select.value;
  select.addEventListener("change", () => {
    if (select.value === "Professor(a)") {
      openTeacherValidationModal(select);
      return;
    }

    teacherValidationPreviousRole = select.value;
    codeInput.value = "";
  });
}

function openTeacherValidationModal(trigger) {
  const form = document.querySelector("#eventRegistrationForm");
  const codeInput = form?.querySelector("[data-teacher-card-code]");
  if (!teacherValidationModal || !teacherValidationModalCard || !form || !codeInput) return;

  const participant = mainRegistration()?.participant || {};
  const { status } = teacherValidationInfo(participant);
  teacherValidationModalPreviousFocus = trigger || document.activeElement;
  teacherValidationRevertOnClose = !["pending", "approved"].includes(status) && !String(codeInput.value || "").trim();
  teacherValidationModalCard.style.setProperty("--accent", "#1bb7f0");
  teacherValidationModalCard.innerHTML = renderTeacherValidationModal(participant, codeInput.value);
  teacherValidationModal.classList.add("is-open");
  teacherValidationModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  refreshIcons();
  window.setTimeout(() => {
    (teacherValidationModalCard.querySelector("[data-teacher-modal-code]") || teacherValidationModalCard.querySelector("[data-teacher-modal-confirm]"))?.focus();
  }, 40);
}

function closeTeacherValidationModal(options = {}) {
  if (!teacherValidationModal?.classList.contains("is-open")) return;

  const shouldRevert = options.revertRole ?? teacherValidationRevertOnClose;
  teacherValidationModal.classList.remove("is-open");
  teacherValidationModal.setAttribute("aria-hidden", "true");
  teacherValidationModalCard.innerHTML = "";
  teacherValidationModalCard.style.removeProperty("--accent");
  if (!areaRegistrationModal?.classList.contains("is-open") && !speakerModal?.classList.contains("is-open")) {
    document.body.style.overflow = "";
  }

  if (shouldRevert) {
    const form = document.querySelector("#eventRegistrationForm");
    const select = form?.elements?.role;
    const codeInput = form?.querySelector("[data-teacher-card-code]");
    if (select) select.value = teacherValidationPreviousRole || "Estudante";
    if (codeInput) codeInput.value = "";
    select?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (!options.skipFocus) teacherValidationModalPreviousFocus?.focus?.();
  teacherValidationModalPreviousFocus = null;
  teacherValidationRevertOnClose = false;
}

function confirmTeacherValidationModal() {
  const form = document.querySelector("#eventRegistrationForm");
  const hiddenCode = form?.querySelector("[data-teacher-card-code]");
  const modalCode = teacherValidationModalCard?.querySelector("[data-teacher-modal-code]");
  if (!form || !hiddenCode) return closeTeacherValidationModal({ revertRole: false });

  const status = teacherValidationInfo(mainRegistration()?.participant || {}).status;
  const value = String(modalCode?.value || hiddenCode.value || "").trim();
  if (status !== "approved" && !value) {
    showToast("Informe o código da CNDB para enviar a solicitação.", "error");
    modalCode?.focus();
    return;
  }

  hiddenCode.value = value;
  teacherValidationRevertOnClose = false;
  closeTeacherValidationModal({ revertRole: false });
  hiddenCode.dispatchEvent(new Event("input", { bubbles: true }));
  hiddenCode.dispatchEvent(new Event("change", { bubbles: true }));
}

function bindCredentialProgress() {
  const shell = document.querySelector("[data-credential-shell]");
  const form = document.querySelector("#eventRegistrationForm");
  if (!shell || !form || form.dataset.credentialBound === "true") return;

  form.dataset.credentialBound = "true";

  const guide = shell.querySelector(".credential-guide");
  const fields = [...form.querySelectorAll("[data-credential-field]")];
  const score = shell.querySelector("[data-credential-score]");
  const summary = shell.querySelector("[data-credential-summary]");
  const next = shell.querySelector("[data-credential-next]");
  const generalStep = shell.querySelector('[data-credential-step="2"]');
  const generalText = shell.querySelector("[data-step-general]");
  const areaStep = shell.querySelector('[data-credential-step="3"]');
  const areaText = shell.querySelector("[data-step-area]");
  const live = form.querySelector("[data-credential-live]");
  const previewName = shell.querySelector("[data-preview-name]");
  const previewRole = shell.querySelector("[data-preview-role]");
  const previewSchool = shell.querySelector("[data-preview-school]");
  const areaCount = Number(shell.dataset.areaCount || 0);

  const update = () => {
    const filled = fields.filter((field) => String(field.value || "").trim()).length;
    const formRatio = fields.length ? filled / fields.length : 1;
    const formDone = formRatio >= 0.72 || shell.dataset.registrationDone === "true";
    const areaDone = areaCount > 0;
    const completed = 2 + (formDone ? 1 : formRatio) + (areaDone ? 1 : 0);
    const percent = Math.round((completed / 4) * 100);

    shell.style.setProperty("--progress", `${percent}%`);
    guide?.style.setProperty("--progress", `${percent}%`);
    if (score) score.textContent = formDone ? "Salva" : "Pendente";
    if (summary) summary.textContent = areaDone ? "Atividade escolhida" : formDone ? "Escolha a atividade em seguida" : "Revise os campos principais";
    if (live) live.textContent = formDone ? "Pode salvar" : "Em edição";

    generalStep?.classList.toggle("is-done", formDone);
    generalStep?.classList.toggle("is-current", !formDone);
    if (generalText) {
      generalText.textContent = formDone ? "Os dados ficam sincronizados automaticamente." : "Preencha os campos principais.";
    }

    areaStep?.classList.toggle("is-done", areaDone);
    if (areaText) {
      areaText.textContent = areaDone ? `${areaCount} atividade(s) na sua inscrição.` : "Escolha uma atividade após salvar.";
    }

    if (next) {
      next.textContent = formDone
        ? areaDone
          ? "Tudo certo para apresentar na entrada."
          : "Falta escolher a atividade."
        : "Confira seus dados e salve a inscrição.";
    }

    if (previewName) previewName.textContent = form.elements.name?.value?.trim() || "Participante";
    if (previewRole) previewRole.textContent = form.elements.role?.value || "Perfil do participante";
    if (previewSchool) previewSchool.textContent = form.elements.institution?.value?.trim() || "Instituição ou escola";
  };

  fields.forEach((field) => {
    field.addEventListener("input", update);
    field.addEventListener("change", update);
  });
  update();
}

function loadRegistrationDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(registrationDraftKey) || "{}");
    delete draft.teacherCardCode;
    if (!sensitiveAccessActive()) {
      delete draft.email;
      delete draft.cpf;
      delete draft.phone;
      delete draft.accessibility;
    }
    localStorage.setItem(registrationDraftKey, JSON.stringify(draft));
    return draft;
  } catch (_error) {
    return {};
  }
}

function bindRegistrationDraft() {
  const form = document.querySelector("#eventRegistrationForm");
  const feedback = form?.querySelector("[data-registration-feedback]");
  if (!form || form.dataset.draftBound === "true") return;
  form.dataset.draftBound = "true";

  const save = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    delete values.acceptedTerms;
    delete values.email;
    delete values.cpf;
    delete values.phone;
    delete values.accessibility;
    delete values.teacherCardCode;
    localStorage.setItem(registrationDraftKey, JSON.stringify(values));
    if (feedback) feedback.textContent = "Dados preservados neste navegador.";
  };

  form.addEventListener("input", save);
  form.addEventListener("change", save);
}

function setRegistrationFeedback(form, message, status = "") {
  const feedback = form?.querySelector("[data-registration-feedback]");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.status = status;
}

function registrationPayload(formElement) {
  const form = new FormData(formElement);
  const payload = Object.fromEntries(form.entries());
  const registration = mainRegistration();
  const sensitiveHidden = Boolean(registration && !sensitiveAccessActive());
  payload.acceptedTerms = ["on", "true"].includes(String(form.get("acceptedTerms")));

  if (!payload.acceptedTerms) return { error: "Confirme a ciência dos documentos legais." };
  if (!sensitiveHidden && payload.phone && String(payload.phone).replace(/\D/g, "").length < 8) {
    return { error: "Informe um telefone válido ou deixe o campo vazio." };
  }
  if (!sensitiveHidden && (!String(payload.email || "").trim() || !String(payload.cpf || "").trim())) {
    return { error: "Informe e-mail e CPF para ativar o salvamento automático." };
  }
  if (!sensitiveHidden && String(payload.cpf || "").replace(/\D/g, "").length !== 11) {
    return { error: "Informe um CPF válido com 11 números." };
  }

  const teacherValidationStatus = registration?.participant?.teacherValidationStatus || "not-requested";
  if (
    payload.role === "Professor(a)" &&
    !["pending", "approved"].includes(teacherValidationStatus) &&
    !String(payload.teacherCardCode || "").trim()
  ) {
    return { error: "Informe o código da CNDB para solicitar o perfil de professor." };
  }

  return { payload };
}

async function saveEventRegistration(formElement, { silent = true } = {}) {
  const result = registrationPayload(formElement);
  if (result.error) {
    setRegistrationFeedback(formElement, result.error, "pending");
    if (!silent) showToast(result.error, "error");
    return false;
  }

  if (registrationAutoSaveBusy) {
    registrationAutoSaveQueued = true;
    return false;
  }

  registrationAutoSaveBusy = true;
  setRegistrationFeedback(formElement, "Salvando alterações...", "saving");

  try {
    const data = await api("/api/registrations/event", {
      method: "POST",
      body: JSON.stringify(result.payload)
    });
    await loadRegistrations();
    localStorage.removeItem(registrationDraftKey);
    formElement.querySelector("[data-registration-next]")?.removeAttribute("hidden");
    setRegistrationFeedback(formElement, "Alterações salvas automaticamente.", "saved");
    if (!silent) showToast(data.message);
    return true;
  } catch (error) {
    setRegistrationFeedback(formElement, error.message, "error");
    if (!silent) showToast(error.message, "error");
    return false;
  } finally {
    registrationAutoSaveBusy = false;
    if (registrationAutoSaveQueued) {
      registrationAutoSaveQueued = false;
      window.clearTimeout(registrationAutoSaveTimer);
      registrationAutoSaveTimer = window.setTimeout(() => saveEventRegistration(formElement), 260);
    }
  }
}

function bindEventRegistrationAutoSave() {
  const form = document.querySelector("#eventRegistrationForm");
  if (!form || form.dataset.autoSaveBound === "true") return;
  form.dataset.autoSaveBound = "true";

  const schedule = (delay = 760) => {
    window.clearTimeout(registrationAutoSaveTimer);
    setRegistrationFeedback(form, "Aguardando você terminar de digitar...", "pending");
    registrationAutoSaveTimer = window.setTimeout(() => saveEventRegistration(form), delay);
  };

  form.addEventListener("input", () => schedule());
  form.addEventListener("change", () => schedule(220));
}

function setProfileSaveStatus(formElement, message, status = "idle") {
  const feedback = formElement?.querySelector("[data-profile-save-status]");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.status = status;
}

function profilePayload(formElement) {
  const form = new FormData(formElement);
  const payload = Object.fromEntries(form.entries());
  const phoneDigits = String(payload.phone || "").replace(/\D/g, "");

  if (!String(payload.name || "").trim()) {
    return { error: "Informe um nome válido para salvar o perfil." };
  }

  if (String(payload.phone || "").includes("@")) {
    return { error: "Telefone deve conter apenas número." };
  }

  if (payload.phone && phoneDigits.length < 8) {
    return { error: "Informe um telefone válido ou deixe em branco." };
  }

  return { payload };
}

function syncProfileDomAfterSave(formElement) {
  if (!state.user) return;
  const displayName = formElement?.querySelector("[data-profile-display-name]");
  if (displayName) displayName.textContent = state.user.name || "Participante";
  if (state.user.avatarUrl) {
    document.querySelectorAll(".user-avatar").forEach((avatar) => {
      avatar.src = state.user.avatarUrl;
    });
  }
}

async function saveProfile(formElement, { silent = true } = {}) {
  const result = profilePayload(formElement);
  if (result.error) {
    setProfileSaveStatus(formElement, result.error, "error");
    if (!silent) showToast(result.error, "error");
    return false;
  }

  if (profileAutoSaveBusy) {
    profileAutoSaveQueued = true;
    setProfileSaveStatus(formElement, "Nova alteração na fila de salvamento...", "pending");
    return false;
  }

  profileAutoSaveBusy = true;
  setProfileSaveStatus(formElement, "Salvando alterações...", "saving");

  try {
    const data = await api("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify(result.payload)
    });
    state.user = data.user;
    renderUserControls();
    syncProfileDomAfterSave(formElement);
    refreshIcons();
    setProfileSaveStatus(
      formElement,
      silent ? "Alterações salvas automaticamente." : "Perfil salvo.",
      "saved"
    );
    if (!silent) showToast(data.message);
    return true;
  } catch (error) {
    setProfileSaveStatus(formElement, error.message, "error");
    if (!silent) showToast(error.message, "error");
    return false;
  } finally {
    profileAutoSaveBusy = false;
    if (profileAutoSaveQueued && document.contains(formElement)) {
      profileAutoSaveQueued = false;
      window.clearTimeout(profileAutoSaveTimer);
      profileAutoSaveTimer = window.setTimeout(() => saveProfile(formElement), 260);
    }
  }
}

function bindProfileAutoSave() {
  const form = document.querySelector("#profileForm");
  if (!form || form.dataset.autoSaveBound === "true") return;
  form.dataset.autoSaveBound = "true";

  const schedule = (delay = 840) => {
    window.clearTimeout(profileAutoSaveTimer);
    setProfileSaveStatus(form, "Aguardando você terminar de editar...", "pending");
    profileAutoSaveTimer = window.setTimeout(() => saveProfile(form), delay);
  };

  form.addEventListener("input", () => schedule());
  form.addEventListener("change", (event) => {
    if (event.target?.id === "avatarPreviewInput") return;
    schedule(240);
  });
}

function institutionCityLabel(institution = {}) {
  return [institution.city, institution.uf].filter(Boolean).join(" - ");
}

function setInstitutionFieldValue(field, institution) {
  const form = field.closest("form");
  const input = field.querySelector('input[name="institution"]');
  const placeInput = field.querySelector('input[name="institutionPlaceId"]');
  const addressInput = field.querySelector('input[name="institutionAddress"]');
  const mapsInput = field.querySelector('input[name="institutionGoogleMapsUri"]');
  const cityInput = form?.querySelector('[name="city"]');
  const status = field.querySelector("[data-institution-status]");
  const panel = field.querySelector("[data-institution-results]");

  if (input) input.value = institution.name || "";
  if (placeInput) placeInput.value = institution.placeId || "";
  if (addressInput) addressInput.value = institution.address || "";
  if (mapsInput) mapsInput.value = institution.googleMapsUri || "";
  if (cityInput) {
    cityInput.value = institution.city || "";
    cityInput.dispatchEvent(new Event("input", { bubbles: true }));
    cityInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (status) {
    const city = institutionCityLabel(institution);
    status.textContent = city
      ? `${city} · INEP ${institution.code || ""}`.trim()
      : "Instituição confirmada pela base INEP/MEC.";
    status.classList.add("is-confirmed");
  }
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
  input?.dispatchEvent(new Event("change", { bubbles: true }));
}

function clearInstitutionOfficialFields(field) {
  field.querySelector('input[name="institutionPlaceId"]')?.setAttribute("value", "");
  field.querySelector('input[name="institutionAddress"]')?.setAttribute("value", "");
  field.querySelector('input[name="institutionGoogleMapsUri"]')?.setAttribute("value", "");
  const placeInput = field.querySelector('input[name="institutionPlaceId"]');
  const addressInput = field.querySelector('input[name="institutionAddress"]');
  const mapsInput = field.querySelector('input[name="institutionGoogleMapsUri"]');
  if (placeInput) placeInput.value = "";
  if (addressInput) addressInput.value = "";
  if (mapsInput) mapsInput.value = "";
  const status = field.querySelector("[data-institution-status]");
  if (status) {
    status.textContent = "Digite ao menos 3 letras para buscar na base INEP/MEC.";
    status.classList.remove("is-confirmed");
  }
}

async function fetchInstitutionSuggestions(query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (institutionLookupCache.has(normalized)) return institutionLookupCache.get(normalized);
  const data = await api(`/api/registrations/institutions/search?q=${encodeURIComponent(query)}`);
  const list = Array.isArray(data.institutions) ? data.institutions : [];
  institutionLookupCache.set(normalized, list);
  return list;
}

function bindPublicInstitutionLookup() {
  document.querySelectorAll("[data-institution-field]").forEach((field) => {
    if (field.dataset.lookupBound === "true") return;
    field.dataset.lookupBound = "true";

    const input = field.querySelector('input[name="institution"]');
    const panel = field.querySelector("[data-institution-results]");
    const status = field.querySelector("[data-institution-status]");
    if (!input || !panel) return;

    let timer = null;
    let requestId = 0;
    let lastOfficialName = input.value.trim();
    let latestSuggestions = [];

    const renderSuggestions = (items) => {
      latestSuggestions = items;
      if (!items.length) {
        panel.hidden = true;
        panel.innerHTML = "";
        if (status && input.value.trim().length >= 3) {
          status.textContent = "Nenhuma escola encontrada na base INEP/MEC para esse texto.";
          status.classList.remove("is-confirmed");
        }
        return;
      }

      panel.hidden = false;
      panel.innerHTML = items
        .map((institution, index) => `
          <button class="institution-choice" type="button" data-institution-index="${index}">
            <strong>${escapeHtml(institution.name)}</strong>
            <span>${escapeHtml(institutionCityLabel(institution) || "Paraíba")} · INEP ${escapeHtml(institution.code || "")}</span>
          </button>
        `)
        .join("");
      if (status) {
        status.textContent = "Selecione a escola correta para preencher a cidade automaticamente.";
        status.classList.remove("is-confirmed");
      }
    };

    const search = async () => {
      const query = input.value.trim();
      if (query.length < 3) {
        panel.hidden = true;
        panel.innerHTML = "";
        if (status && !input.value.trim()) {
          status.textContent = "Digite ao menos 3 letras para buscar na base INEP/MEC.";
        }
        return;
      }

      const currentRequest = ++requestId;
      if (status) status.textContent = "Buscando escolas oficiais...";
      try {
        const suggestions = await fetchInstitutionSuggestions(query);
        if (currentRequest !== requestId) return;
        renderSuggestions(suggestions);
      } catch (_error) {
        if (currentRequest !== requestId) return;
        panel.hidden = true;
        if (status) {
          status.textContent = "Não foi possível consultar a base INEP agora.";
          status.classList.remove("is-confirmed");
        }
      }
    };

    input.addEventListener("input", () => {
      if (input.value.trim() !== lastOfficialName) clearInstitutionOfficialFields(field);
      window.clearTimeout(timer);
      timer = window.setTimeout(search, 260);
    });

    input.addEventListener("focus", () => {
      if (latestSuggestions.length) panel.hidden = false;
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!field.matches(":focus-within")) panel.hidden = true;
      }, 140);
    });

    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-institution-index]");
      if (!button) return;
      const institution = latestSuggestions[Number(button.dataset.institutionIndex)];
      if (!institution) return;
      lastOfficialName = institution.name || "";
      setInstitutionFieldValue(field, institution);
    });
  });
}

function bindAvatarPreview() {
  const input = document.querySelector("#avatarPreviewInput");
  if (!input || input.dataset.bound === "true") return;
  input.dataset.bound = "true";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Escolha uma imagem válida.", "error");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const avatarField = document.querySelector('input[name="avatarUrl"]');
      if (avatarField) {
        avatarField.value = String(reader.result || "");
        avatarField.dispatchEvent(new Event("input", { bubbles: true }));
        avatarField.dispatchEvent(new Event("change", { bubbles: true }));
      }
      document.querySelectorAll(".user-avatar").forEach((avatar) => {
        avatar.src = String(reader.result || "");
      });
      showToast("Foto carregada. Salvando automaticamente...");
    });
    reader.readAsDataURL(file);
  });
}

function bindSubmitForm(selector, handler) {
  const form = document.querySelector(selector);
  if (!form) return;

  if (form.dataset.submitHandlerBound !== "true") {
    form.dataset.submitHandlerBound = "true";
    form.addEventListener("submit", handler);
  }

  const button = form.querySelector('button[type="submit"]');
  if (!button || button.dataset.submitBound === "true") return;

  button.dataset.submitBound = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();

    if (form.reportValidity && !form.reportValidity()) return;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

function bindPasswordMeter() {
  const input = document.querySelector("#passwordInput");
  const meter = document.querySelector("#passwordMeter");
  if (!input || !meter) return;

  input.addEventListener("input", () => {
    const value = input.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    meter.dataset.score = String(score);
    meter.querySelector("small").textContent =
      score >= 4 ? "Senha forte." : score >= 3 ? "Senha boa." : score >= 2 ? "Senha média." : "Use letras e números com pelo menos 8 caracteres.";
  });
}

function bindCheckRows() {
  document.querySelectorAll(".check-row").forEach((row) => {
    const input = row.querySelector('input[type="checkbox"]');
    if (!input) return;
    row.dataset.checkBound = "true";
    row.dataset.lastChecked = String(input.checked);
  });

  if (checkRowsBound) return;
  checkRowsBound = true;

  const resolveCheckRow = (event) => {
    const row = event.target.closest?.(".check-row");
    if (!row || event.target.closest("a")) return null;
    const input = row.querySelector('input[type="checkbox"]');
    if (!input || input.disabled) return null;
    return { row, input };
  };

  const applyChecked = (row, input, checked) => {
    input.checked = checked;
    row.dataset.lastChecked = String(checked);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  document.addEventListener("pointerdown", (event) => {
    const check = resolveCheckRow(event);
    if (!check) return;

    const desired = check.row.dataset.lastChecked !== "true";
    check.row.dataset.pointerDesired = String(desired);
    event.preventDefault();
    applyChecked(check.row, check.input, desired);
  }, true);

  document.addEventListener("click", (event) => {
    const check = resolveCheckRow(event);
    if (!check) return;

    event.preventDefault();

    if (check.row.dataset.pointerDesired) {
      applyChecked(check.row, check.input, check.row.dataset.pointerDesired === "true");
      delete check.row.dataset.pointerDesired;
      return;
    }

    applyChecked(check.row, check.input, check.row.dataset.lastChecked !== "true");
  }, true);
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });
    await clearSensitiveAccess();
    state.user = data.user;
    await loadRegistrations();
    showToast("Entrada realizada.");
    navigate("/inscricao");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    if (form.get("password") !== form.get("confirmPassword")) {
      showToast("As senhas não conferem.", "error");
      return;
    }

    if (form.get("acceptedTerms") !== "on") {
      showToast("Você precisa confirmar a ciência dos documentos legais.", "error");
      return;
    }

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        socialName: form.get("socialName"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        acceptedTerms: form.get("acceptedTerms") === "on"
      })
    });
    await clearSensitiveAccess();
    state.user = data.user;
    await loadRegistrations();
    showToast(data.user.emailVerified ? "Conta criada. Você já está conectado." : "Conta criada. Confirme seu e-mail.");
    navigate("/inscricao");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const data = await api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), audience: "public" })
    });
    showToast(data.message);
    render();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (password !== confirmPassword) {
    showToast("As senhas não conferem.", "error");
    return;
  }

  try {
    await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: state.resetToken,
        password
      })
    });
    state.resetToken = "";
    state.authMode = "login";
    history.replaceState({}, "", "/#/entrar");
    showToast("Senha atualizada.");
    render();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleEventRegistration(event) {
  event.preventDefault();
  window.clearTimeout(registrationAutoSaveTimer);
  await saveEventRegistration(event.currentTarget, { silent: false });
}

async function handleAreaRegistration(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  const form = new FormData(formEl);
  const details = Object.fromEntries(form.entries());

  try {
    const data = await api(`/api/registrations/areas/${formEl.dataset.area}`, {
      method: "POST",
      body: JSON.stringify({ details })
    });
    await loadRegistrations();
    showToast(data.message);
    closeAreaRegistrationModal({ skipFocus: true });
    navigate("/ingressos");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleResendVerification() {
  try {
    const data = await api("/api/auth/resend-verification", { method: "POST", body: "{}" });
    showToast(data.message);
    render();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  window.clearTimeout(profileAutoSaveTimer);
  await saveProfile(event.currentTarget, { silent: false });
}

async function handleDeleteAccount(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const confirmed = await showConfirmModal(
    "Excluir conta permanentemente",
    "Sua conta, inscrições e credenciais serão apagadas. Esta ação não pode ser desfeita."
  );
  if (!confirmed) return;

  try {
    const data = await api("/api/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ password: form.get("password") })
    });
    await clearSensitiveAccess();
    state.user = null;
    state.registrations = [];
    showToast(data.message);
    navigate("/");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function unlockSensitiveAccess() {
  if (!state.user) return false;
  const password = await showPasswordModal("Ver dados protegidos", "Digite sua senha para liberar seus dados por 5 minutos.");
  if (!password) return;

  try {
    const data = await api("/api/auth/sensitive-access", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    state.sensitiveAccessToken = data.sensitiveAccessToken;
    state.sensitiveAccessExpiresAt = Date.now() + Number(data.expiresInSeconds || 300) * 1000;
    window.clearTimeout(sensitiveAccessTimer);
    sensitiveAccessTimer = window.setTimeout(() => clearSensitiveAccess(true), Number(data.expiresInSeconds || 300) * 1000);
    await loadMe();
    showToast("Dados protegidos liberados por 5 minutos.");
    render();
    return true;
  } catch (error) {
    showToast("Senha incorreta. Os dados continuam protegidos.", "error");
    return false;
  }
}

async function handleProfileSensitiveToggle() {
  if (!sensitiveAccessActive()) {
    await unlockSensitiveAccess();
    return;
  }
  await clearSensitiveAccess(true);
  showToast("Dados sensíveis ocultados.");
}

async function handleLogout() {
  const confirmed = await showConfirmModal("Encerrar sessão", "Tem certeza que deseja sair da sua conta?");
  if (!confirmed) return;
  await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
  await clearSensitiveAccess();
  state.user = null;
  state.registrations = [];
  showToast("Sessão encerrada.");
  navigate("/");
}

let lastRenderedState = { route: "", authMode: "" };
let isRendering = false;
function render() {
  if (isRendering) return;
  isRendering = true;
  const current = route();
  document.documentElement.toggleAttribute("data-reset-flow", Boolean(state.resetToken));

  if (current === "/entrar" && lastRenderedState.route === "/entrar" && state.authMode === lastRenderedState.authMode) {
    isRendering = false;
    return;
  }
  
  const routeChanged = current !== lastRenderedState.route;
  lastRenderedState.route = current;
  lastRenderedState.authMode = state.authMode;
  document.documentElement.dataset.currentRoute = current.replace(/[^\w-]+/g, "-") || "home";
  document.documentElement.removeAttribute("data-route");
  updateDocumentTitle(current);
  renderUserControls();

  if (current === "/entrar") renderAuthPage();
  else if (current === "/inscricao") renderRegistrationPage();
  else if (current === "/areas") renderAreasPage();
  else if (current.startsWith("/areas/")) renderAreaDetail(current.split("/").pop());
  else if (current === "/galeria") renderGalleryPage();
  else if (current === "/creditos" || current === "/legal/creditos") renderLegalPage("creditos");
  else if (current === "/termos" || current === "/legal/termos") renderLegalPage("termos");
  else if (current === "/privacidade" || current === "/legal/privacidade") renderLegalPage("privacidade");
  else if (current === "/ingressos") renderTicketsPage();
  else if (current === "/cronograma") renderSchedulePage();
  else if (current === "/faq") renderFaqPage();
  else if (current === "/palestrantes") renderSpeakersPage();
  else if (current.startsWith("/palestrantes/")) renderSpeakerDetail(current.split("/").pop());
  else if (current === "/perfil") renderProfilePage();
  else if (current === "/credenciamento" || current === "/admin") window.location.replace("/funcionarios/");
  else {
    document.documentElement.removeAttribute("data-reset-flow");
    renderHome();
    initCountdown();
  }

  if (routeChanged) {
    if (lightboxEl?.classList.contains("is-open")) closeLightbox();
    if (speakerModal?.classList.contains("is-open")) closeSpeakerModal();
    if (areaRegistrationModal?.classList.contains("is-open")) closeAreaRegistrationModal({ skipFocus: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  bindForms();
  syncNavigation();
  closeMobileMenu();
  
  refreshIcons();
  initGoogleAuthButtons();
  setupScrollAnimations();

  // Init new features
  initParticles();
  initTypewriter();

  bindFaqAccordions();
  bindScheduleTabs();
  bindGalleryFilters();
  if (publicTourActive) {
    window.setTimeout(renderPublicTourStep, 80);
  }

  // Gallery lightbox click handler
  document.querySelectorAll("[data-gallery-index]").forEach((img) => {
    img.addEventListener("click", () => {
      const images = visibleGallery().filter((image) => image.src);
      openLightbox(images, parseInt(img.dataset.galleryIndex, 10));
    });
  });

  // Area search handler
  const searchInput = document.querySelector("#areaSearchInput");
  if (searchInput) {
    bindAreaSearch(searchInput);
  }

  bindFaqSearch();

  // Share tickets handler
  document.querySelector("#shareTickets")?.addEventListener("click", () => {
    shareContent("Minhas credenciais SIMITEC", "Credenciais de participação na SIMITEC.", window.location.href);
  });
  document.querySelectorAll("[data-copy-ticket]").forEach((button) => {
    button.addEventListener("click", () => copyTicketCode(button.dataset.copyTicket || ""));
  });
  document.querySelectorAll("[data-share-ticket]").forEach((button) => {
    button.addEventListener("click", () => shareTicket(button.dataset.shareTicket || ""));
  });
  document.querySelectorAll(".user-avatar").forEach((avatar) => {
    avatar.addEventListener("error", () => {
      avatar.src = "/assets/avatar-default.svg";
    }, { once: true });
  });

  requestAnimationFrame(() => {
    window.clearTimeout(pageEnterTimer);
    app.classList.remove("is-leaving");
    app.classList.add("is-entering");
    pageEnterTimer = window.setTimeout(() => {
      app.classList.remove("is-entering");
      pageEnterTimer = null;
    }, 860);
  });
  isRendering = false;
}

function bindGalleryFilters() {
  document.querySelectorAll("[data-gallery-scope]").forEach((scope) => {
    const buttons = [...scope.querySelectorAll("[data-gallery-filter]")];
    const groups = [...scope.querySelectorAll("[data-gallery-year-group]")];
    if (!buttons.length || !groups.length) return;

    const applyFilter = (filter) => {
      buttons.forEach((button) => {
        const active = button.dataset.galleryFilter === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      groups.forEach((group) => {
        const visible = filter === "all" || group.dataset.galleryYearGroup === filter;
        group.hidden = !visible;
        group.setAttribute("aria-hidden", String(!visible));
      });
    };

    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const filter = button.dataset.galleryFilter || "all";
        if (document.startViewTransition) {
          document.startViewTransition(() => applyFilter(filter));
        } else {
          applyFilter(filter);
        }
      });
    });
  });
}

function bindAreaSearch(searchInput) {
  const cards = [...document.querySelectorAll(".area-card")];
  const summary = document.querySelector("#areaSearchSummary");
  const empty = document.querySelector("#areaEmptyState");
  const clear = document.querySelector("#areaSearchClear");
  const tagFilter = document.querySelector("#areaTagFilter");
  const sortSelect = document.querySelector("#areaSortSelect");
  const grid = document.querySelector(".area-grid");

  const update = () => {
    const query = searchInput.value.trim().toLowerCase();
    const tag = tagFilter?.value || "all";
    let visible = 0;
    cards.forEach((card) => {
      const matchQuery = card.textContent.toLowerCase().includes(query);
      const matchTag = tag === "all" || card.querySelector(".tag")?.textContent.trim().includes(tag);
      const match = matchQuery && matchTag;
      card.hidden = !match;
      if (match) visible += 1;
    });
    if (grid && sortSelect) {
      const sorted = [...cards].sort((a, b) => {
        const titleA = a.querySelector("h3")?.textContent || "";
        const titleB = b.querySelector("h3")?.textContent || "";
        const seatsA = Number(a.dataset.seats || 0);
        const seatsB = Number(b.dataset.seats || 0);
        if (sortSelect.value === "name") return titleA.localeCompare(titleB, "pt-BR");
        if (sortSelect.value === "seats-desc") return seatsB - seatsA;
        if (sortSelect.value === "seats-asc") return seatsA - seatsB;
        return Number(a.dataset.index || 0) - Number(b.dataset.index || 0);
      });
      sorted.forEach((card) => grid.appendChild(card));
    }
    if (summary) summary.textContent = query
      ? `${visible} ${visible === 1 ? "atividade encontrada" : "atividades encontradas"}`
      : `${visible} ${visible === 1 ? "atividade disponível" : "atividades disponíveis"}`;
    if (empty) empty.hidden = visible !== 0;
    clear?.classList.toggle("is-visible", Boolean(query));
  };

  searchInput.addEventListener("input", update);
  tagFilter?.addEventListener("change", update);
  sortSelect?.addEventListener("change", update);
  clear?.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    update();
  });
  update();
}

function bindFaqSearch() {
  const input = document.querySelector("#faqSearchInput");
  if (!input) return;
  const reset = document.querySelector("#faqReset");
  const summary = document.querySelector("#faqSearchSummary");
  const empty = document.querySelector("#faqEmptyState");
  const panels = [...document.querySelectorAll("[data-faq-panel]")];
  const groups = [...document.querySelectorAll("[data-faq-group]")];
  const expandAll = document.querySelector("#faqExpandAll");

  const update = () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    panels.forEach((panel) => {
      const match = panel.textContent.toLowerCase().includes(query);
      panel.hidden = !match;
      if (match) visible += 1;
    });
    groups.forEach((group) => {
      const hasVisible = [...group.querySelectorAll("[data-faq-panel]")].some((panel) => !panel.hidden);
      group.hidden = !hasVisible;
    });
    if (summary) summary.textContent = query
      ? `${visible} ${visible === 1 ? "dúvida encontrada" : "dúvidas encontradas"}`
      : `${visible} ${visible === 1 ? "dúvida disponível" : "dúvidas disponíveis"}`;
    if (empty) empty.hidden = visible !== 0;
    reset?.classList.toggle("is-disabled", !query);
    if (reset) reset.disabled = !query;
  };

  input.addEventListener("input", update);
  reset?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    update();
  });
  update();
  expandAll?.addEventListener("click", () => {
    const shouldOpen = !panels.every((panel) => panel.classList.contains("is-open"));
    panels.filter((panel) => !panel.hidden).forEach((panel) => {
      if (shouldOpen) {
        typeFaqAnswer(panel);
      } else {
        stopFaqTyping(panel, true);
      }
      panel.classList.toggle("is-open", shouldOpen);
      panel.querySelector("[data-faq-toggle]")?.setAttribute("aria-expanded", String(shouldOpen));
    });
    expandAll.textContent = shouldOpen ? "Fechar todas" : "Abrir todas";
  });
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const input = document.querySelector(`#${CSS.escape(button.dataset.passwordToggle)}`);
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      button.innerHTML = `<i data-lucide="${showing ? "eye" : "eye-off"}"></i>`;
      refreshIcons();
    });
  });

  const password = document.querySelector("#passwordInput") || document.querySelector("#resetPasswordInput");
  const confirm = document.querySelector("#confirmPassword") || document.querySelector("#resetConfirmPasswordInput");
  const hint = document.querySelector("#passwordMatchHint");
  if (password && confirm && hint) {
    const update = () => {
      const matches = confirm.value && password.value === confirm.value;
      hint.textContent = matches ? "As senhas coincidem." : "Repita a mesma senha.";
      hint.classList.toggle("is-valid", Boolean(matches));
    };
    password.addEventListener("input", update);
    confirm.addEventListener("input", update);
    update();
  }
}

async function copyTicketCode(code) {
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    showToast("Código copiado.");
  } catch (_error) {
    const helper = document.createElement("textarea");
    helper.value = code;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    showToast(copied ? "Código copiado." : "Não foi possível copiar o código.", copied ? "success" : "error");
  }
}

function shareTicket(id) {
  const registration = state.registrations.find((item) => String(item._id) === String(id));
  if (!registration) return;
  shareContent(
    `Credencial ${registration.activityTitle}`,
    `Minha credencial para ${registration.activityTitle}: ${registration.ticketCode}`,
    window.location.href
  );
}

function bindFaqAccordions() {
  document.querySelectorAll("[data-faq-toggle]").forEach((button) => {
    if (button.dataset.faqBound === "true") return;

    button.dataset.faqBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const panel = button.closest("[data-faq-panel]");
      if (!panel) return;

      const grid = panel.closest(".faq-grid");
      const willOpen = !panel.classList.contains("is-open");

      grid?.querySelectorAll("[data-faq-panel].is-open").forEach((openPanel) => {
        if (openPanel === panel) return;
        stopFaqTyping(openPanel, true);
        openPanel.classList.remove("is-open");
        openPanel.querySelector("[data-faq-toggle]")?.setAttribute("aria-expanded", "false");
      });

      if (willOpen) {
        typeFaqAnswer(panel);
      } else {
        stopFaqTyping(panel, true);
      }
      panel.classList.toggle("is-open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
    });
  });
}

function stopFaqTyping(panel, restoreText = false) {
  const timer = faqTypingTimers.get(panel);
  if (timer) {
    window.clearTimeout(timer);
    faqTypingTimers.delete(panel);
  }

  const answer = panel.querySelector("[data-faq-answer-text]");
  if (!answer) return;
  answer.classList.remove("is-typing");
  if (restoreText) answer.textContent = answer.dataset.faqAnswerText || "";
}

function typeFaqAnswer(panel) {
  const answer = panel.querySelector("[data-faq-answer-text]");
  if (!answer) return;

  const fullText = answer.dataset.faqAnswerText || "";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    answer.textContent = fullText;
    return;
  }

  stopFaqTyping(panel);
  answer.textContent = "";
  answer.classList.add("is-typing");

  let index = 0;
  const typeNext = () => {
    index += 1;
    answer.textContent = fullText.slice(0, index);

    if (index >= fullText.length) {
      answer.classList.remove("is-typing");
      faqTypingTimers.delete(panel);
      return;
    }

    const current = fullText[index - 1];
    const delay = /[.!?]/.test(current) ? 220 : /[,;]/.test(current) ? 120 : 30;
    faqTypingTimers.set(panel, window.setTimeout(typeNext, delay));
  };

  faqTypingTimers.set(panel, window.setTimeout(typeNext, 120));
}

function setupScrollAnimations() {
  scrollRevealObserver?.disconnect();
  sectionRevealObserver?.disconnect();
  scrollRevealObserver = null;
  sectionRevealObserver = null;
  if (!document.querySelector(".legal-page")) {
    legalTocObserver?.disconnect();
    legalTocObserver = null;
  }

  const sections = [...document.querySelectorAll("#app > section, .footer")];
  const revealSelectors = [
    ".page-title",
    ".section-heading",
    ".content-grid > *",
    ".panel",
    ".area-card",
    ".area-visual",
    ".schedule-tab",
    ".schedule-sheet",
    ".gallery-year-heading",
    ".gallery-year-group",
    ".gallery-grid figure",
    ".timeline-item",
    ".ticket-card",
    ".faq-panel",
    ".speaker-card",
    ".credential-step",
    ".credential-next",
    ".credential-preview",
    ".details-panel li",
    ".legal-card",
    ".footer-grid > *"
  ];
  const elements = [...new Set(revealSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];

  sections.forEach((section, index) => {
    section.classList.add("scroll-section");
    section.style.setProperty("--section-index", String(index));
    section.classList.add("is-section-visible");
  });

  elements.forEach((el) => el.classList.add("reveal-item", "is-visible"));
}

function revealVariantFor(el, index) {
  if (el.matches(".section-heading, .page-title, .gallery-year-heading")) return "reveal-left";
  if (el.matches(".area-visual, .gallery-grid figure, .credential-preview")) return "reveal-zoom";
  if (el.matches(".schedule-tab, .credential-step, .details-panel li")) return "reveal-pop";
  if (el.matches(".content-grid > *") && index % 2 === 1) return "reveal-right";
  if (el.matches(".panel, .area-card, .ticket-card, .faq-panel, .speaker-card")) return "reveal-lift";
  return "reveal-soft";
}

function updateLegalTocCurrent(sectionId) {
  document.querySelectorAll("[data-legal-section-link][aria-current]").forEach((link) => {
    link.removeAttribute("aria-current");
  });
  document.querySelectorAll(`[data-legal-section-link][href="#${CSS.escape(sectionId)}"]`).forEach((link) => {
    link.setAttribute("aria-current", "true");
  });
}

function scrollToLegalSection(sectionId, options = {}) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  history.replaceState({}, "", `${location.pathname}#${sectionId}`);
  updateLegalTocCurrent(sectionId);

  if (!options.skipHighlight) {
    target.classList.remove("is-target-highlight");
    window.setTimeout(() => target.classList.add("is-target-highlight"), 20);
    window.setTimeout(() => target.classList.remove("is-target-highlight"), 1600);
  }

  window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 220);
}

async function copyLegalSectionLink(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const cleanUrl = `${location.origin}${location.pathname}#${sectionId}`;
  try {
    await navigator.clipboard.writeText(cleanUrl);
  } catch (_error) {
    const helper = document.createElement("textarea");
    helper.value = cleanUrl;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  target.classList.add("is-target-highlight");
  window.setTimeout(() => target.classList.remove("is-target-highlight"), 1600);
  showToast("Link da seção copiado.");
}

function setupLegalReadingTools() {
  legalTocObserver?.disconnect();
  legalTocObserver = null;

  const legalPage = document.querySelector(".legal-page");
  if (!legalPage) return;

  const sections = [...document.querySelectorAll(".legal-card[id]")];
  if (!sections.length) return;

  const initialId = location.hash?.startsWith("#legal-") ? location.hash.slice(1) : sections[0].id;
  updateLegalTocCurrent(initialId);

  if (location.hash?.startsWith("#legal-")) {
    window.requestAnimationFrame(() => scrollToLegalSection(location.hash.slice(1), { skipHighlight: true }));
  }

  legalTocObserver = new IntersectionObserver(() => {
    const activationLine = window.innerHeight * 0.32;
    const active = [...document.querySelectorAll(".legal-card[id]")]
      .map((section) => ({ id: section.id, top: section.getBoundingClientRect().top }))
      .filter((section) => section.top <= activationLine)
      .pop();
    updateLegalTocCurrent(active?.id || sections[0].id);
  }, { rootMargin: "-22% 0px -62% 0px", threshold: [0.08, 0.24, 0.48] });

  sections.forEach((section) => legalTocObserver.observe(section));
  updateLegalReadingProgress();
}

/* ===== HERO PERFORMANCE ===== */
function initParticles() {
  const container = document.querySelector(".hero-particles");
  container?.replaceChildren();
}

/* ===== SCROLL PROGRESS ===== */
function updateLegalReadingProgress() {
  const bar = document.querySelector("#legalReadingProgressBar");
  const page = document.querySelector(".legal-page");
  if (!bar || !page) return;

  const rect = page.getBoundingClientRect();
  const readableHeight = Math.max(page.offsetHeight - window.innerHeight, 1);
  const scrolledInside = Math.min(Math.max(-rect.top, 0), readableHeight);
  const progress = (scrolledInside / readableHeight) * 100;
  bar.style.width = `${progress}%`;
}

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  if (scrollProgressBar) scrollProgressBar.style.width = `${progress}%`;
  updateLegalReadingProgress();
  topbar?.classList.toggle("is-scrolled", scrollTop > 12);
  backToTopButton?.classList.toggle("is-visible", scrollTop > 520);

}

function requestScrollProgressUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    updateScrollProgress();
    scrollTicking = false;
  });
}

window.addEventListener("scroll", requestScrollProgressUpdate, { passive: true });
updateScrollProgress();
backToTopButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

/* ===== LIGHTBOX ===== */
function openLightbox(images, index) {
  lightboxImages = images;
  lightboxIndex = index;
  updateLightbox();
  lightboxEl.classList.add("is-open");
  lightboxEl.setAttribute("aria-hidden", "false");
  lightboxEl.setAttribute("aria-modal", "true");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightboxEl.classList.remove("is-open");
  lightboxEl.setAttribute("aria-hidden", "true");
  lightboxEl.removeAttribute("aria-modal");
  document.body.style.overflow = "";
}

function updateLightbox() {
  const img = lightboxImages[lightboxIndex];
  if (!img) return;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || "";
  lightboxCaption.textContent = `${lightboxIndex + 1} de ${lightboxImages.length} · ${img.caption || img.alt || ""}`;
  preloadLightboxNeighbor(lightboxIndex + 1);
  preloadLightboxNeighbor(lightboxIndex - 1);
}

function preloadLightboxNeighbor(index) {
  if (!lightboxImages.length) return;
  const normalized = (index + lightboxImages.length) % lightboxImages.length;
  const next = lightboxImages[normalized];
  if (!next?.src) return;
  const image = new Image();
  image.src = next.src;
}

document.querySelector("#lightboxClose")?.addEventListener("click", closeLightbox);
document.querySelector("#lightboxPrev")?.addEventListener("click", () => {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightbox();
});
document.querySelector("#lightboxNext")?.addEventListener("click", () => {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  updateLightbox();
});
document.addEventListener("keydown", (e) => {
  if (teacherValidationModal?.classList.contains("is-open")) {
    if (e.key === "Escape") closeTeacherValidationModal();
    return;
  }

  if (areaRegistrationModal?.classList.contains("is-open")) {
    if (e.key === "Escape") closeAreaRegistrationModal();
    return;
  }

  if (speakerModal?.classList.contains("is-open")) {
    if (e.key === "Escape") closeSpeakerModal();
    return;
  }
  if (!lightboxEl?.classList.contains("is-open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; updateLightbox(); }
  if (e.key === "ArrowRight") { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; updateLightbox(); }
});
lightboxEl?.addEventListener("click", (e) => {
  if (e.target === lightboxEl) closeLightbox();
});
speakerModal?.addEventListener("click", (event) => {
  if (event.target === speakerModal) closeSpeakerModal();
});
areaRegistrationModal?.addEventListener("click", (event) => {
  if (event.target === areaRegistrationModal) closeAreaRegistrationModal();
});
teacherValidationModal?.addEventListener("click", (event) => {
  if (event.target === teacherValidationModal) closeTeacherValidationModal();
});

let lightboxTouchStartX = 0;
lightboxEl?.addEventListener("touchstart", (event) => {
  lightboxTouchStartX = event.changedTouches[0]?.clientX || 0;
}, { passive: true });
lightboxEl?.addEventListener("touchend", (event) => {
  const endX = event.changedTouches[0]?.clientX || 0;
  const delta = endX - lightboxTouchStartX;
  if (Math.abs(delta) < 48 || !lightboxImages.length) return;
  lightboxIndex = delta > 0
    ? (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length
    : (lightboxIndex + 1) % lightboxImages.length;
  updateLightbox();
}, { passive: true });

/* ===== CONFIRMATION MODAL ===== */
function showConfirmModal(title, message, confirmText = "Confirmar", cancelText = "Cancelar") {
  return new Promise((resolve) => {
    modalResolve = resolve;
    document.querySelector("#modalTitle").textContent = title;
    document.querySelector("#modalMessage").innerHTML = message;
    
    const confirmBtn = document.querySelector("#modalConfirm");
    const cancelBtn = document.querySelector("#modalCancel");
    
    if (confirmBtn) confirmBtn.textContent = confirmText;
    if (cancelBtn) {
      cancelBtn.textContent = cancelText;
      cancelBtn.style.display = cancelText ? "inline-block" : "none";
    }
    
    confirmModal.classList.add("is-open");
    confirmModal.setAttribute("aria-hidden", "false");
  });
}

function showPasswordModal(title, message) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    document.querySelector("#modalTitle").textContent = title;
    document.querySelector("#modalMessage").innerHTML = `
      <span>${escapeHtml(message)}</span>
      <label class="modal-password-field">
        <span>Senha</span>
        <input id="modalPasswordInput" type="password" autocomplete="current-password" />
      </label>
    `;

    const confirmBtn = document.querySelector("#modalConfirm");
    const cancelBtn = document.querySelector("#modalCancel");
    if (confirmBtn) confirmBtn.textContent = "Mostrar";
    if (cancelBtn) {
      cancelBtn.textContent = "Cancelar";
      cancelBtn.style.display = "inline-block";
    }

    confirmModal.classList.add("is-open");
    confirmModal.setAttribute("aria-hidden", "false");
    window.setTimeout(() => document.querySelector("#modalPasswordInput")?.focus(), 60);
  });
}

async function openLegalModal(url, title) {
  try {
    const response = await fetch(url);
    let html = await response.text();
    
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      html = bodyMatch[1];
    }
    
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    
    showConfirmModal(title, html, "Fechar", "");
  } catch (error) {
    showToast("Não foi possível carregar o conteúdo.", "error");
  }
}

document.querySelector("#modalConfirm")?.addEventListener("click", () => {
  const passwordInput = document.querySelector("#modalPasswordInput");
  const value = passwordInput ? passwordInput.value : true;
  confirmModal.classList.remove("is-open");
  confirmModal.setAttribute("aria-hidden", "true");
  if (modalResolve) { modalResolve(value); modalResolve = null; }
});
document.querySelector("#modalCancel")?.addEventListener("click", () => {
  confirmModal.classList.remove("is-open");
  confirmModal.setAttribute("aria-hidden", "true");
  if (modalResolve) { modalResolve(false); modalResolve = null; }
});

/* ===== TYPEWRITER ===== */
function initTypewriter() {
  const el = document.querySelector(".typewriter");
  if (!el) return;
  el.textContent = el.dataset.text || el.textContent || "";
}

/* ===== SHARE ===== */
async function shareContent(title, text, url) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); } catch (_e) { /* cancelled */ }
  } else {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      showToast("Link copiado!");
    } catch (_e) {
      showToast("Não foi possível compartilhar.", "error");
    }
  }
}

/* ===== SKELETON ===== */
function renderSkeleton() {
  return `
    <div class="skeleton">
      <div class="skeleton-block lg"></div>
      <div class="skeleton-block md"></div>
      <div class="skeleton-block sm"></div>
      <div class="skeleton-grid">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    </div>
  `;
}

function updateDocumentTitle(current) {
  const edition = currentEventEdition();
  const normalizedLegalRoute = current.replace(/^\/legal\//, "/");
  const legalPage = legalPages
    ? normalizedLegalRoute === "/termos"
      ? legalPages.termos
      : normalizedLegalRoute === "/privacidade"
        ? legalPages.privacidade
        : normalizedLegalRoute === "/creditos"
          ? legalPages.creditos
          : null
    : null;
  const titles = {
    "/": edition,
    "/entrar": "Acesso",
    "/inscricao": "Credenciamento",
    "/areas": "Áreas de participação",
    "/cronograma": "Cronograma",
    "/faq": "Dúvidas frequentes",
    "/palestrantes": "Palestras e oficinas",
    "/galeria": "Galeria",
    "/ingressos": "Credenciais",
    "/perfil": "Meu perfil",
    "/creditos": "Créditos",
    "/termos": "Termos",
    "/privacidade": "Privacidade"
  };
  const label = current.startsWith("/areas/")
    ? "Área de participação"
    : current.startsWith("/palestrantes/")
      ? "Detalhes da atividade"
      : titles[normalizedLegalRoute] || titles[current] || "SIMITEC";
  document.title = current === "/" ? edition : `${label} | ${edition}`;

  const description = legalPage?.description
    || "SIMITEC — Semana de Inovação e Metodologias Integradas a Tecnologias. Inscreva-se para trilhas tecnológicas, feira de ciências, oficinas, cosplay e muito mais na ECIT Márcia Guedes em Belém-PB.";
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', document.title);
  setMetaContent('meta[name="twitter:title"]', document.title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[name="twitter:description"]', description);
  setCanonicalPath(current === "/" ? "/" : current);
}

function captureAuthDraft() {
  const form = document.querySelector("#loginForm, #registerForm, #forgotForm, #resetForm");
  if (!form) return;

  const draft = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"][name]').forEach((input) => {
    draft[input.name] = input.checked;
  });
  state.authDraft = { ...(state.authDraft || {}), ...draft };
}

document.addEventListener("click", async (event) => {
  // Central de cliques do site publico.
  // A ideia e simples: todo botao importante cai aqui, evitando mil onclick espalhados.
  if (event.target.closest("[data-teacher-modal-confirm]")) {
    event.preventDefault();
    confirmTeacherValidationModal();
    return;
  }

  if (event.target.closest("[data-teacher-modal-close]")) {
    event.preventDefault();
    closeTeacherValidationModal();
    return;
  }

  const areaModalTrigger = event.target.closest("[data-area-modal-open]");
  if (areaModalTrigger) {
    event.preventDefault();
    openAreaRegistrationModal(areaModalTrigger.dataset.areaModalOpen, areaModalTrigger);
    return;
  }

  if (event.target.closest("[data-area-modal-close]")) {
    event.preventDefault();
    closeAreaRegistrationModal();
    return;
  }

  const speakerModalTrigger = event.target.closest("[data-speaker-modal]");
  if (speakerModalTrigger) {
    event.preventDefault();
    openSpeakerModal(speakerModalTrigger.dataset.speakerModal, speakerModalTrigger);
    return;
  }

  if (event.target.closest("[data-speaker-modal-close]")) {
    event.preventDefault();
    closeSpeakerModal();
    return;
  }

  const profileToggle = event.target.closest("#profileToggle");
  if (profileToggle) {
    event.preventDefault();
    const menu = profileToggle.closest("#profileMenu");
    const isOpen = !menu?.classList.contains("is-open");
    menu?.classList.toggle("is-open", isOpen);
    profileToggle.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  if (!event.target.closest("#profileMenu")) {
    document.querySelector("#profileMenu")?.classList.remove("is-open");
    document.querySelector("#profileToggle")?.setAttribute("aria-expanded", "false");
  }

  if (event.target.closest("[data-start-public-tour]")) {
    event.preventDefault();
    document.querySelector("#profileMenu")?.classList.remove("is-open");
    document.querySelector("#profileToggle")?.setAttribute("aria-expanded", "false");
    startPublicTour();
    return;
  }

  if (event.target.closest("[data-profile-sensitive-toggle], [data-profile-email-toggle]")) {
    event.preventDefault();
    handleProfileSensitiveToggle();
    return;
  }

  if (event.target.closest("[data-sensitive-unlock]")) {
    event.preventDefault();
    await unlockSensitiveAccess();
    return;
  }

  if (event.target.closest("#menuToggle")) {
    const willOpen = !mainNav.classList.contains("is-open");
    mainNav.classList.toggle("is-open", willOpen);
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    menuToggle.setAttribute("aria-label", willOpen ? "Fechar menu" : "Abrir menu");
    return;
  }

  if (event.target.closest("#themeToggle")) {
    event.preventDefault();
    toggleTheme();
    return;
  }

  if (event.target.closest("[data-google-login]")) {
    event.preventDefault();
    startGoogleLogin();
    return;
  }

  if (event.target.closest("[data-legal-scroll-top]")) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return;
  }

  const legalSectionLink = event.target.closest("[data-legal-section-link]");
  if (legalSectionLink) {
    event.preventDefault();
    const targetId = legalSectionLink.getAttribute("href")?.replace("#", "");
    if (targetId) scrollToLegalSection(targetId);
    return;
  }

  const legalCopyButton = event.target.closest("[data-copy-section]");
  if (legalCopyButton) {
    event.preventDefault();
    await copyLegalSectionLink(legalCopyButton.dataset.copySection);
    return;
  }

  const clickedFormField = event.target.closest("input, textarea, select, option, [contenteditable='true']");
  const clickedExplicitAction = event.target.closest("button[data-route], a[data-route], button[data-auth-mode], a[data-auth-mode], #logoutButton, #themeToggle, button, a");
  if (clickedFormField && !clickedExplicitAction) {
    return;
  }

  const authModeButton = event.target.closest("button[data-auth-mode], a[data-auth-mode]");
  if (authModeButton) {
    captureAuthDraft();
    state.authMode = authModeButton.dataset.authMode;
  }

  const routeButton = event.target.closest("button[data-route], a[data-route]");
  if (routeButton) {
    event.preventDefault();
    const nextRoute = routeButton.dataset.route;
    navigate(nextRoute, { force: Boolean(authModeButton) && route() === nextRoute });
  } else if (authModeButton) {
    event.preventDefault();
    render();
  }

  if (event.target.closest("#logoutButton")) {
    event.preventDefault();
    await handleLogout();
  }

  if (!event.target.closest(".topbar")) {
    closeMobileMenu();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.sensitiveAccessToken && !sensitiveAccessActive()) {
    clearSensitiveAccess(true);
  }
});

window.addEventListener("hashchange", () => {
  if (lightboxEl?.classList.contains("is-open")) closeLightbox();
  if (speakerModal?.classList.contains("is-open")) closeSpeakerModal();
  if (areaRegistrationModal?.classList.contains("is-open")) closeAreaRegistrationModal({ skipFocus: true });
  if (teacherValidationModal?.classList.contains("is-open")) closeTeacherValidationModal({ skipFocus: true });
  render();
});

window.addEventListener("popstate", () => {
  if (lightboxEl?.classList.contains("is-open")) closeLightbox();
  if (speakerModal?.classList.contains("is-open")) closeSpeakerModal();
  if (areaRegistrationModal?.classList.contains("is-open")) closeAreaRegistrationModal({ skipFocus: true });
  if (teacherValidationModal?.classList.contains("is-open")) closeTeacherValidationModal({ skipFocus: true });
  render();
});

async function init() {
  const params = new URLSearchParams(location.search);
  state.resetToken = params.get("reset") || "";

  initTheme();
  app.innerHTML = renderSkeleton();
  
  await loadEvent();
  await loadMe();

  if (params.get("verified") === "1") {
    showToast("E-mail confirmado. Suas inscrições já estão liberadas.");
    history.replaceState({}, "", "/#/inscricao");
  }

  if (params.get("verified") === "invalid") {
    showToast("Link de confirmação inválido ou expirado.", "error");
  }

  if (state.resetToken) {
    state.authMode = "forgot";
    if (route() !== "/entrar") navigate("/entrar");
  }

  render();
  startPublicAutoSync();
}

init().catch((error) => {
  app.innerHTML = `
    <section class="page-title compact">
      <h1>Não foi possível carregar o site.</h1>
      <p>${escapeHtml(error.message)}</p>
    </section>
  `;
});



