import { useState, useCallback } from "react";

interface SettingsSliderProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly unitLabel?: string;
  readonly onChange: (value: number) => void;
  readonly className?: string;
}

const SettingsSlider = ({
  value,
  min,
  max,
  step = 1,
  unitLabel,
  onChange,
  className = "",
}: SettingsSliderProps): React.JSX.Element => {
  const [localValue, setLocalValue] = useState(value);
  const percentage = ((localValue - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const v = Number(e.target.value);
      setLocalValue(v);
      onChange(v);
    },
    [onChange],
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex-1 h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          className="slider-input w-full h-[5px] rounded-full appearance-none cursor-pointer
            bg-surface-active
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-[16px]
            [&::-webkit-slider-thumb]:w-[16px]
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-webkit-slider-thumb]:active:scale-110"
          style={{
            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${percentage}%, var(--color-surface-active) ${percentage}%, var(--color-surface-active) 100%)`,
          }}
        />
      </div>
      {unitLabel !== undefined && (
        <span className="text-[11px] font-mono text-text-subtitle min-w-[60px] text-right tabular-nums">
          {unitLabel}
        </span>
      )}
    </div>
  );
};

export default SettingsSlider;
