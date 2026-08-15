import mongoose, { Document, Model, Schema } from "mongoose";

export type MessageStatus = "unread" | "read" | "resolved";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    phone:   { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    status:  { type: String, enum: ["unread", "read", "resolved"] as const, default: "unread" },
  },
  { timestamps: true }
);

const ContactMessage: Model<IContactMessage> =
  mongoose.models.ContactMessage ||
  mongoose.model<IContactMessage>("ContactMessage", ContactMessageSchema);

export default ContactMessage;