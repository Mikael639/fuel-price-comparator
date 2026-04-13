import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => {
  return <div className={cn("skeleton-premium", className)} />;
};
