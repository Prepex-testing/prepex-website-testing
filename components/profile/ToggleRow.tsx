import type { ReactNode } from "react";
import { Switch } from "@/components/ui/Switch";
import { SettingRow } from "@/components/profile/SettingRow";

type ToggleRowProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  iconClassName?: string;
};

export function ToggleRow({ icon, title, subtitle, checked, onChange, iconClassName }: ToggleRowProps) {
  return (
    <SettingRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      iconClassName={iconClassName}
      right={<Switch checked={checked} onChange={onChange} label={title} />}
    />
  );
}
