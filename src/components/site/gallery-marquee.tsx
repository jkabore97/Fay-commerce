"use client";

import { cn } from "@/lib/utils";
import { GALLERY_ALL } from "@/lib/catalog-images";

function Row({ images, dir }: { images: string[]; dir: "left" | "right" }) {
  // Two copies back-to-back so a -50% translate loops seamlessly.
  const doubled = [...images, ...images];
  return (
    <div className="group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div
        className={cn(
          "flex w-max shrink-0 gap-4 pr-4",
          dir === "left" ? "animate-marquee-left" : "animate-marquee-right",
          "group-hover:[animation-play-state:paused]",
        )}
      >
        {doubled.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="flex h-28 w-36 shrink-0 items-center justify-center rounded-2xl border border-steel-100 bg-white p-3 shadow-card transition-transform duration-300 hover:-translate-y-1"
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two opposing infinite rows of brochure product photography. */
export function GalleryMarquee() {
  const half = Math.ceil(GALLERY_ALL.length / 2);
  return (
    <div className="space-y-4">
      <Row images={GALLERY_ALL.slice(0, half)} dir="left" />
      <Row images={GALLERY_ALL.slice(half)} dir="right" />
    </div>
  );
}
