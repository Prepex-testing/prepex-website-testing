import type { ReactNode } from "react";
import { RefreshIcon, SmileIcon } from "@/components/ui/icons";
import {
  ClockIcon,
  CalendarIcon,
  TargetIcon,
  BellIcon,
  EditIcons,
  Patners,
  StarIcon,
} from "@/assets/icons";

/**
 * Icon per notification preference group (ids come from the server's
 * notification.registry.ts). Shared by the full settings screen and the
 * profile page's shortlist so one notification never wears two faces.
 *
 * A group with no entry here falls back to the bell rather than rendering
 * nothing — new groups arrive from the server without a client release, so
 * the missing case is normal, not a bug.
 */
export const NOTIFICATION_GROUP_ICONS: Record<string, ReactNode> = {
  "plan-ready": <CalendarIcon />,
  "mock-reminders": <TargetIcon />,
  "recovery-week": <RefreshIcon />,
  "wellbeing-support": <SmileIcon />,
  "streak-milestones": <StarIcon />,
  "win-journal": <EditIcons />,
  "backlog-nudges": <ClockIcon />,
  "partner-messages": <Patners />,
  "partner-activity": <Patners />,
  "partner-goals": <TargetIcon />,
  "partner-matching": <Patners />,
};

export function notificationGroupIcon(groupId: string): ReactNode {
  return NOTIFICATION_GROUP_ICONS[groupId] ?? <BellIcon />;
}
