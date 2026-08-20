"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

export interface GalleryPhoto {
  url: string;
  caption: string;
}

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
  // Set false to skip rendering the built-in thumbnail grid — use this
  // when a page (like the unit detail page) has its own thumbnail strip
  // and just wants the lightbox overlay + open/close control.
  showGrid?: boolean;
  // Controlled-open support, for callers with their own trigger UI
  // (e.g. clicking a hero image). When provided, the lightbox opens
  // whenever `open` is true, starting at `startIndex`, and calls
  // `onClose` when dismissed. Navigation (arrows/keyboard) is always
  // handled internally regardless of how the lightbox was opened.
  open?: boolean;
  startIndex?: number;
  onClose?: () => void;
}

export default function GalleryLightbox({
  photos,
  showGrid = true,
  open,
  startIndex = 0,
  onClose,
}: GalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [entering, setEntering] = useState(false);

  // Sync controlled-open prop → internal state, so navigation logic
  // below only ever has to deal with one source of truth.
  useEffect(() => {
    if (open) {
      setActiveIndex(startIndex);
    } else if (open === false) {
      setActiveIndex(null);
    }
    // Only re-sync when `open` itself flips, not on every startIndex
    // change while already open — that would fight internal navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = useCallback(() => {
    setActiveIndex(null);
    setZoomed(false);
    onClose?.();
  }, [onClose]);

  const showNext = useCallback(() => {
    setZoomed(false);
    setActiveIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  const showPrev = useCallback(() => {
    setZoomed(false);
    setActiveIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);

  // Fade/scale-in animation whenever the lightbox opens
  useEffect(() => {
    if (activeIndex !== null) {
      setEntering(true);
      const t = setTimeout(() => setEntering(false), 20);
      return () => clearTimeout(t);
    }
  }, [activeIndex]);

  // Keyboard navigation: arrow keys + Escape
  useEffect(() => {
    if (activeIndex === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") showNext();
      else if (e.key === "ArrowLeft") showPrev();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, close, showNext, showPrev]);

  return (
    <>
      {showGrid && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {photos.map((photo, index) => (
            <button
              key={`${photo.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="relative aspect-square rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
            >
              <Image
                src={photo.url}
                alt={photo.caption}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover group-hover:scale-110 transition duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
            </button>
          ))}
        </div>
      )}

      {activeIndex !== null && photos[activeIndex] && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 transition-opacity duration-200 ${
            entering ? "opacity-0" : "opacity-100"
          }`}
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close"
            className="absolute top-5 right-5 text-white/80 hover:text-white text-3xl leading-none z-10"
          >
            &times;
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
              aria-label="Previous photo"
              className="absolute left-3 md:left-8 text-white/70 hover:text-white text-4xl leading-none px-2 z-10"
            >
              &#8249;
            </button>
          )}

          <div
            className={`relative w-full max-w-4xl aspect-[4/3] transition-transform duration-300 ease-out ${
              zoomed ? "cursor-zoom-out scale-125 md:scale-150" : "cursor-zoom-in"
            } ${entering ? "scale-95" : zoomed ? "" : "scale-100"}`}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
          >
            <Image
              src={photos[activeIndex].url}
              alt={photos[activeIndex].caption}
              fill
              sizes="90vw"
              className="object-contain transition-transform duration-300"
            />
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              aria-label="Next photo"
              className="absolute right-3 md:right-8 text-white/70 hover:text-white text-4xl leading-none px-2 z-10"
            >
              &#8250;
            </button>
          )}

          {photos[activeIndex].caption && !zoomed && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm text-center px-4">
              {photos[activeIndex].caption}
            </p>
          )}

          {photos.length > 1 && (
            <p className="absolute bottom-6 right-6 text-white/50 text-xs hidden md:block">
              {activeIndex + 1} / {photos.length} · use ← → keys · click photo to zoom
            </p>
          )}
        </div>
      )}
    </>
  );
}