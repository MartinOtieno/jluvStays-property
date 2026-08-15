// room-booking/models/StaffProfile.ts

import mongoose from "mongoose";

const staffProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    employeeNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Free-text job title — the admin types this directly (e.g. "Property
    // Manager", "Night Security Lead", "Head Housekeeper"). This is purely
    // a display label now. It is intentionally NOT used anywhere for
    // access control — that's what User.role ("admin" | "staff" | "tenant"
    // | "guest") is for. Keeping this free of an enum is what lets admins
    // type any title without needing a schema change every time a new
    // role name comes up.
    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    department: {
      type: String,
      default: "",
    },

    hireDate: {
      type: Date,
      required: true,
    },

    salary: {
      type: Number,
      default: 0,
    },

    emergencyContact: {
      name:         { type: String, default: "" },
      phone:        { type: String, default: "" },
      relationship: { type: String, default: "" },
    },

    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.StaffProfile ||
  mongoose.model("StaffProfile", staffProfileSchema);