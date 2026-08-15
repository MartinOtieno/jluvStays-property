import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Room = a single bookable bedroom within a short_term Unit.
 * Only created for units where rentalType === "short_term".
 *
 * Privacy rule (per your spec): co-tenants in the same unit should NOT
 * see who occupies the other room. currentTenant is therefore populated
 * only in admin/caretaker-facing queries — never returned on tenant-facing
 * endpoints. Enforce this at the API/query layer (e.g. a `.select()` that
 * excludes currentTenant, or a separate populated field only used by
 * staff-role routes), not just in the UI.
 */
export interface IRoom extends Document {
  unit: Types.ObjectId;
  label: string;
  description: string;
  furnished: boolean;
  pricePerNight: number;
  currency: string;
  images: string[];
  currentTenant: Types.ObjectId | null;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    unit: { type: Schema.Types.ObjectId, ref: "Unit", required: true },

    label: { type: String, required: true, trim: true }, // e.g. "Room A"
    description: { type: String, required: true },

    furnished: { type: Boolean, default: true },

    pricePerNight: { type: Number, required: true },
    currency: { type: String, default: "USD" },

    images: [{ type: String }],

    // Denormalized for fast admin/caretaker dashboard lookups. Source of
    // truth for actual occupancy is still the Booking collection —
    // this is a convenience pointer, keep it in sync on booking
    // confirm/cancel.
    currentTenant: { type: Schema.Types.ObjectId, ref: "User", default: null },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

roomSchema.index({ unit: 1 });

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>("Room", roomSchema);

export default Room;