import assert from "node:assert/strict";
import test from "node:test";
import { CHECKIN_RESULT, setRegistrationCheckin } from "../../src/services/checkinOperations.js";

function clone(value) {
  return structuredClone(value);
}

function createRegistrationModel(seed) {
  let current = clone(seed);
  const matches = (filter) => {
    if (!current || String(current._id) !== String(filter._id)) return false;
    if (String(current.eventId) !== String(filter.eventId) || current.status !== filter.status) return false;
    if (filter.checkedInAt === null) return current.checkedInAt == null;
    return current.checkedInAt != null;
  };

  return {
    async findOneAndUpdate(filter, update) {
      if (!matches(filter)) return null;
      for (const [key, value] of Object.entries(update.$set || {})) current[key] = value;
      for (const key of Object.keys(update.$unset || {})) delete current[key];
      if (update.$push?.changeHistory) current.changeHistory.push(update.$push.changeHistory);
      return clone(current);
    },
    async findById(id) {
      return current && String(current._id) === String(id) ? clone(current) : null;
    },
    snapshot() {
      return clone(current);
    }
  };
}

function registration() {
  return {
    _id: "registration-1",
    eventId: "simitec-2026",
    status: "confirmed",
    checkedInAt: null,
    checkedInBy: null,
    changeHistory: []
  };
}

test("only one of one hundred concurrent check-ins changes the registration", async () => {
  const model = createRegistrationModel(registration());
  const results = await Promise.all(
    Array.from({ length: 100 }, (_, index) => setRegistrationCheckin({
      registrationId: "registration-1",
      eventId: "simitec-2026",
      operatorId: `operator-${index}`,
      operationId: `operation-${index}`,
      registrationModel: model
    }))
  );

  assert.equal(results.filter((result) => result.code === CHECKIN_RESULT.UPDATED).length, 1);
  assert.equal(results.filter((result) => result.code === CHECKIN_RESULT.ALREADY_CHECKED_IN).length, 99);
  const stored = model.snapshot();
  assert.ok(stored.checkedInAt);
  assert.equal(stored.changeHistory.length, 1);
});

test("check-in conflicts have deterministic codes and do not overwrite the operator", async () => {
  const model = createRegistrationModel(registration());
  const first = await setRegistrationCheckin({
    registrationId: "registration-1",
    eventId: "simitec-2026",
    operatorId: "operator-a",
    operationId: "first",
    registrationModel: model
  });
  const duplicate = await setRegistrationCheckin({
    registrationId: "registration-1",
    eventId: "simitec-2026",
    operatorId: "operator-b",
    operationId: "second",
    registrationModel: model
  });
  const wrongEvent = await setRegistrationCheckin({
    registrationId: "registration-1",
    eventId: "other-event",
    operatorId: "operator-c",
    registrationModel: model
  });

  assert.equal(first.code, CHECKIN_RESULT.UPDATED);
  assert.equal(duplicate.code, CHECKIN_RESULT.ALREADY_CHECKED_IN);
  assert.equal(wrongEvent.code, CHECKIN_RESULT.WRONG_EVENT);
  assert.equal(model.snapshot().checkedInBy, "operator-a");
});

test("undo uses the inverse atomic condition", async () => {
  const model = createRegistrationModel({
    ...registration(),
    checkedInAt: new Date("2026-07-28T12:00:00.000Z"),
    checkedInBy: "operator-a"
  });
  const result = await setRegistrationCheckin({
    registrationId: "registration-1",
    eventId: "simitec-2026",
    operatorId: "operator-b",
    checkedIn: false,
    registrationModel: model
  });

  assert.equal(result.code, CHECKIN_RESULT.UPDATED);
  assert.equal(model.snapshot().checkedInAt, undefined);
  assert.equal(model.snapshot().changeHistory.length, 1);
});
