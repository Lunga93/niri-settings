import { Info } from "lucide-react";
import React from "react";

interface IntegrationNoticeProps {
  show: boolean;
  title: string;
  message: string;
}

// Inline banner for optional integrations missing on the host machine.
// Lets pages degrade honestly instead of failing silently on setups that
// do not ship this dotfiles suite.
const IntegrationNotice = ({
  show,
  title,
  message,
}: IntegrationNoticeProps): React.JSX.Element | null => {
  if (!show) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-elevated p-4">
      <Info size={15} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-semibold text-text-header">{title}</span>
        <span className="text-[11px] leading-relaxed text-text-body">{message}</span>
      </div>
    </div>
  );
};

export default IntegrationNotice;
