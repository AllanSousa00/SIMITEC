import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const port = 3012;
const baseUrl = `http://127.0.0.1:${port}`;
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "simitec-system-"));
let serverOutput = "";

const server = spawn(process.execPath, ["src/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: "",
    NODE_ENV: "test",
    APP_URL: baseUrl,
    LOCAL_STORE_PATH: path.join(tempDirectory, "local-db.json")
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(route, { token = "", sensitiveToken = "", expected = 200, ...options } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    redirect: "manual",
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-simitec-mobile-app": "1",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sensitiveToken ? { "x-sensitive-access": sensitiveToken } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text && response.headers.get("content-type")?.includes("application/json")
    ? JSON.parse(text)
    : text;
  assert(
    response.status === expected,
    `${options.method || "GET"} ${route}: esperado ${expected}, recebido ${response.status}. ${text}`
  );
  return { response, body };
}

function tokenFromPreview(previewUrl, kind) {
  const url = new URL(previewUrl);
  if (kind === "verification") return url.pathname.split("/").pop();
  return url.searchParams.get("reset");
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`A API temporária encerrou com código ${server.exitCode}.\n${serverOutput.trim()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (_error) {
      // Cold startup can take a few seconds on low-end computers.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`A API temporária não iniciou.\n${serverOutput.trim()}`);
}

const adminPassword = "SimitEC!Admin2026";
const participantPassword = "SimitEC!Pessoa2026";
const nextParticipantPassword = "SimitEC!Nova2026";

try {
  await waitForServer();
  await request("/");
  await request("/funcionarios/");
  await request("/api/health");
  await request("/api/registrations/event");
  await request("/api/auth/google/config");
  await request("/api/admin/content", { expected: 401 });
  await request("/api/checkin/bootstrap", { expected: 401 });

  const adminRegistration = await request("/api/auth/register", {
    method: "POST",
    expected: 201,
    body: JSON.stringify({
      name: "Administração E2E",
      email: "admin.e2e@simitec.test",
      phone: "83999990000",
      password: adminPassword,
      acceptedTerms: true
    })
  });
  assert(adminRegistration.body.previewUrl, "Cadastro administrativo não retornou prévia de verificação.");
  const adminVerificationToken = tokenFromPreview(adminRegistration.body.previewUrl, "verification");
  await request(`/api/auth/verify/${adminVerificationToken}`, { expected: 302 });

  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin.e2e@simitec.test", password: adminPassword })
  });
  const adminToken = adminLogin.body.sessionToken;
  assert(adminToken, "Login administrativo não retornou token móvel.");
  await request("/api/admin/content", { token: adminToken });
  await request("/api/admin/users", { token: adminToken });
  const emailPreviews = await request("/api/admin/email-previews", { token: adminToken });
  assert(Array.isArray(emailPreviews.body.previews) && emailPreviews.body.previews.length >= 4, "Prévias de e-mail incompletas.");

  const participantRegistration = await request("/api/auth/register", {
    method: "POST",
    expected: 201,
    body: JSON.stringify({
      name: "Participante E2E",
      email: "participante.e2e@simitec.test",
      phone: "83999991111",
      password: participantPassword,
      acceptedTerms: true
    })
  });
  const participantTokenBeforeVerification = participantRegistration.body.sessionToken;
  await request("/api/registrations/event", {
    method: "POST",
    token: participantTokenBeforeVerification,
    expected: 403,
    body: JSON.stringify({ acceptedTerms: true })
  });

  const participantVerificationToken = tokenFromPreview(participantRegistration.body.previewUrl, "verification");
  await request(`/api/auth/verify/${participantVerificationToken}`, { expected: 302 });
  const participantLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "participante.e2e@simitec.test", password: participantPassword })
  });
  let participantToken = participantLogin.body.sessionToken;
  await request("/api/auth/sensitive-access", {
    method: "POST",
    token: participantToken,
    expected: 401,
    body: JSON.stringify({ password: "senha-incorreta" })
  });
  const sensitiveAccess = await request("/api/auth/sensitive-access", {
    method: "POST",
    token: participantToken,
    body: JSON.stringify({ password: participantPassword })
  });

  await request("/api/auth/me", {
    method: "PUT",
    token: participantToken,
    sensitiveToken: sensitiveAccess.body.sensitiveAccessToken,
    body: JSON.stringify({
      name: "Participante E2E Atualizado",
      socialName: "Pessoa E2E",
      phone: "83988887777",
      institution: "Instituição de Teste",
      course: "Curso de Teste",
      city: "Belém",
      bio: "Perfil criado pela verificação automatizada."
    })
  });

  const eventRegistration = await request("/api/registrations/event", {
    method: "POST",
    token: participantToken,
    expected: 201,
    body: JSON.stringify({
      name: "Participante E2E Atualizado",
      email: "participante.e2e@simitec.test",
      cpf: "52998224725",
      phone: "83988887777",
      role: "Estudante",
      institution: "Instituição de Teste",
      course: "Curso de Teste",
      shift: "Manhã",
      city: "Belém",
      acceptedTerms: true
    })
  });
  const registration = eventRegistration.body.registration;
  assert(registration?._id && registration.ticketCode, "Inscrição geral não retornou credencial.");
  await request(`/api/registrations/${registration._id}/ticket`, { token: participantToken });
  const mine = await request("/api/registrations/mine", { token: participantToken });
  assert(mine.body.registrations.length === 1, "Inscrição não apareceu no perfil do participante.");

  const bootstrap = await request("/api/checkin/bootstrap", { token: adminToken });
  assert(bootstrap.body.registrations.some((item) => item.ticketCode === registration.ticketCode), "App/painel não recebeu a inscrição.");
  await request("/api/checkin/scan", {
    method: "POST",
    token: adminToken,
    body: JSON.stringify({ payload: registration.ticketCode })
  });
  await request(`/api/checkin/registrations/${registration._id}/checkin`, {
    method: "PATCH",
    token: adminToken,
    body: JSON.stringify({ checkedIn: false })
  });

  const forgotPassword = await request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: "participante.e2e@simitec.test", audience: "public" })
  });
  const resetToken = tokenFromPreview(forgotPassword.body.previewUrl, "reset");
  assert(resetToken, "Recuperação de senha não retornou token de teste.");
  await request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token: resetToken, password: nextParticipantPassword })
  });
  const nextLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "participante.e2e@simitec.test", password: nextParticipantPassword })
  });
  participantToken = nextLogin.body.sessionToken;
  await request("/api/auth/me", {
    method: "DELETE",
    token: participantToken,
    body: JSON.stringify({ password: nextParticipantPassword })
  });
  await request("/api/auth/login", {
    method: "POST",
    expected: 401,
    body: JSON.stringify({ email: "participante.e2e@simitec.test", password: nextParticipantPassword })
  });

  await request("/api/auth/logout", {
    method: "POST",
    token: adminToken,
    body: "{}"
  });

  console.log("Fluxos validados: páginas, proteção, cadastro, verificação, login, perfil, inscrição, credencial, check-in, recuperação, exclusão e e-mails.");
} finally {
  server.kill();
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    server.once("exit", resolve);
    setTimeout(resolve, 3000).unref();
  });
  await fs.rm(tempDirectory, { recursive: true, force: true });
}
