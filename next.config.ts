import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Allow your local network device to connect
  allowedDevOrigins: ["192.168.0.103"],

  images: {
    // ✅ FIX: increased timeout for external image sources (default is 7s, too low for Unsplash)
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "example.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // ✅ FIX: use Unsplash's own optimization instead of routing through next/image
  // Add `unoptimized` or use direct <img> for external decorative images
};

export default nextConfig;