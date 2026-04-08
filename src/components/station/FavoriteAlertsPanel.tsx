import type { FavoriteAlert } from "@/types/station";
import { Alert } from "@/components/ui/alert";

interface FavoriteAlertsPanelProps {
  alerts: FavoriteAlert[];
}

export const FavoriteAlertsPanel = ({ alerts }: FavoriteAlertsPanelProps) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert key={alert.id} variant={alert.severity}>
          <div className="space-y-1">
            <strong className="block">{alert.title}</strong>
            <span>{alert.description}</span>
          </div>
        </Alert>
      ))}
    </div>
  );
};
