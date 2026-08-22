import { X, Minus, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

interface TrafficLightProps {
  readonly color: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

const TrafficLight = ({ color, onClick, children }: TrafficLightProps): React.JSX.Element => (
  <motion.button
    whileHover={{ scale: 1.15 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`flex h-[13px] w-[13px] items-center justify-center rounded-full ${color}
      border border-black/20 transition-all cursor-pointer hover:brightness-110`}
  >
    {children}
  </motion.button>
);

const TitleBar = (): React.JSX.Element => (
  <div className="flex h-[42px] shrink-0 items-center bg-surface-titlebar border-b border-border">
    <div className="flex items-center gap-2 pl-4">
      <TrafficLight color="bg-danger" onClick={(): void => undefined}>
        <X size={8} strokeWidth={2.5} className="text-black/60" />
      </TrafficLight>
      <TrafficLight color="bg-[#ffd60a]" onClick={(): void => undefined}>
        <Minus size={8} strokeWidth={2.5} className="text-black/60" />
      </TrafficLight>
      <TrafficLight color="bg-[#22c55e]" onClick={(): void => undefined}>
        <Maximize2 size={7} strokeWidth={2.5} className="text-black/60" />
      </TrafficLight>
    </div>

    <div className="flex-1 text-center text-[13px] font-medium text-text-subtitle select-none">
      Settings
    </div>

    <div className="w-[68px]" />
  </div>
);

export default TitleBar;
