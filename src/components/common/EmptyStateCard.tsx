import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

export const EmptyStateCard = ({ icon: Icon, title, description, children }: EmptyStateCardProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-xl">{title}</h3>
          <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
};
