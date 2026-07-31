import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const port = 3011;
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "simitec-email-route-"));
const timeoutAt = Date.now() + 60_000;
let serverOutput = "";
const server = spawn(process.execPath, ["src/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: "",
    NODE_ENV: "test",
    APP_URL: `http://127.0.0.1:${port}`,
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

async function waitForServer() {
  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch (_error) {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`A API temporária não iniciou para a verificação das prévias.\n${serverOutput.trim()}`);
}

try {
  await waitForServer();
  const response = await fetch(`http://127.0.0.1:${port}/api/admin/email-previews`);
  const body = await response.json().catch(() => ({}));

  if (response.status !== 401 || Array.isArray(body.previews)) {
    throw new Error("A rota de prévias não está protegida corretamente.");
  }

  console.log("Rota de prévias protegida contra acesso sem sessão.");
} finally {
  server.kill();
  await fs.rm(tempDirectory, { recursive: true, force: true });
}
