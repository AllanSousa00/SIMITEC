import mongoose from "mongoose";

const capacityReservationSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    activitySlug: { type: String, required: true },
    period: { type: String, required: true },
    capacity: { type: Number, required: true, min: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

capacityReservationSchema.index({ eventId: 1, activitySlug: 1, period: 1 }, { unique: true });

export const CapacityReservation = mongoose.model("CapacityReservation", capacityReservationSchema);
