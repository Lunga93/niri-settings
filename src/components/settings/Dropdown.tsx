import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
  readonly icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface DropdownProps<T extends string = string> {
  readonly value: T;
  readonly options: readonly DropdownOption<T>[];
  readonly onChange: (value: T) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const Dropdown = <T extends string = string>({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: DropdownProps<T>): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      const target = event.target;
      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return (): void => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (disabled) return;

    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={(): void => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          flex items-center justify-between gap-2.5 rounded-xl border border-border bg-surface-active px-3.5 py-1.5 text-[12px] font-medium text-text-header
          transition-all duration-150 cursor-pointer select-none
          hover:bg-surface-hover hover:border-border-strong
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isOpen ? "border-accent ring-2 ring-accent/20 bg-surface-hover" : ""}
        `}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={14}
          className={`text-text-subtitle shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-1.5 min-w-[160px] w-max rounded-xl border border-border-strong bg-surface-elevated p-1 shadow-2xl backdrop-blur-md overflow-hidden"
          >
            <div role="listbox" className="flex flex-col gap-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={(): void => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[12px] transition-all cursor-pointer select-none
                      ${
                        isSelected
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-text-body hover:bg-surface-hover hover:text-text-header"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {Icon && (
                        <Icon
                          size={14}
                          className={isSelected ? "text-accent" : "text-text-subtitle"}
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-[10px] text-text-subtitle font-normal truncate">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check size={14} className="text-accent shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
