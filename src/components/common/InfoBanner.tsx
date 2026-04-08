import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";

type InfoBannerVariant = "error" | "info" | "warning" | "success";

export interface InfoBannerMessage {
  key: string;
  message: string | null;
  variant: InfoBannerVariant;
}

interface InfoBannerProps {
  messages: InfoBannerMessage[];
}

export const InfoBanner = ({ messages }: InfoBannerProps) => {
  const visibleMessages = messages.filter((message) => Boolean(message.message));

  if (visibleMessages.length === 0) {
    return null;
  }

  const appearance = {
    error: {
      icon: ShieldAlert,
      className: "shadow-red-500/5",
    },
    info: {
      icon: Info,
      className: "shadow-sky-500/5",
    },
    warning: {
      icon: AlertTriangle,
      className: "shadow-amber-500/5",
    },
    success: {
      icon: CheckCircle2,
      className: "shadow-emerald-500/5",
    },
  } as const;

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2">
      {visibleMessages.map((message) => {
        const Icon = appearance[message.variant].icon;

        return (
          <Alert
            className={`surface-panel flex items-start gap-3 border-white/60 bg-white/85 p-4 shadow-lg dark:border-slate-700/40 dark:bg-slate-900/80 ${appearance[message.variant].className}`}
            key={message.key}
            variant={message.variant}
          >
            <div className="mt-0.5 rounded-2xl bg-white/70 p-2 shadow-sm dark:bg-slate-950/30">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-6">{message.message}</p>
            </div>
          </Alert>
        );
      })}
    </div>
  );
};
