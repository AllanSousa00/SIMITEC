import {
  buildEmailPreviews,
  sendPasswordResetEmail,
  sendVerificationEmail
} from "../src/services/mailer.js";

const previews = buildEmailPreviews();
const requiredColors = ["#071a2b", "#1bb7f0", "#20d6a2"];

// Este verificador nunca deve depender de um provedor externo nem disparar e-mails.
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";

if (previews.length !== 4) {
  throw new Error(`Esperadas 4 prévias de e-mail, recebidas ${previews.length}.`);
}

if (previews.some((item) => !item.id || !item.subject || !item.html || requiredColors.some((color) => !item.html.includes(color)))) {
  throw new Error("Uma ou mais prévias não possuem conteúdo ou identidade visual completa.");
}

const blockedVerification = await sendVerificationEmail(
  { email: "tester@simitec.test", name: "Teste" },
  "token-de-teste"
);
const blockedPublicReset = await sendPasswordResetEmail(
  { email: "tester@simitec.test", name: "Teste" },
  "token-de-teste"
);
const blockedStaffReset = await sendPasswordResetEmail(
  { email: "tester@simitec.test", name: "Teste" },
  "token-de-teste",
  { audience: "staff" }
);

if ([blockedVerification, blockedPublicReset, blockedStaffReset].some((delivery) => !delivery.suppressed || delivery.delivered)) {
  throw new Error("O bloqueio de destinatários de teste falhou.");
}

const allowedRecipient = await sendPasswordResetEmail(
  { email: "contato@simitec.com.br", name: "Teste" },
  "token-de-teste"
);

if (allowedRecipient.suppressed) {
  throw new Error("Um destinatário real foi bloqueado indevidamente.");
}

let unsafeRecipientRejected = false;
try {
  await sendPasswordResetEmail(
    { email: "contato@simitec.com.br\r\nBcc: externo@exemplo.com", name: "Teste" },
    "token-de-teste"
  );
} catch (error) {
  unsafeRecipientRejected = error?.message === "Destinatário de e-mail inválido.";
}

if (!unsafeRecipientRejected) {
  throw new Error("A proteção contra destinatário inseguro falhou.");
}

console.log(`Prévias validadas: ${previews.map((item) => item.id).join(", ")}.`);
console.log("Destinatário de teste bloqueado antes do SMTP.");
console.log("Destinatário real aceito e injeção de cabeçalho rejeitada.");
