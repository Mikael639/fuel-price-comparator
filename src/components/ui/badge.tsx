import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary-foreground",
        accent: "bg-accent text-accent-foreground",
        outline: "border border-border bg-background text-foreground",
        success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        danger: "bg-red-500/15 text-red-700 dark:text-red-300",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
