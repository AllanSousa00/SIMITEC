// Armazenamento local em JSON.
// Usado quando nao tem MongoDB conectado. Simples, direto e com backup,
// porque perder inscricao por bobeira seria triste demais.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStorePath = path.join(__dirname, "..", "..", ".data", "local-db.json");
const storePath = process.env.LOCAL_STORE_PATH
  ? path.resolve(process.env.LOCAL_STORE_PATH)
  : defaultStorePath;
const storeExtension = path.extname(storePath) || ".json";
const storeBaseName = path.basename(storePath, storeExtension);
const storeDirectory = path.dirname(storePath);
const storeBackupPath = path.join(storeDirectory, `${storeBaseName}.backup${storeExtension}`);
const storeTempPath = path.join(storeDirectory, `${storeBaseName}.tmp${storeExtension}`);

const emptyStore = {
  users: [],
  registrations: [],
  siteContent: null
};

let writeQueue = Promise.resolve();
let localStoreCache = null;

function normalizeStore(store = {}) {
  return {
    users: Array.isArray(store.users) ? store.users : [],
    registrations: Array.isArray(store.registrations) ? store.registrations : [],
    siteContent: store.siteContent && typeof store.siteContent === "object" ? store.siteContent : null
  };
}

function cloneStore(store) {
  return typeof structuredClone === "function"
    ? structuredClone(store)
    : JSON.parse(JSON.stringify(store));
}

async function ensureStore() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch (_error) {
    await fs.writeFile(storePath, JSON.stringify(emptyStore, null, 2));
  }
}

export function createId() {
  return crypto.randomUUID();
}

export function createTicketCode(year = new Date().getFullYear()) {
  const cleanYear = String(year || new Date().getFullYear()).match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIM-${cleanYear}-${suffix}`;
}

export async function readLocalStore() {
  await ensureStore();
  if (localStoreCache) return cloneStore(localStoreCache);

  let raw = "";
  try {
    raw = await fs.readFile(storePath, "utf8");
  } catch (error) {
    raw = await fs.readFile(storeBackupPath, "utf8").catch(() => {
      throw error;
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch (error) {
    const backupRaw = await fs.readFile(storeBackupPath, "utf8").catch(() => "");
    if (!backupRaw) throw error;
    parsed = JSON.parse(backupRaw || "{}");
  }

  localStoreCache = normalizeStore(parsed);
  return cloneStore(localStoreCache);
}

export async function writeLocalStore(nextStore) {
  // Fila de escrita: uma gravacao por vez para nao embaralhar o arquivo.
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await ensureStore();
    const normalizedStore = normalizeStore(nextStore);
    const current = await fs.readFile(storePath, "utf8").catch(() => "");
    if (current) {
      await fs.writeFile(storeBackupPath, current);
    }
    await fs.writeFile(storeTempPath, JSON.stringify(normalizedStore));
    await fs.rename(storeTempPath, storePath);
    localStoreCache = cloneStore(normalizedStore);
  });

  await writeQueue;
}

export async function updateLocalStore(mutator) {
  const store = await readLocalStore();
  const result = await mutator(store);
  await writeLocalStore(store);
  return result;
}
