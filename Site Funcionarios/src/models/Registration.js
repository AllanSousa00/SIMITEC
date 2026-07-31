// Modelo de inscricao.
// Cada registro liga uma pessoa ao evento ou a uma area especifica.
import crypto from "node:crypto";
import mongoose from "mongoose";

function createTicketCode() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIM-${year}-${suffix}`;
}

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    socialName: { type: String, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    cpf: { type: String, trim: true, maxlength: 20 },
    phone: { type: String, trim: true, maxlength: 40 },
    avatarUrl: { type: String, trim: true, maxlength: 1000 },
    teacherCardCode: { type: String, trim: true, maxlength: 80 },
    teacherValidationStatus: {
      type: String,
      enum: ["not-requested", "pending", "approved", "rejected"],
      default: "not-requested"
    },
    teacherValidationRequestedAt: Date,
    teacherValidationReviewedAt: Date,
    role: {
      type: String,
      enum: ["Estudante", "Professor(a)", "Visitante", "Organizador(a)"],
      default: "Estudante"
    },
    institution: { type: String, trim: true, maxlength: 160 },
    institutionPlaceId: { type: String, trim: true, maxlength: 220 },
    institutionAddress: { type: String, trim: true, maxlength: 240 },
    institutionGoogleMapsUri: { type: String, trim: true, maxlength: 500 },
    institutionVerifiedAt: Date,
    course: { type: String, trim: true, maxlength: 120 },
    shift: { type: String, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 120 },
    certificateEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    accessibility: { type: String, trim: true, maxlength: 300 }
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    institution: { type: String, trim: true, maxlength: 160 },
    institutionPlaceId: { type: String, trim: true, maxlength: 220 },
    institutionAddress: { type: String, trim: true, maxlength: 240 },
    institutionGoogleMapsUri: { type: String, trim: true, maxlength: 500 },
    institutionVerifiedAt: Date,
    course: { type: String, trim: true, maxlength: 120 },
    shift: { type: String, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 120 },
    responsibleName: { type: String, trim: true, maxlength: 120 },
    responsiblePhone: { type: String, trim: true, maxlength: 40 },
    responsibleEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    responsibleRole: { type: String, trim: true, maxlength: 80 },
    certificateDelivery: {
      type: String,
      enum: ["student", "responsible"],
      default: "student"
    },
    certificateEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    size: { type: Number, default: 0 },
    notes: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: Date
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  // Historico e credenciamento ficam aqui para a equipe saber o que aconteceu.
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    eventId: {
      type: String,
      required: true,
      index: true
    },
    activitySlug: {
      type: String,
      required: true,
      default: "main",
      index: true
    },
    activityTitle: {
      type: String,
      required: true
    },
    participant: {
      type: participantSchema,
      required: true
    },
    details: {
      type: Map,
      of: String,
      default: {}
    },
    ticketCode: {
      type: String,
      unique: true,
      default: createTicketCode
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true
    },
    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    checkinNotes: {
      type: String,
      trim: true,
      maxlength: 240
    },
    changeHistory: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    group: groupSchema,
    acceptedTermsAt: Date
  },
  {
    timestamps: true
  }
);

registrationSchema.index({ user: 1, eventId: 1, activitySlug: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, activitySlug: 1, status: 1 });
registrationSchema.index({ eventId: 1, activitySlug: 1, status: 1, "details.period": 1 });
registrationSchema.index({ eventId: 1, status: 1, checkedInAt: 1, createdAt: -1 });
registrationSchema.index({ eventId: 1, user: 1, status: 1 });
registrationSchema.index({ eventId: 1, ticketCode: 1, status: 1 });
registrationSchema.index({ eventId: 1, createdAt: -1 });
registrationSchema.index({ ticketCode: 1, status: 1 });
registrationSchema.index({ checkedInAt: -1 });
registrationSchema.index({ checkedInBy: 1, checkedInAt: -1 });
registrationSchema.index({ "participant.email": 1 });
registrationSchema.index({ "participant.cpf": 1 });
registrationSchema.index({ "participant.phone": 1 });
registrationSchema.index({ "participant.institution": 1, "participant.course": 1 });
registrationSchema.index({ "participant.institutionPlaceId": 1 });
registrationSchema.index({ "group.id": 1 });

registrationSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export const Registration = mongoose.model("Registration", registrationSchema);
