import { motion } from "framer-motion";
import React from "react";

interface SettingsGroupProps {
  readonly header: string;
  readonly accent?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

const SettingsGroup = ({
  header,
  accent = "var(--color-accent)",
  children,
  className = "",
}: SettingsGroupProps): React.JSX.Element => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className={`rounded-2xl border border-border card-glass overflow-hidden ${className}`}
  >
    <div
      className="relative flex items-center gap-2 px-5 py-3 border-b border-border"
      style={{
        background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 14%, transparent), transparent 55%)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accent, opacity: 0.85 }}
      />
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
      />
      <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-text-subtitle">
        {header}
      </span>
    </div>
    <div className="divide-y divide-border">{children}</div>
  </motion.div>
);

export default SettingsGroup;
