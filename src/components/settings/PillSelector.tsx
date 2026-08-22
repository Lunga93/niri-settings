import { motion } from "framer-motion";
import React from "react";

interface PillSelectorProps {
  readonly options: readonly string[];
  readonly currentIndex: number;
  readonly onSelected: (index: number) => void;
}

const PillSelector = ({
  options,
  currentIndex,
  onSelected,
}: PillSelectorProps): React.JSX.Element => (
  <div className="flex gap-1 rounded-xl bg-surface-active p-1">
    {options.map((label, i) => {
      const isActive = i === currentIndex;
      return (
        <button
          key={label}
          onClick={(): void => onSelected(i)}
          className={`
            relative px-4 py-1.5 rounded-lg text-[12px] font-medium
            transition-colors duration-150 cursor-pointer
            ${isActive ? "text-text-header" : "text-text-subtitle hover:text-text-body"}
          `}
        >
          {isActive && (
            <motion.div
              layoutId="pill-bg"
              className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30"
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      );
    })}
  </div>
);

export default PillSelector;
