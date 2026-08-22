import { motion } from "framer-motion";

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
    className={`rounded-2xl border border-border bg-surface-elevated overflow-hidden ${className}`}
  >
    <div
      className="flex items-center gap-2 px-5 py-3 border-b border-border"
      style={{ borderTopColor: accent, borderTopWidth: "2px" }}
    >
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-text-subtitle">
        {header}
      </span>
    </div>
    <div className="divide-y divide-border">{children}</div>
  </motion.div>
);

export default SettingsGroup;
