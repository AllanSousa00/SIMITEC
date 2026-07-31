// Modelo de usuario.
// Guarda conta, senha criptografada, cargo e dados basicos do perfil.
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    googleId: {
      type: String,
      trim: true,
      index: true,
      sparse: true
    },
    authProvider: {
      type: String,
      enum: ["password", "google"],
      default: "password"
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40
    },
    socialName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    institution: {
      type: String,
      trim: true,
      maxlength: 160
    },
    institutionPlaceId: {
      type: String,
      trim: true,
      maxlength: 220
    },
    institutionAddress: {
      type: String,
      trim: true,
      maxlength: 240
    },
    institutionGoogleMapsUri: {
      type: String,
      trim: true,
      maxlength: 500
    },
    institutionVerifiedAt: Date,
    course: {
      type: String,
      trim: true,
      maxlength: 120
    },
    city: {
      type: String,
      trim: true,
      maxlength: 120
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 240
    },
    github: {
      type: String,
      trim: true,
      maxlength: 240
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300
    },
    role: {
      type: String,
      enum: ["participant", "checkin", "admin", "super_admin"],
      default: "participant"
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    verificationTokenHash: String,
    verificationExpiresAt: Date,
    resetTokenHash: String,
    resetExpiresAt: Date,
    acceptedTermsAt: Date,
    acceptedTermsVersion: { type: String, trim: true, maxlength: 32 },
    acceptedPrivacyAt: Date,
    acceptedPrivacyVersion: { type: String, trim: true, maxlength: 32 },
    lastLoginAt: Date,
    avatarUrl: { type: String, trim: true, default: "/assets/avatar-default.svg" },
    badges: [{ type: String }],
    points: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1, emailVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ emailVerified: 1, createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ phone: 1 });
userSchema.index({ institutionPlaceId: 1 });
userSchema.index({ verificationTokenHash: 1 }, { sparse: true });
userSchema.index({ resetTokenHash: 1 }, { sparse: true });
userSchema.index({ lastLoginAt: -1 });

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.verificationTokenHash;
    delete ret.resetTokenHash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model("User", userSchema);
