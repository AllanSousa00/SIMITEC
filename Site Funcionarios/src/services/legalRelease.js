const REQUIRED_PRODUCTION_LEGAL_FIELDS = [
  "LEGAL_RELEASE_APPROVED",
  "LEGAL_CONTROLLER_NAME",
  "LEGAL_PRIVACY_CONTACT"
];

export const LEGAL_DOCUMENT_VERSION = "2026-07-31";

export function assertProductionLegalRelease() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_PRODUCTION_LEGAL_FIELDS.filter((name) => {
    const value = String(process.env[name] || "").trim();
    return !value || (name === "LEGAL_RELEASE_APPROVED" && value.toLowerCase() !== "true");
  });

  if (!missing.length) return;

  throw new Error(
    `Publicacao bloqueada: configure ${missing.join(", ")} antes de iniciar em producao.`
  );
}

export function legalAcceptanceFields(acceptedAt = new Date()) {
  return {
    acceptedTermsAt: acceptedAt,
    acceptedTermsVersion: LEGAL_DOCUMENT_VERSION,
    acceptedPrivacyAt: acceptedAt,
    acceptedPrivacyVersion: LEGAL_DOCUMENT_VERSION
  };
}
