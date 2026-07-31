import crypto from "node:crypto";
import { IdempotencyRecord } from "../models/IdempotencyRecord.js";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => ({ ...result, [key]: stableValue(value[key]) }), {});
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function requestFingerprint(value) {
  return sha256(JSON.stringify(stableValue(value || {})));
}

export function readIdempotencyKey(req) {
  const key = String(req.get(IDEMPOTENCY_HEADER) || "").trim();
  if (!key) return "";
  if (!KEY_PATTERN.test(key)) {
    const error = new Error("Idempotency-Key invalida.");
    error.statusCode = 400;
    error.code = "INVALID_IDEMPOTENCY_KEY";
    throw error;
  }
  return key;
}

async function findRecord(model, filter) {
  const query = model.findOne(filter);
  return query && typeof query.lean === "function" ? query.lean() : query;
}

export async function beginIdempotentOperation({
  key,
  userId,
  method,
  route,
  resourceId,
  payload,
  ttlMs = 24 * 60 * 60 * 1000,
  model = IdempotencyRecord
}) {
  if (!key) return { enabled: false, operationId: crypto.randomUUID() };

  const keyHash = sha256(key);
  const fingerprint = requestFingerprint(payload);
  const base = { keyHash, user: userId, method, route };
  const operationId = crypto.randomUUID();

  try {
    const record = await model.create({
      ...base,
      requestFingerprint: fingerprint,
      resourceId: String(resourceId),
      operationId,
      expiresAt: new Date(Date.now() + ttlMs)
    });
    return { enabled: true, state: "claimed", operationId, record };
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const record = await findRecord(model, base);
  if (!record) throw new Error("Nao foi possivel recuperar a operacao idempotente.");
  if (record.requestFingerprint !== fingerprint || String(record.resourceId) !== String(resourceId)) {
    return { enabled: true, state: "mismatch", record };
  }
  return { enabled: true, state: record.status === "completed" ? "completed" : "in_progress", record };
}

export async function completeIdempotentOperation({ recordId, responseStatus, resultCode, model = IdempotencyRecord }) {
  return model.findOneAndUpdate(
    { _id: recordId, status: "in_progress" },
    { $set: { status: "completed", responseStatus, resultCode } },
    { new: true }
  );
}
