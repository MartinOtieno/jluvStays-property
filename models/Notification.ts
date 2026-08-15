// models/Notification.ts
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "booking_confirmed",
        "booking_cancelled",
        "booking_pending",
        "checkin_reminder",
        "checkout_reminder",
        "viewing_approved",
        "viewing_rejected",
        "viewing_pending",
        "welcome",
        "general",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Optional link to navigate to when notification is clicked
    link: {
      type: String,
      default: "",
    },
    // Optional reference to related document
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    refModel: {
      type: String,
      enum: ["Booking", "ViewingRequest", null],
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);