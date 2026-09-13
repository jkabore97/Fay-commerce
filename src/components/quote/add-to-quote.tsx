"use client";

import { useState } from "react";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useQuote, type QuoteItem } from "./quote-context";
import { cn } from "@/lib/utils";

export function AddToQuote({
  item,
  size = "md",
  withQuantity = false,
  className,
}: {
  item: Omit<QuoteItem, "quantity">;
  size?: "sm" | "md" | "lg";
  withQuantity?: boolean;
  className?: string;
}) {
  const { add, has } = useQuote();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const inCart = has(item.slug);

  const handleAdd = () => {
    add(item, withQuantity ? qty : 1);
    toast(`« ${item.name} » ajouté à votre demande de devis`, "success");
  };

  if (withQuantity) {
    return (
      <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
        <div className="inline-flex h-11 items-center rounded-xl border border-steel-200 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-full w-11 items-center justify-center text-steel-500 hover:text-steel-900"
            aria-label="Diminuer"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) =>
              setQty(Math.max(1, parseInt(e.target.value || "1", 10)))
            }
            className="h-full w-14 border-x border-steel-200 text-center text-sm font-semibold text-steel-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-full w-11 items-center justify-center text-steel-500 hover:text-steel-900"
            aria-label="Augmenter"
          >
            +
          </button>
        </div>
        <Button size={size} onClick={handleAdd} className="flex-1">
          <ShoppingCart className="h-4 w-4" />
          Ajouter à ma demande
        </Button>
      </div>
    );
  }

  return (
    <Button
      size={size}
      variant={inCart ? "outline" : "primary"}
      onClick={handleAdd}
      className={className}
    >
      {inCart ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {inCart ? "Dans la demande" : "Ajouter au devis"}
    </Button>
  );
}
