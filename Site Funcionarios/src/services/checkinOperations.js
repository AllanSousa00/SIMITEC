import crypto from "node:crypto";
import { Registration } from "../models/Registration.js";

export const CHECKIN_RESULT = {
  UPDATED: "UPDATED",
  REGISTRATION_NOT_FOUND: "REGISTRATION_NOT_FOUND",
  WRONG_EVENT: "WRONG_EVENT",
  INVALID_REGISTRATION_STATUS: "INVALID_REGISTRATION_STATUS",
  ALREADY_CHECKED_IN: "ALREADY_CHECKED_IN",
  ALREADY_CHECKED_OUT: "ALREADY_CHECKED_OUT"
};

function historyEntry({ checkedIn, operatorId, notes, operationId, now }) {
  return {
    field: "checkedInAt",
    from: checkedIn ? "" : now.toISOString(),
    to: checkedIn ? now.toISOString() : "",
    reason: notes || (checkedIn ? "Credenciamento" : "Credenciamento desfeito"),
    changedBy: operatorId,
    changedAt: now,
    operationId
  };
}

async function readRegistration(registrationModel, registrationId) {
  const query = registrationModel.findById(registrationId);
  return query && typeof query.lean === "function" ? query.lean() : query;
}

function classifyConflict(registration, eventId, checkedIn) {
  if (!registration) return CHECKIN_RESULT.REGISTRATION_NOT_FOUND;
  if (String(registration.eventId) !== String(eventId)) return CHECKIN_RESULT.WRONG_EVENT;
  if (registration.status !== "confirmed") return CHECKIN_RESULT.INVALID_REGISTRATION_STATUS;
  return checkedIn ? CHECKIN_RESULT.ALREADY_CHECKED_IN : CHECKIN_RESULT.ALREADY_CHECKED_OUT;
}

export async function setRegistrationCheckin({
  registrationId,
  eventId,
  operatorId,
  checkedIn = true,
  notes = "",
  operationId = crypto.randomUUID(),
  now = new Date(),
  registrationModel = Registration
}) {
  const filter = {
    _id: registrationId,
    eventId,
    status: "confirmed",
    checkedInAt: checkedIn ? null : { $ne: null }
  };
  const audit = historyEntry({ checkedIn, operatorId, notes, operationId, now });
  const update = checkedIn
    ? {
        $set: {
          checkedInAt: now,
          checkedInBy: operatorId,
          ...(notes ? { checkinNotes: notes } : {}),
          updatedAt: now
        },
        $push: { changeHistory: audit }
      }
    : {
        $unset: {
          checkedInAt: "",
          checkedInBy: "",
          checkinNotes: ""
        },
        $set: { updatedAt: now },
        $push: { changeHistory: audit }
      };

  const registration = await registrationModel.findOneAndUpdate(filter, update, {
    new: true,
    runValidators: true
  });

  if (registration) {
    return { code: CHECKIN_RESULT.UPDATED, registration, operationId };
  }

  const current = await readRegistration(registrationModel, registrationId);
  return {
    code: classifyConflict(current, eventId, checkedIn),
    registration: current,
    operationId
  };
}
