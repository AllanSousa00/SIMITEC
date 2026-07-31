import assert from "node:assert/strict";
import test from "node:test";
import {
  beginIdempotentOperation,
  completeIdempotentOperation,
  requestFingerprint
} from "../../src/services/idempotency.js";

function createModel() {
  const records = [];
  return {
    async create(next) {
      if (records.some((record) => record.keyHash === next.keyHash && record.user === next.user && record.route === next.route && record.method === next.method)) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      const record = { ...next, _id: `record-${records.length + 1}`, status: "in_progress" };
      records.push(record);
      return structuredClone(record);
    },
    async findOne(filter) {
      const record = records.find((item) => Object.entries(filter).every(([key, value]) => String(item[key]) === String(value)));
      return record ? structuredClone(record) : null;
    },
    async findOneAndUpdate(filter, update) {
      const record = records.find((item) => Object.entries(filter).every(([key, value]) => String(item[key]) === String(value)));
      if (!record) return null;
      Object.assign(record, update.$set || {});
      return structuredClone(record);
    }
  };
}

test("request fingerprints are stable regardless of object key order", () => {
  assert.equal(requestFingerprint({ checkedIn: true, notes: "ok" }), requestFingerprint({ notes: "ok", checkedIn: true }));
});

test("same key and payload returns the existing operation", async () => {
  const model = createModel();
  const input = {
    key: "checkin-operation-key-0001",
    userId: "operator-1",
    method: "PATCH",
    route: "/api/checkin/registrations/:id/checkin",
    resourceId: "registration-1",
    payload: { checkedIn: true, notes: "" },
    model
  };
  const first = await beginIdempotentOperation(input);
  const repeated = await beginIdempotentOperation(input);

  assert.equal(first.state, "claimed");
  assert.equal(repeated.state, "in_progress");
  assert.equal(repeated.record.operationId, first.operationId);
});

test("same key with a different payload is rejected", async () => {
  const model = createModel();
  const input = {
    key: "checkin-operation-key-0002",
    userId: "operator-1",
    method: "PATCH",
    route: "/api/checkin/registrations/:id/checkin",
    resourceId: "registration-1",
    payload: { checkedIn: true },
    model
  };
  await beginIdempotentOperation(input);
  const repeated = await beginIdempotentOperation({ ...input, payload: { checkedIn: false } });
  assert.equal(repeated.state, "mismatch");
});

test("completed operations are replayable without a second claim", async () => {
  const model = createModel();
  const input = {
    key: "checkin-operation-key-0003",
    userId: "operator-1",
    method: "PATCH",
    route: "/api/checkin/registrations/:id/checkin",
    resourceId: "registration-1",
    payload: { checkedIn: true },
    model
  };
  const first = await beginIdempotentOperation(input);
  await completeIdempotentOperation({
    recordId: first.record._id,
    responseStatus: 200,
    resultCode: "UPDATED",
    model
  });
  const replay = await beginIdempotentOperation(input);
  assert.equal(replay.state, "completed");
  assert.equal(replay.record.operationId, first.operationId);
});
