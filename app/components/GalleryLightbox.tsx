"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export interface GalleryPhoto {
  url: string;
  caption: string;
}

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
}

export default function GalleryLightbox({ photos }: GalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);

  const showPrev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const showNext = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  // Keyboard navigation — arrow keys move through photos, Escape closes.
  useEffect(() => {
    if (activeIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, close, showPrev, showNext]);

  // Lock page scroll while the lightbox is open.
  useEffect(() => {
    if (activeIndex === null) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [activeIndex]);

  const active = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      {/* ── Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {photos.map((photo, index) => (
          <button
            key={`${photo.url}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Open photo: ${photo.caption}`}
            className="group text-left rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1B0F] focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
              <Image
                src={photo.url}
                alt={photo.caption}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              />

              {/* Subtle darken on hover, purely for contrast with the corner brackets */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

              {/* Viewfinder corner brackets — signature hover detail */}
              <span className="pointer-events-none absolute inset-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/90" />
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/90" />
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/90" />
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/90" />
              </span>
            </div>

            {/* Caption — always visible, not just on hover */}
            <p className="px-3 py-2.5 text-sm font-medium text-gray-800 truncate">
              {photo.caption}
            </p>
          </button>
        ))}
      </div>

      {/* ── Lightbox ── */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || "Photo viewer"}
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={close}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 text-white/80 text-sm shrink-0">
            <span className="font-medium tabular-nums">
              {activeIndex! + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image stage */}
          <div
            className="relative flex-1 flex items-center justify-center px-3 sm:px-16 pb-4 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.length > 1 && (
              <button
                type="button"
                onClick={showPrev}
                aria-label="Previous photo"
                className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <div className="relative w-full h-full max-w-5xl">
              <Image
                key={active.url}
                src={active.url}
                alt={active.caption}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={showNext}
                aria-label="Next photo"
                className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Caption */}
          {active.caption && (
            <p className="text-center text-white/70 text-sm pb-6 px-4 shrink-0">{active.caption}</p>
          )}
        </div>
      )}
    </>
  );
}