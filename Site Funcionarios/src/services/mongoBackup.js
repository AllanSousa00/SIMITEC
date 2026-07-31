import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { Registration } from "../models/Registration.js";
import { SiteContent } from "../models/SiteContent.js";
import { User } from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.resolve(__dirname, "..", "..", ".data", "backups");
const keepBackups = 7;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function backupMongoDatabase() {
  if (mongoose.connection.readyState !== 1) return null;

  const [users, registrations, siteContent] = await Promise.all([
    User.find({}).lean(),
    Registration.find({}).lean(),
    SiteContent.findOne({ key: "main" }).lean()
  ]);
  const content = JSON.stringify({
    createdAt: new Date().toISOString(),
    database: mongoose.connection.name,
    users,
    registrations,
    siteContent
  }, null, 2);

  await fs.mkdir(backupDir, { recursive: true });
  const fileName = `mongo-${timestamp()}.json`;
  const filePath = path.join(backupDir, fileName);
  const latestPath = path.join(backupDir, "mongo-latest.json");
  await fs.writeFile(filePath, content);
  await fs.writeFile(latestPath, content);

  const backups = (await fs.readdir(backupDir))
    .filter((name) => /^mongo-\d{4}-\d{2}-\d{2}T.*\.json$/.test(name))
    .sort()
    .reverse();
  await Promise.all(backups.slice(keepBackups).map((name) => fs.unlink(path.join(backupDir, name))));

  return filePath;
}

export function scheduleMongoBackups() {
  const backup = () => {
    backupMongoDatabase()
      .then((filePath) => {
        if (filePath) console.log(`Backup local do MongoDB atualizado: ${filePath}`);
      })
      .catch((error) => {
        console.error("Falha ao criar backup local do MongoDB:", error.message);
      });
  };

  backup();
  const timer = setInterval(backup, 24 * 60 * 60 * 1000);
  timer.unref();
}
