import mongoose from "mongoose";

const idempotencyRecordSchema = new mongoose.Schema(
  {
    keyHash: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    route: { type: String, required: true, maxlength: 180 },
    method: { type: String, required: true, maxlength: 12 },
    requestFingerprint: { type: String, required: true },
    resourceId: { type: String, required: true, maxlength: 120 },
    operationId: { type: String, required: true, maxlength: 80 },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    responseStatus: Number,
    resultCode: { type: String, maxlength: 80 },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

idempotencyRecordSchema.index({ keyHash: 1, user: 1, route: 1, method: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyRecord = mongoose.model("IdempotencyRecord", idempotencyRecordSchema);
