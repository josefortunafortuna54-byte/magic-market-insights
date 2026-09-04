import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonListProps {
  count?: number;
  variant?: "card" | "row";
}

export function SkeletonList({ count = 5, variant = "row" }: SkeletonListProps) {
  if (variant === "card") {
    return (
      <div className="mb-4 flex flex-wrap gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-[47%] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}
