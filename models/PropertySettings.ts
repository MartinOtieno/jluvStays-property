// room-booking/models/PropertySettings.ts

import mongoose from "mongoose";

const propertySettingsSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name:        { type: String, default: "JluvStays" },
    tagline:     { type: String, default: "" },
    description: { type: String, default: "" },
    logo:        { type: String, default: "" },
    primaryColor:{ type: String, default: "#2563EB" },

    // ── Contact ───────────────────────────────────────────────────────────────
    phone:    { type: String, default: "" },
    email:    { type: String, default: "" },
    whatsapp: { type: String, default: "" },

    // ── Address ───────────────────────────────────────────────────────────────
    address: {
      street:  { type: String, default: "" },
      estate:  { type: String, default: "" },
      city:    { type: String, default: "Chicago" },
      mapsUrl: { type: String, default: "" },
    },

    // ── Business hours ────────────────────────────────────────────────────────
    businessHours: [
      {
        day:  { type: String, required: true },
        open: { type: Boolean, default: true },
        from: { type: String, default: "08:00" },
        to:   { type: String, default: "17:00" },
      },
    ],

    // ── Social media ──────────────────────────────────────────────────────────
    social: {
      facebook:  { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter:   { type: String, default: "" },
      tiktok:    { type: String, default: "" },
    },

    // ── About-page content ────────────────────────────────────────────────────
    buildingPhotos: [
      {
        src:   { type: String, required: true },
        label: { type: String, required: true },
      },
    ],

    highlights: [
      {
        icon:        { type: String, required: true },
        title:       { type: String, required: true },
        description: { type: String, required: true },
      },
    ],

    rules: [{ type: String }],

    nearbyPlaces: [
      {
        icon:  { type: String, required: true },
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.PropertySettings ||
  mongoose.model("PropertySettings", propertySettingsSchema);