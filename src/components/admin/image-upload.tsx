"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, isSupabaseConfigured } from "@/lib/env";
import { mediaUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Uploads an image to the public `media` bucket and stores the object path.
 * Also accepts a pasted external URL (e.g. a partner's own logo) without an
 * upload. The stored value is either a bucket path or an absolute URL; mediaUrl()
 * resolves both.
 */
export function ImageUpload({
  value,
  onChange,
  folder = "media",
  label = "Image",
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  folder?: string;
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const preview = mediaUrl(value);

  const upload = async (file: File) => {
    if (!isSupabaseConfigured()) {
      toast("Stockage non configuré. Collez une URL d'image à la place.", "error");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const rand = Math.random().toString(36).slice(2, 9);
      const path = `${folder}/${Date.now()}-${rand}.${ext}`;
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      onChange(path);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec du téléversement.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <p className="mb-1.5 text-sm font-medium text-steel-700">{label}</p>
      <div className="flex items-start gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-steel-200 bg-steel-50">
          {preview ? (
            <>
              <img src={preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-steel-600 shadow hover:text-red-600"
                aria-label="Retirer l'image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-steel-400" />
          ) : (
            <ImagePlus className="h-7 w-7 text-steel-300" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-steel-200 bg-white px-4 text-sm font-semibold text-steel-700 hover:bg-steel-50 disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Téléversement…" : "Téléverser une image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <input
              type="url"
              value={value && value.startsWith("http") ? value : ""}
              onChange={(e) => onChange(e.target.value || null)}
              placeholder="… ou coller une URL d'image"
              className="h-10 w-full rounded-xl border border-steel-200 bg-white pl-9 pr-3 text-sm focus:border-cobalt-400 focus:outline-none focus:ring-2 focus:ring-cobalt-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
