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
    role: {
      type: String,
      // role is an ACCESS TIER, not a job title. It only needs to answer
      // "what can this person see/do" (admin dashboard, staff dashboard,
      // tenant portal, or public/guest). The actual job title the admin
      // types in ("Front Desk Lead", "Night Security", etc.) lives on
      // StaffProfile.position as free text — it never gets written here,
      // so it never needs to match this enum.
      enum: ["admin", "staff", "tenant", "guest"],
      default: "tenant",
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

    resetPasswordToken:   { type: String  },
    resetPasswordExpires: { type: Date    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);