// room-booking/app/api/property-settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PropertySettings from "@/models/PropertySettings";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_HOURS = DAYS.map(day => ({
  day, open: !["Saturday","Sunday"].includes(day), from: "08:00", to: "17:00",
}));

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();
    const settings = await PropertySettings.findOne();

    return NextResponse.json({
      success: true,
      data: settings ?? {
        name: "JluvStays", tagline: "", description: "",
        logo: "", primaryColor: "#2563EB",
        phone: "", email: "", whatsapp: "",
        address: { street: "", estate: "", city: "Nairobi", mapsUrl: "" },
        businessHours: DEFAULT_HOURS,
        social: { facebook: "", instagram: "", twitter: "", tiktok: "" },
        buildingPhotos: [], highlights: [], rules: [], nearbyPlaces: [],
      },
    });
  } catch (error) {
    console.error("GET /api/property-settings error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch settings" }, { status: 500 });
  }
}

// ── PUT — used by admin settings page ─────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const settings = await PropertySettings.findOneAndUpdate(
      {},
      { $set: body },
      { returnDocument: "after", upsert: true, runValidators: false }
    );

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("PUT /api/property-settings error:", error);
    return NextResponse.json({ success: false, message: "Failed to save settings" }, { status: 500 });
  }
}

// ── POST — keep backward compat for any existing callers ─────────────────────
export async function POST(req: NextRequest) {
  return PUT(req);
}