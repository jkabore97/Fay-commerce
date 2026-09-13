import { mediaUrl } from "@/lib/utils";
import type { Partner } from "@/lib/types";

export function PartnersStrip({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
      {partners.map((p) => {
        const logo = mediaUrl(p.logo_url);
        const content = logo ? (
          <img
            src={logo}
            alt={p.name}
            className="h-10 w-auto max-w-[140px] object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
          />
        ) : (
          <span className="rounded-full border border-steel-200 px-4 py-1.5 text-sm font-semibold text-steel-500 transition-colors hover:border-cobalt-300 hover:text-steel-800">
            {p.name}
          </span>
        );
        return p.link_url ? (
          <a key={p.id} href={p.link_url} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        ) : (
          <div key={p.id}>{content}</div>
        );
      })}
    </div>
  );
}
