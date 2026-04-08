import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-[22px] border px-4 py-4 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      info: "border-sky-300/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
      warning: "border-amber-300/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      error: "border-red-300/30 bg-red-500/10 text-red-800 dark:text-red-200",
      success: "border-emerald-300/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export const Alert = ({ className, variant, ...props }: AlertProps) => {
  return <div className={cn(alertVariants({ variant }), className)} role="alert" {...props} />;
};
