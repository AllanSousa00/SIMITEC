import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import nodemailer from "nodemailer";

const DEFAULT_FROM = "SIMITEC <simitec.suporte.oficial@gmail.com>";
const SUPPORT_EMAIL = "simitec.suporte.oficial@gmail.com";
const EMAIL_LOGO_CID = "simitec-logo";
const EMAIL_LOGO_URL = `cid:${EMAIL_LOGO_CID}`;
const colors = {
  // Mesma identidade visual das interfaces SIMITEC, em formato seguro para e-mail.
  background: "#edf5f8",
  card: "#ffffff",
  navy: "#071a2b",
  text: "#163348",
  muted: "#5b7284",
  line: "#d6e5ed",
  accent: "#1bb7f0",
  accentDark: "#087eae",
  mint: "#20d6a2",
  notice: "#e9f8f3",
  success: "#087e5d"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAppUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getLanAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const item of entries || []) {
      if (item.family === "IPv4" && !item.internal) return item.address;
    }
  }
  return "127.0.0.1";
}

export function resolveAppUrl() {
  const configured = normalizeAppUrl(process.env.APP_URL);
  if (process.env.APP_URL_AUTO_LAN === "true" && process.env.NODE_ENV !== "production") {
    try {
      const parsed = new URL(configured || "http://127.0.0.1:3000");
      const hostname = parsed.hostname;
      if (["127.0.0.1", "localhost", "::1"].includes(hostname)) {
        parsed.hostname = getLanAddress();
        return parsed.toString().replace(/\/$/, "");
      }
    } catch (_error) {
      // Keep the safe local address below when APP_URL is malformed.
    }
  }
  return configured || "http://127.0.0.1:3000";
}

function emailLogoPath() {
  return path.resolve(process.cwd(), "..", "Site Publico", "assets", "simitec-logo-oficial-2026-fundo.jpg");
}

function previewLogoUrl() {
  return `${resolveAppUrl()}/assets/simitec-logo-oficial-2026-fundo.jpg`;
}

function createTransporter() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass }
  });
}

function isNonDeliverableTestRecipient(value) {
  const addresses = String(value || "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

  return addresses.some((address) => {
    const domain = address.slice(address.lastIndexOf("@") + 1);
    return ["test", "invalid", "localhost", "local"].includes(domain)
      || domain.endsWith(".test")
      || domain.endsWith(".invalid")
      || domain.endsWith(".localhost")
      || domain.endsWith(".local")
      || domain === "example.com"
      || domain === "example.org"
      || domain === "example.net";
  });
}

function normalizeRecipients(value) {
  const recipients = String(value || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  const hasUnsafeAddress = !recipients.length || recipients.some((address) => (
    address.length > 254
      || /[\r\n]/.test(address)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
  ));

  if (hasUnsafeAddress) {
    const error = new Error("Destinatário de e-mail inválido.");
    error.status = 400;
    throw error;
  }

  return recipients.join(", ");
}

function brand(logoSrc) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td valign="middle" style="padding:0;width:44px;">
          <img src="${escapeHtml(logoSrc)}" width="40" height="40" alt="SIMITEC" style="display:block;width:40px;height:40px;border:0;border-radius:8px;outline:none;text-decoration:none;">
        </td>
        <td valign="middle" style="padding:0 0 0 12px;">
          <p style="margin:0;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;font-weight:700;">SIMITEC</p>
          <p style="margin:2px 0 0;color:#b9d8e5;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.5px;">SEGURANÇA E ACESSO</p>
        </td>
      </tr>
    </table>
  `;
}

function actionButton(label, safeUrl) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td align="center" bgcolor="${colors.accent}" style="border-radius:6px;">
          <a href="${safeUrl}" style="display:inline-block;padding:13px 22px;color:${colors.navy};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `;
}

function fallbackLink(safeUrl) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0;background:${colors.notice};border:1px solid #bcebdc;border-radius:6px;">
      <tr>
        <td style="padding:14px 16px;border-left:4px solid ${colors.mint};">
          <p style="margin:0 0 6px;color:${colors.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">Se o botão não abrir, use este endereço no navegador:</p>
          <p style="margin:0;color:${colors.accentDark};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;overflow-wrap:anywhere;word-break:break-word;"><a href="${safeUrl}" style="color:${colors.accentDark};text-decoration:none;">${safeUrl}</a></p>
        </td>
      </tr>
    </table>
  `;
}

function emailTemplate({ preheader, title, intro, actionLabel, actionUrl, expiration, securityNote, logoSrc = EMAIL_LOGO_URL }) {
  const safeUrl = escapeHtml(actionUrl);
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .email-page { padding: 18px 10px !important; }
        .email-card { border-radius: 8px !important; }
        .email-header, .email-content, .email-footer { padding-left: 22px !important; padding-right: 22px !important; }
        .email-content { padding-top: 26px !important; padding-bottom: 26px !important; }
        .email-title { font-size: 23px !important; line-height: 30px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${colors.background};color:${colors.text};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${colors.background};">
      <tr>
        <td class="email-page" align="center" style="padding:36px 16px;">
          <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background:${colors.card};border:1px solid ${colors.line};border-radius:12px;overflow:hidden;">
            <tr>
              <td class="email-header" style="padding:25px 32px;background:${colors.navy};">
                ${brand(logoSrc)}
              </td>
            </tr>
            <tr><td style="height:4px;background:${colors.mint};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td class="email-content" style="padding:34px 32px;">
                <h1 class="email-title" style="margin:0 0 16px;color:${colors.text};font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:33px;font-weight:700;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 24px;color:${colors.muted};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;">${escapeHtml(intro)}</p>
                ${actionButton(actionLabel, safeUrl)}
                <p style="margin:0 0 20px;color:${colors.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;">${escapeHtml(expiration)}</p>
                ${fallbackLink(safeUrl)}
                <p style="margin:20px 0 0;color:${colors.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;"><strong style="color:${colors.text};">Dica de segurança:</strong> ${escapeHtml(securityNote)}</p>
              </td>
            </tr>
            <tr>
              <td class="email-footer" style="padding:20px 32px;background:#f7fbfd;border-top:1px solid ${colors.line};">
                <p style="margin:0;color:${colors.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;">Mensagem automática da SIMITEC. Para suporte, escreva para <a href="mailto:${SUPPORT_EMAIL}" style="color:${colors.accentDark};text-decoration:none;">${SUPPORT_EMAIL}</a>.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildEmailPreview(options) {
  return emailTemplate(options);
}

export function buildEmailPreviews() {
  const name = "Ana Beatriz";
  const logoSrc = previewLogoUrl();
  const previewBaseUrl = "https://preview.invalid/simitec";

  return [
    {
      id: "verification",
      label: "Confirmação de e-mail",
      description: "Enviado quando uma nova conta é criada ou a confirmação é solicitada novamente.",
      subject: "Confirme seu e-mail da SIMITEC",
      html: emailTemplate({
        preheader: "Confirme seu e-mail para ativar sua conta SIMITEC.",
        title: "Confirme seu e-mail",
        intro: `Olá, ${name}. Para ativar sua conta e liberar as inscrições, confirme este endereço de e-mail.`,
        actionLabel: "Confirmar e-mail",
        actionUrl: `${previewBaseUrl}/confirmar-conta`,
        expiration: "Este link expira em 24 horas e pode ser usado uma única vez.",
        securityNote: "Esta é uma prévia. Em uma mensagem real, o link é exclusivo e seguro.",
        logoSrc
      })
    },
    {
      id: "password-reset-public",
      label: "Redefinição de senha",
      description: "Enviado para participantes que solicitam uma nova senha no site público.",
      subject: "Redefina sua senha da SIMITEC",
      html: emailTemplate({
        preheader: "Use este link para criar uma nova senha da SIMITEC.",
        title: "Redefina sua senha",
        intro: `Olá, ${name}. Recebemos uma solicitação para redefinir a senha da sua conta.`,
        actionLabel: "Criar nova senha",
        actionUrl: `${previewBaseUrl}/nova-senha`,
        expiration: "Este link expira em 1 hora e só pode ser usado uma vez.",
        securityNote: "Esta é uma prévia. Em uma mensagem real, ignore o e-mail caso não tenha solicitado a alteração.",
        logoSrc
      })
    },
    {
      id: "password-reset-staff",
      label: "Redefinição da equipe",
      description: "Enviado quando um membro da equipe redefine o acesso ao painel administrativo.",
      subject: "Redefina sua senha da SIMITEC",
      html: emailTemplate({
        preheader: "Use este link para criar uma nova senha do painel da equipe.",
        title: "Redefina sua senha",
        intro: `Olá, ${name}. Recebemos uma solicitação para redefinir a senha do seu acesso ao painel da equipe.`,
        actionLabel: "Criar nova senha",
        actionUrl: `${previewBaseUrl}/equipe/nova-senha`,
        expiration: "Este link expira em 1 hora e só pode ser usado uma vez.",
        securityNote: "Esta é uma prévia. Em uma mensagem real, ignore o e-mail caso não tenha solicitado a alteração.",
        logoSrc
      })
    },
    {
      id: "smtp-test",
      label: "Teste da integração SMTP",
      description: "Enviado somente pela Administração Geral durante a validação técnica do provedor de e-mail.",
      subject: "E-mails da SIMITEC configurados",
      html: emailTemplate({
        preheader: "O servidor de e-mails da SIMITEC está funcionando.",
        title: "Envio de e-mails ativado",
        intro: "Este e-mail confirma que o servidor SMTP da SIMITEC está autenticado e pronto para enviar mensagens automáticas.",
        actionLabel: "Abrir o sistema SIMITEC",
        actionUrl: `${previewBaseUrl}/inicio`,
        expiration: "Nenhuma ação é necessária nesta mensagem técnica.",
        securityNote: "Esta é uma prévia. O teste real é enviado apenas para a conta configurada no SMTP.",
        logoSrc
      })
    }
  ];
}

async function sendMail({ to, subject, html, text, previewUrl }) {
  const recipient = normalizeRecipients(to);
  if (isNonDeliverableTestRecipient(recipient)) {
    console.info("Envio de e-mail de teste bloqueado.");
    return { delivered: false, previewUrl, suppressed: true };
  }

  const transporter = createTransporter();
  if (!transporter) return { delivered: false, previewUrl };

  const logoPath = emailLogoPath();
  const attachments = fs.existsSync(logoPath)
    ? [{ filename: "simitec-logo.jpg", path: logoPath, cid: EMAIL_LOGO_CID }]
    : [];

  await transporter.sendMail({
    from: process.env.MAIL_FROM || DEFAULT_FROM,
    replyTo: process.env.SMTP_USER || SUPPORT_EMAIL,
    to: recipient,
    subject,
    text,
    html,
    attachments
  });

  return { delivered: true };
}

export async function verifySmtpConnection() {
  const transporter = createTransporter();
  if (!transporter) return { configured: false, verified: false };
  await transporter.verify();
  return { configured: true, verified: true };
}

export async function sendVerificationEmail(user, token) {
  const url = `${resolveAppUrl()}/api/auth/verify/${token}`;
  const name = user.socialName || user.name || "participante";
  return sendMail({
    to: user.email,
    subject: "Confirme seu e-mail da SIMITEC",
    previewUrl: url,
    text: `Olá, ${name}.\n\nConfirme seu e-mail para ativar sua conta e liberar as inscrições na SIMITEC:\n${url}\n\nEste link expira em 24 horas. Se você não criou esta conta, ignore esta mensagem.\n\nEquipe SIMITEC`,
    html: emailTemplate({
      preheader: "Confirme seu e-mail para ativar sua conta SIMITEC.",
      title: "Confirme seu e-mail",
      intro: `Olá, ${name}. Para ativar sua conta e liberar as inscrições, confirme este endereço de e-mail.`,
      actionLabel: "Confirmar e-mail",
      actionUrl: url,
      expiration: "Este link expira em 24 horas e pode ser usado uma única vez.",
      securityNote: "Se você não criou esta conta, ignore esta mensagem. Nenhuma ação adicional será necessária."
    })
  });
}

export async function sendPasswordResetEmail(user, token, { audience = "public" } = {}) {
  const url = audience === "staff"
    ? `${resolveAppUrl()}/funcionarios/login?reset=${encodeURIComponent(token)}`
    : `${resolveAppUrl()}/?reset=${encodeURIComponent(token)}#/entrar`;
  const name = user.socialName || user.name || "participante";
  const team = audience === "staff";
  return sendMail({
    to: user.email,
    subject: "Redefina sua senha da SIMITEC",
    previewUrl: url,
    text: `Olá, ${name}.\n\nRecebemos uma solicitação para redefinir sua senha ${team ? "do painel da equipe" : "da sua conta"}. Crie uma nova senha neste endereço:\n${url}\n\nO link expira em 1 hora. Se você não solicitou esta alteração, ignore esta mensagem.\n\nEquipe SIMITEC`,
    html: emailTemplate({
      preheader: "Use este link para criar uma nova senha da SIMITEC.",
      title: "Redefina sua senha",
      intro: `Olá, ${name}. Recebemos uma solicitação para redefinir a senha ${team ? "do seu acesso ao painel da equipe" : "da sua conta"}.`,
      actionLabel: "Criar nova senha",
      actionUrl: url,
      expiration: "Este link expira em 1 hora e só pode ser usado uma vez.",
      securityNote: "Se você não solicitou esta alteração, ignore esta mensagem. Sua senha atual continuará válida."
    })
  });
}

export async function sendSmtpTestEmail() {
  const to = process.env.SMTP_USER;
  if (!to) throw new Error("SMTP_USER não configurado.");
  const url = resolveAppUrl();
  return sendMail({
    to,
    subject: "E-mails da SIMITEC configurados",
    previewUrl: url,
    text: `O envio de e-mails da SIMITEC foi configurado com sucesso.\n\nAbra o sistema: ${url}\n\nEquipe SIMITEC`,
    html: emailTemplate({
      preheader: "O servidor de e-mails da SIMITEC está funcionando.",
      title: "Envio de e-mails ativado",
      intro: "Este e-mail confirma que o servidor SMTP da SIMITEC está autenticado e pronto para enviar mensagens automáticas.",
      actionLabel: "Abrir o sistema SIMITEC",
      actionUrl: url,
      expiration: "Nenhuma ação adicional é necessária para este teste.",
      securityNote: "Esta mensagem foi gerada pela administração da SIMITEC."
    })
  });
}
