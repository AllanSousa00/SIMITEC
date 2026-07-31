import assert from "node:assert/strict";
import test from "node:test";
import { reserveCapacity } from "../../src/services/capacityReservations.js";

function createCapacityModel() {
  let counter = null;
  return {
    async findOne() { return counter ? structuredClone(counter) : null; },
    async create(value) {
      if (counter) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      counter = { ...value, _id: "capacity-1" };
      return structuredClone(counter);
    },
    async updateOne(_filter, update) {
      Object.assign(counter, update.$set || {});
    },
    async findOneAndUpdate(filter, update) {
      if (!counter || counter.reserved > filter.reserved.$lte) return null;
      Object.assign(counter, update.$set || {});
      counter.reserved += update.$inc.reserved;
      return structuredClone(counter);
    },
    snapshot: () => structuredClone(counter)
  };
}

test("only the remaining seat can be reserved under concurrent requests", async () => {
  const model = createCapacityModel();
  const results = await Promise.all(Array.from({ length: 100 }, () => reserveCapacity({
    eventId: "simitec-2026",
    activitySlug: "area-1",
    period: "Manhã",
    capacity: 1,
    countExisting: async () => 0,
    model
  })));
  assert.equal(results.filter((result) => result.reserved).length, 1);
  assert.equal(model.snapshot().reserved, 1);
});

test("existing registrations seed a counter before the first new reservation", async () => {
  const model = createCapacityModel();
  const result = await reserveCapacity({
    eventId: "simitec-2026",
    activitySlug: "area-1",
    period: "Tarde",
    capacity: 3,
    countExisting: async () => 2,
    model
  });
  assert.equal(result.reserved, true);
  assert.equal(model.snapshot().reserved, 3);
});
