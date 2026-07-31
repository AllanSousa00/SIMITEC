import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Registration } from "../src/models/Registration.js";
import { SiteContent } from "../src/models/SiteContent.js";
import { User } from "../src/models/User.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, "..", ".data", "local-db.json");
const mongoUri = String(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/simitec").trim();

function dateOrUndefined(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function definedEntries(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function userPayload(user = {}) {
  return definedEntries({
    name: user.name,
    socialName: user.socialName,
    email: String(user.email || "").trim().toLowerCase(),
    phone: user.phone,
    passwordHash: user.passwordHash,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    verificationTokenHash: user.verificationTokenHash,
    verificationExpiresAt: dateOrUndefined(user.verificationExpiresAt),
    resetTokenHash: user.resetTokenHash,
    resetExpiresAt: dateOrUndefined(user.resetExpiresAt),
    acceptedTermsAt: dateOrUndefined(user.acceptedTermsAt),
    lastLoginAt: dateOrUndefined(user.lastLoginAt),
    institution: user.institution,
    institutionPlaceId: user.institutionPlaceId,
    institutionAddress: user.institutionAddress,
    institutionGoogleMapsUri: user.institutionGoogleMapsUri,
    institutionVerifiedAt: dateOrUndefined(user.institutionVerifiedAt),
    course: user.course,
    city: user.city,
    linkedin: user.linkedin,
    github: user.github,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    badges: Array.isArray(user.badges) ? user.badges : [],
    points: Number(user.points || 0),
    createdAt: dateOrUndefined(user.createdAt),
    updatedAt: dateOrUndefined(user.updatedAt)
  });
}

function participantPayload(participant = {}) {
  return definedEntries({
    ...participant,
    institutionVerifiedAt: dateOrUndefined(participant.institutionVerifiedAt),
    teacherValidationRequestedAt: dateOrUndefined(participant.teacherValidationRequestedAt),
    teacherValidationReviewedAt: dateOrUndefined(participant.teacherValidationReviewedAt)
  });
}

function registrationPayload(registration = {}, userIdByLocalId) {
  const user = userIdByLocalId.get(registration.userId);
  if (!user) return null;

  return definedEntries({
    user,
    eventId: registration.eventId,
    activitySlug: registration.activitySlug || "main",
    activityTitle: registration.activityTitle,
    participant: participantPayload(registration.participant),
    details: registration.details || {},
    ticketCode: registration.ticketCode,
    status: registration.status || "confirmed",
    checkedInAt: dateOrUndefined(registration.checkedInAt),
    checkedInBy: userIdByLocalId.get(registration.checkedInBy),
    checkinNotes: registration.checkinNotes,
    changeHistory: Array.isArray(registration.changeHistory) ? registration.changeHistory : [],
    group: registration.group,
    acceptedTermsAt: dateOrUndefined(registration.acceptedTermsAt),
    createdAt: dateOrUndefined(registration.createdAt),
    updatedAt: dateOrUndefined(registration.updatedAt)
  });
}

async function migrate() {
  const raw = await fs.readFile(storePath, "utf8");
  const store = JSON.parse(raw);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const userIdByLocalId = new Map();
  let users = 0;
  let registrations = 0;

  for (const localUser of store.users || []) {
    const payload = userPayload(localUser);
    if (!payload.name || !payload.email || !payload.passwordHash) continue;

    const user = await User.findOneAndUpdate(
      { email: payload.email },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    userIdByLocalId.set(localUser.id, user._id);
    users += 1;
  }

  for (const localRegistration of store.registrations || []) {
    const payload = registrationPayload(localRegistration, userIdByLocalId);
    if (!payload?.eventId || !payload.activityTitle) continue;

    await Registration.findOneAndUpdate(
      {
        user: payload.user,
        eventId: payload.eventId,
        activitySlug: payload.activitySlug
      },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    registrations += 1;
  }

  if (store.siteContent && typeof store.siteContent === "object") {
    const content = { ...store.siteContent, key: "main" };
    const updatedBy = userIdByLocalId.get(store.siteContent.updatedBy);
    delete content._id;
    delete content.updatedBy;
    await SiteContent.findOneAndUpdate(
      { key: "main" },
      { $set: definedEntries({ ...content, updatedBy }) },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  console.log(JSON.stringify({
    ok: true,
    users,
    registrations,
    siteContent: Boolean(store.siteContent),
    database: mongoose.connection.name
  }));
}

try {
  await migrate();
} finally {
  await mongoose.disconnect();
}
