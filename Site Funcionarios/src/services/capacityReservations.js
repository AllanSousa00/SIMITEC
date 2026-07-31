import { CapacityReservation } from "../models/CapacityReservation.js";

function keyFilter({ eventId, activitySlug, period }) {
  return { eventId, activitySlug, period: period || "" };
}

async function findOne(model, filter) {
  const query = model.findOne(filter);
  return query && typeof query.lean === "function" ? query.lean() : query;
}

async function ensureCounter({ eventId, activitySlug, period, capacity, countExisting, model }) {
  const filter = keyFilter({ eventId, activitySlug, period });
  let counter = await findOne(model, filter);
  if (!counter) {
    const reserved = await countExisting();
    try {
      counter = await model.create({ ...filter, capacity, reserved });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      counter = await findOne(model, filter);
    }
  }
  if (!counter) throw new Error("Nao foi possivel inicializar a capacidade da atividade.");
  if (Number(counter.capacity) !== Number(capacity)) {
    await model.updateOne({ _id: counter._id }, { $set: { capacity } });
  }
  return filter;
}

export async function reserveCapacity({
  eventId,
  activitySlug,
  period,
  capacity,
  units = 1,
  countExisting = async () => 0,
  model = CapacityReservation
}) {
  const normalizedCapacity = Number(capacity || 0);
  const normalizedUnits = Math.max(1, Number(units || 1));
  if (!normalizedCapacity) return { limited: false, reserved: true };

  const filter = await ensureCounter({
    eventId,
    activitySlug,
    period,
    capacity: normalizedCapacity,
    countExisting,
    model
  });
  const counter = await model.findOneAndUpdate(
    { ...filter, reserved: { $lte: normalizedCapacity - normalizedUnits } },
    { $set: { capacity: normalizedCapacity }, $inc: { reserved: normalizedUnits } },
    { new: true, runValidators: true }
  );
  return { limited: true, reserved: Boolean(counter), counter };
}

export async function releaseCapacity({ eventId, activitySlug, period, units = 1, model = CapacityReservation }) {
  const filter = keyFilter({ eventId, activitySlug, period });
  return model.findOneAndUpdate(
    { ...filter, reserved: { $gte: Math.max(1, Number(units || 1)) } },
    { $inc: { reserved: -Math.max(1, Number(units || 1)) } },
    { new: true }
  );
}
