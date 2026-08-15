import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import heicConvert from "heic-convert";

// ==============================
// Cloudinary Config
// ==============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ==============================
// Convert HEIC → JPG helper
// ==============================
async function convertIfHeic(file: File): Promise<Buffer> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/heic" || file.type === "image/heif") {
    const jpgBuffer = await heicConvert({
      buffer,
      format: "JPEG",
      quality: 0.9, // slightly compressed for better performance
    });

    return Buffer.from(jpgBuffer);
  }

  return buffer;
}

// ==============================
// POST Upload Handler
// ==============================
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files uploaded" },
        { status: 400 }
      );
    }

    const uploadedImages: { url: string }[] = [];

    for (const file of files) {
      // ==============================
      // Validate file type
      // ==============================
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/heic",
        "image/heif",
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message: "Only JPG, PNG, WebP, HEIC allowed",
          },
          { status: 400 }
        );
      }

      // ==============================
      // Validate file size (5MB max)
      // ==============================
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: "Each file must be under 5MB",
          },
          { status: 400 }
        );
      }

      // ==============================
      // Convert if needed (HEIC fix)
      // ==============================
      const buffer = await convertIfHeic(file);

      // ==============================
      // Upload to Cloudinary with optimization
      // ==============================
      const uploadResult: any = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "rooms",

              // 🚀 Image optimization
              transformation: [
                { quality: "auto:good" }, // auto compression
                { fetch_format: "auto" },  // auto WebP where possible
                { width: 1600, crop: "limit" }, // prevent huge images
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      uploadedImages.push({
        url: uploadResult.secure_url,
      });
    }

    return NextResponse.json(
      {
        success: true,
        images: uploadedImages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 }
    );
  }
}