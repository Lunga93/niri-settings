import { motion } from "framer-motion";
import React from "react";

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onToggle: (checked: boolean) => void;
  readonly disabled?: boolean;
}

const ToggleSwitch = ({
  checked,
  onToggle,
  disabled = false,
}: ToggleSwitchProps): React.JSX.Element => (
  <button
    onClick={(): void => {
      if (!disabled) onToggle(!checked);
    }}
    disabled={disabled}
    className={`
      relative h-6.5 w-11.5 shrink-0 rounded-full p-0.75
      transition-colors duration-200 cursor-pointer
      ${checked ? "bg-accent" : "bg-surface-active"}
      ${disabled ? "opacity-40 cursor-not-allowed" : ""}
    `}
  >
    <motion.div
      className="h-5 w-5 rounded-full bg-white shadow-md"
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </button>
);

export default ToggleSwitch;
