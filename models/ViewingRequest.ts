// room-booking/models/ViewingRequest.ts

import mongoose from "mongoose";
import "./User"; // ensures User schema is always registered for populate
import "./Unit"; // ensures Unit schema is always registered for populate

// Viewing requests only exist for long_term and mid_term units —
// short_term never has one (tenants book a Room directly instead). The
// two allowed types each have exactly one viewing mode:
//   mid_term  -> virtual
//   long_term -> in_person
// rentalType and mode are both stored (not just derived from the unit at
// read time) so a request's original terms don't silently change if the
// unit's config changes later, and so admin views can filter/display
// without an extra populate.
const viewingRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    rentalType: {
      type: String,
      enum: ["long_term", "mid_term"],
      required: true,
    },
    mode: {
      type: String,
      enum: ["virtual", "in_person"],
      required: true,
      validate: {
        // Defense in depth — the API route is the primary place this is
        // enforced (it derives mode from rentalType server-side rather
        // than trusting client input), but this catches any other write
        // path too.
        validator: function (this: { rentalType?: string }, value: string) {
          if (this.rentalType === "mid_term") return value === "virtual";
          if (this.rentalType === "long_term") return value === "in_person";
          return false;
        },
        message: "mode must be 'virtual' for mid_term or 'in_person' for long_term",
      },
    },
    message: {
      type: String,
      default: "",
    },
    preferredDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.ViewingRequest ||
  mongoose.model("ViewingRequest", viewingRequestSchema);