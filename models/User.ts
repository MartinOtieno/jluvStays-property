// room-booking/models/User.ts

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ─────────────────────────────────────────────
    // ACCESS TIER
    // ─────────────────────────────────────────────
    // This is NOT the staff's job title.
    //
    // admin  → full system access
    // staff   → controlled by permissions
    // tenant  → tenant portal
    // guest   → public/basic access
    role: {
      type: String,
      enum: ["admin", "staff", "tenant", "guest"],
      default: "tenant",
    },

    // ─────────────────────────────────────────────
    // STAFF PERMISSIONS
    // ─────────────────────────────────────────────
    // These control what a staff member can access.
    //
    // The admin can assign these permissions regardless
    // of whatever job title is entered in StaffProfile.
    permissions: {
      bookings: {
        type: Boolean,
        default: false,
      },

      viewings: {
        type: Boolean,
        default: false,
      },

      rooms: {
        type: Boolean,
        default: false,
      },

      users: {
        type: Boolean,
        default: false,
      },

      staff: {
        type: Boolean,
        default: false,
      },

      reports: {
        type: Boolean,
        default: false,
      },
    },

    photo: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);