// app/gallery/page.tsx

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import GalleryLightbox, { GalleryPhoto } from "@/app/components/GalleryLightbox";

interface BuildingPhotoApiShape {
  src:   string;
  label: string;
}

async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res  = await fetch(base + "/api/property-settings", { cache: "no-store" });
    const data = res.ok ? await res.json() : { success: false };

    if (!data.success || !Array.isArray(data.data?.buildingPhotos)) return [];

    return data.data.buildingPhotos.map((photo: BuildingPhotoApiShape) => ({
      url:     photo.src,
      caption: photo.label || "Property photo",
    }));
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const photos = await getGalleryPhotos();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[#7A1B0F] font-semibold text-sm uppercase tracking-wide">
            Take a Look
          </span>

          <h1 className="text-4xl font-bold text-gray-900 mt-2 mb-4">
            Gallery
          </h1>

          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            A look inside 6142 S Rhodes Ave, Chicago, IL — long term, mid term,
            and short term spaces.
          </p>

          {photos.length > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} — click any
              image to zoom in
            </p>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <p className="text-5xl mb-4">📷</p>
            <p className="text-gray-500">
              No photos to show yet. Check back soon!
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Add some in the admin Property Settings page under the Photos tab.
            </p>
          </div>
        ) : (
          <GalleryLightbox photos={photos} />
        )}
      </section>

      <Footer />
    </div>
  );
}