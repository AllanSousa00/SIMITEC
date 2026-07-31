// Servidor principal da SIMITEC.
// Ele entrega o site publico, o painel da equipe e a API de credenciamento.
// Traducao de estudante: se esse arquivo nao sobe, a festa inteira fica sem tomada.
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import checkinRoutes from "./routes/checkin.js";
import localFallbackRoutes from "./routes/localFallback.js";
import registrationRoutes from "./routes/registrations.js";
import { googleSheetsConfigured, syncGoogleSheets } from "./services/googleSheetsSync.js";
import { assertProductionLegalRelease } from "./services/legalRelease.js";
import { scheduleMongoBackups } from "./services/mongoBackup.js";

dotenv.config();
assertProductionLegalRelease();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "..", "..", "Site Publico");
const staffDir = path.resolve(__dirname, "..", "painel-react", "dist");
const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";
const staticOptions = {
  etag: true,
  maxAge: isProduction ? "1d" : 0
};
const immutableAssetOptions = {
  etag: true,
  immutable: isProduction,
  maxAge: isProduction ? "30d" : 0
};
const mongoMaxPoolSize = Math.max(Number(process.env.MONGODB_MAX_POOL_SIZE || 20), 5);
const mongoMinPoolSize = Math.max(Number(process.env.MONGODB_MIN_POOL_SIZE || 2), 0);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas solicitações. Aguarde um instante e tente novamente." }
});

function isAllowedDevOrigin(origin = "") {
  if (isProduction || !origin) return false;
  return /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}):(8081|19000|19006)$/.test(origin);
}

mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);
mongoose.set("bufferCommands", false);

async function connectDatabase() {
  // Tenta usar MongoDB oficial. Se nao conseguir, o fallback local segura o projeto
  // como contingencia operacional ate a conexao principal voltar.
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        maxPoolSize: mongoMaxPoolSize,
        minPoolSize: mongoMinPoolSize,
        maxIdleTimeMS: 30000,
        socketTimeoutMS: 45000
      });
      console.log("MongoDB conectado (Local/Remoto).");
      scheduleMongoBackups();
      return;
    } catch (error) {
      console.warn("Falha ao conectar no MongoDB principal.", error.message);
    }
  } else {
    console.warn("MONGODB_URI não configurado. Contas, inscrições e administração usam armazenamento local até a conexão MongoDB ser definida.");
  }
}

let googleSheetsAutoSyncRunning = false;
function scheduleGoogleSheetsAutoSync() {
  if (!googleSheetsConfigured()) {
    console.log("Google Sheets não configurado. Sincronização automática externa desativada.");
    return;
  }

  const intervalMs = Math.max(Number(process.env.GOOGLE_SHEETS_AUTO_SYNC_MS || 180000), 60000);
  const run = async () => {
    if (googleSheetsAutoSyncRunning) return;
    googleSheetsAutoSyncRunning = true;
    try {
      const result = await syncGoogleSheets();
      console.log(`Google Sheets sincronizado automaticamente (${result.registrations} inscrição(ões)).`);
    } catch (error) {
      console.warn("Falha na sincronização automática do Google Sheets:", error.message);
    } finally {
      googleSheetsAutoSyncRunning = false;
    }
  };

  const initialTimer = setTimeout(run, 15000);
  const intervalTimer = setInterval(run, intervalMs);
  initialTimer.unref?.();
  intervalTimer.unref?.();
  console.log(`Google Sheets com sincronização automática a cada ${Math.round(intervalMs / 1000)}s.`);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("troque") || process.env.JWT_SECRET.length < 32) {
  console.warn("JWT_SECRET precisa ter uma chave longa e segura antes da publicacao.");
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression({ threshold: 1024 }));
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'", "https://docs.google.com", "https://forms.gle"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "https://unpkg.com", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        connectSrc: ["'self'", "https://unpkg.com", "https://accounts.google.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    }
  })
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (req.path.startsWith("/api/") && isAllowedDevOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,x-simitec-mobile-app,x-sensitive-access");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  if (
    req.path.startsWith("/api/") ||
    req.path.startsWith("/funcionarios") ||
    req.path === "/google-auth-callback.html" ||
    req.path === "/google-auth-callback.js"
  ) {
    res.setHeader("Cache-Control", "no-store");
  }
  if (req.method === "OPTIONS" && req.path.startsWith("/api/")) {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "7mb" }));
app.use(cookieParser());
app.use("/assets", express.static(path.join(publicDir, "assets"), immutableAssetOptions));
app.use(express.static(publicDir, staticOptions));
app.use("/funcionarios", express.static(staffDir, staticOptions));

app.use("/api", apiLimiter);
// O fallback vem primeiro: quando o Mongo esta offline, ele responde.
// Quando o Mongo conecta, ele passa a bola para as rotas oficiais.
app.use("/api", localFallbackRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? "connected" : "local-store"
  });
});

app.get("/funcionarios/*", (_req, res) => {
  res.sendFile(path.join(staffDir, "index.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido. Confira o corpo da solicitação." });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Solicitação muito grande." });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: "Dados inválidos.", details: error.message });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: "Registro duplicado." });
  }

  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ message: error.message || "Não foi possível concluir a solicitação." });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Banco de dados indisponível. Verifique a conexão MongoDB."
    });
  }

  return res.status(500).json({ message: "Erro interno. Tente novamente." });
});

connectDatabase()
  .catch((error) => {
    console.error("Falha ao conectar ao MongoDB:", error.message);
  })
  .finally(() => {
    app.listen(port, host, () => {
      const appUrl = process.env.APP_URL || `http://127.0.0.1:${port}`;
      console.log(`SIMITEC iniciado em ${appUrl}`);
      console.log(`API escutando em ${host}:${port}.`);
      if (process.env.NODE_ENV !== "test") {
        scheduleGoogleSheetsAutoSync();
      }
    });
  });





