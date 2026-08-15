import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RentalType = "long_term" | "mid_term" | "short_term";

// NOTE: address removed — every unit is in the same single building, so
// address is no longer per-unit data. See lib/building.ts for the shared
// building address used across the site instead.

/**
 * Unit = one physical 2-bedroom apartment within the building (renamed
 * from "Property" — the site manages units inside a single building, not
 * separate standalone properties).
 *
 * rentalType is fixed at creation time (units are designated ahead of
 * time, not switched later):
 *   - "long_term"  -> whole unit, tenant brings own furniture, priced monthly
 *   - "mid_term"   -> whole unit, fully furnished by host, priced monthly
 *   - "short_term" -> unit is split into individually-bookable Rooms
 *                     (see Room.ts). The Unit itself is NOT directly
 *                     bookable in this case — its Rooms are.
 *
 * For long_term / mid_term, Unit IS the bookable entity (see Booking.ts,
 * where bookings reference unitId directly and roomId is null).
 */
export interface IUnit extends Document {
  title: string;
  description: string;
  rentalType: RentalType;
  bedrooms: number;
  pricePerMonth?: number; // required for long_term / mid_term only
  currency: string;
  furnished?: boolean; // required for long_term / mid_term only (short_term furnishing lives on Room)
  images: string[];
  amenities: string[];
  owner: Types.ObjectId;
  status: "active" | "inactive" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    rentalType: {
      type: String,
      enum: ["long_term", "mid_term", "short_term"],
      required: true,
      immutable: true, // enforce "fixed at listing time" at the schema level
    },

    bedrooms: { type: Number, default: 2 },

    // Applies to long_term / mid_term only. Short term pricing lives on
    // the Room subdocuments/collection instead, since price is per-room.
    pricePerMonth: {
      type: Number,
      required: function (this: IUnit) {
        return this.rentalType === "long_term" || this.rentalType === "mid_term";
      },
    },
    currency: { type: String, default: "USD" },

    // Whether the HOST furnishes it. long_term = false (tenant furnishes),
    // mid_term = true. Surfaced in the unit description per your requirement.
    furnished: {
      type: Boolean,
      required: function (this: IUnit) {
        return this.rentalType !== "short_term"; // short term furnishing lives on Room
      },
    },

    images: [{ type: String }], // Cloudinary URLs
    amenities: [{ type: String }],

    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

unitSchema.index({ rentalType: 1, status: 1 });

const Unit: Model<IUnit> = mongoose.models.Unit || mongoose.model<IUnit>("Unit", unitSchema);

export default Unit;