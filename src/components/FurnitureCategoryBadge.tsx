import { FURNITURE_CATEGORIES, type FurnitureCategory } from "@/lib/data";
import { cn } from "@/lib/utils";

const styles: Record<FurnitureCategory, string> = {
  "base-unit": "bg-blue-50 text-blue-700 ring-blue-600/20",
  "wall-unit": "bg-violet-50 text-violet-700 ring-violet-600/20",
  wardrobe: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  bed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  "tv-cabinet": "bg-amber-50 text-amber-700 ring-amber-600/20",
  other: "bg-slate-50 text-slate-700 ring-slate-600/20",
};

export function FurnitureCategoryBadge({ category, className }: { category: FurnitureCategory; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", styles[category], className)}>
      {FURNITURE_CATEGORIES.find(c => c.id === category)?.label ?? category}
    </span>
  );
}
