import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  className?: string;
}

export const SectionHeading = ({ eyebrow, title, subtitle, className }: SectionHeadingProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h2>
      <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{subtitle}</p>
    </div>
  );
};
