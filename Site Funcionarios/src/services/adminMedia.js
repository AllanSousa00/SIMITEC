// Upload controlado de imagens e regulamentos usados no conteúdo público.
// Os arquivos recebem nomes aleatórios e nunca usam caminhos enviados pelo navegador.
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "..", "..", "..", "Site Publico", "uploads");

const mediaKinds = {
  image: {
    maxBytes: 4 * 1024 * 1024,
    label: "imagem",
    mimeTypes: new Map([
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"]
    ])
  },
  rules: {
    maxBytes: 5 * 1024 * 1024,
    label: "regulamento",
    mimeTypes: new Map([
      ["application/pdf", "pdf"],
      ["application/msword", "doc"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
      ["text/plain", "txt"]
    ])
  }
};

function uploadError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function r2Storage() {
  const config = {
    endpoint: String(process.env.R2_ENDPOINT || "").trim(),
    bucket: String(process.env.R2_BUCKET || "").trim(),
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || "").trim(),
    publicBaseUrl: String(process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "")
  };
  const values = Object.values(config);
  if (!values.some(Boolean)) return null;
  if (values.some((value) => !value)) {
    throw uploadError("Cloudflare R2 incompleto. Confira as cinco variáveis R2 no arquivo .env.", 500);
  }

  return {
    bucket: config.bucket,
    publicBaseUrl: config.publicBaseUrl,
    client: new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
  };
}

export async function saveUploadedAdminMedia({ dataUrl, kind = "image" } = {}) {
  const config = mediaKinds[kind];
  if (!config) throw uploadError("Tipo de arquivo não permitido.");

  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) throw uploadError("Arquivo inválido. Selecione novamente e tente publicar.");

  const mimeType = match[1].toLowerCase();
  const extension = config.mimeTypes.get(mimeType);
  if (!extension) throw uploadError(`Formato de ${config.label} não permitido.`);

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) throw uploadError("O arquivo enviado está vazio.");
  if (bytes.length > config.maxBytes) {
    const maxMb = Math.floor(config.maxBytes / 1024 / 1024);
    throw uploadError(`O arquivo é muito grande. Envie ${config.label} com até ${maxMb} MB.`);
  }

  const storage = r2Storage();
  const fileName = `${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  if (storage) {
    await storage.client.send(new PutObjectCommand({
      Bucket: storage.bucket,
      Key: fileName,
      Body: bytes,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable"
    }));
    return {
      url: `${storage.publicBaseUrl}/${fileName}`,
      mimeType,
      size: bytes.length,
      storage: "cloudflare-r2"
    };
  }

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes, { flag: "wx" });

  return {
    url: `/uploads/${fileName}`,
    mimeType,
    size: bytes.length,
    storage: "local"
  };
}
