import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function NotificationBell() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative h-9 w-9 p-0"
      aria-label="Notifications"
      disabled
    >
      <Bell className="h-5 w-5" />
    </Button>
  );
}
