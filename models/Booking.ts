import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { RentalType } from "./Unit";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PriceUnit = "month" | "night";

/**
 * Booking is unified across all three rental types, but exactly one of
 * `unit` or `room` is set, never both:
 *
 *   - long_term / mid_term -> `unit` set, `room` null
 *   - short_term            -> `room` set, `unit` null
 *     (the parent unit is still derivable via room.unit if needed for
 *      reporting/dashboards, so we don't duplicate it here)
 *
 * moveInDate/moveOutDate are used for BOTH the quiz's availability search
 * and the actual stay dates once booked — same fields, same overlap query,
 * for daily, monthly, or yearly stays.
 *
 * viewingRequest: long_term/mid_term bookings require a completed viewing
 * request before a booking can be confirmed — short_term skips this
 * entirely per your spec, so the field stays null for short_term bookings.
 */
export interface IBooking extends Document {
  rentalType: RentalType;
  unit: Types.ObjectId | null;
  room: Types.ObjectId | null;
  tenant: Types.ObjectId;
  moveInDate: Date;
  moveOutDate: Date;
  viewingRequest: Types.ObjectId | null;
  status: BookingStatus;
  price: number;
  priceUnit: PriceUnit;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// Shape for the static overlap-check helper below.
interface HasOverlapArgs {
  unit?: Types.ObjectId | string | null;
  room?: Types.ObjectId | string | null;
  moveInDate: Date;
  moveOutDate: Date;
  excludeBookingId?: Types.ObjectId | string | null;
}

interface BookingModel extends Model<IBooking> {
  hasOverlap(args: HasOverlapArgs): Promise<boolean>;
}

const bookingSchema = new Schema<IBooking, BookingModel>(
  {
    rentalType: {
      type: String,
      enum: ["long_term", "mid_term", "short_term"],
      required: true,
    },

    unit: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: function (this: IBooking) {
        return this.rentalType !== "short_term";
      },
      default: null,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: function (this: IBooking) {
        return this.rentalType === "short_term";
      },
      default: null,
    },

    tenant: { type: Schema.Types.ObjectId, ref: "User", required: true },

    moveInDate: { type: Date, required: true },
    moveOutDate: { type: Date, required: true },

    viewingRequest: {
      type: Schema.Types.ObjectId,
      ref: "ViewingRequest",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },

    price: { type: Number, required: true },
    priceUnit: { type: String, enum: ["month", "night"], required: true },
    currency: { type: String, default: "USD" },
  },
  { timestamps: true }
);

bookingSchema.index({ unit: 1, moveInDate: 1, moveOutDate: 1 });
bookingSchema.index({ room: 1, moveInDate: 1, moveOutDate: 1 });

/**
 * Core availability check: does ANY existing, non-cancelled booking on this
 * unit/room overlap the requested [moveInDate, moveOutDate) range?
 *
 * Usage:
 *   const isBooked = await Booking.hasOverlap({ room: roomId, moveInDate, moveOutDate });
 *   const isBooked = await Booking.hasOverlap({ unit: unitId, moveInDate, moveOutDate });
 */
bookingSchema.statics.hasOverlap = async function (
  this: BookingModel,
  { unit = null, room = null, moveInDate, moveOutDate, excludeBookingId = null }: HasOverlapArgs
): Promise<boolean> {
  const match: Record<string, unknown> = {
    status: { $in: ["pending", "confirmed"] },
    moveInDate: { $lt: moveOutDate },
    moveOutDate: { $gt: moveInDate },
  };
  if (unit) match.unit = unit;
  if (room) match.room = room;
  if (excludeBookingId) match._id = { $ne: excludeBookingId };

  const conflict = await this.findOne(match).select("_id").lean();
  return Boolean(conflict);
};

const Booking =
  (mongoose.models.Booking as BookingModel) ||
  mongoose.model<IBooking, BookingModel>("Booking", bookingSchema);

export default Booking;