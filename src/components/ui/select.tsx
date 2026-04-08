import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

interface SelectProps<T extends string> {
  className?: string;
  options: Array<SelectOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
}

export const Select = <T extends string>({ className, options, value, onValueChange }: SelectProps<T>) => {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-11 w-full appearance-none rounded-2xl border border-border bg-card px-4 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => onValueChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};
