import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => {
  return <div className={cn("animate-pulse rounded-[24px] bg-muted", className)} />;
};
