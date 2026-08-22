import { motion } from "framer-motion";

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
      relative h-[26px] w-[46px] shrink-0 rounded-full p-[3px]
      transition-colors duration-200 cursor-pointer
      ${checked ? "bg-accent" : "bg-surface-active"}
      ${disabled ? "opacity-40 cursor-not-allowed" : ""}
    `}
  >
    <motion.div
      className="h-[20px] w-[20px] rounded-full bg-white shadow-md"
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </button>
);

export default ToggleSwitch;
