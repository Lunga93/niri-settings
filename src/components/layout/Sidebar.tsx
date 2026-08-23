import { useAtom, useSetAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  Palette,
  Shapes,
  Monitor,
  Keyboard,
  Wifi,
  Volume2,
  Info,
  type LucideIcon,
} from "lucide-react";
import { activePageAtom, SIDEBAR_SECTIONS, type PageId } from "@/stores";
import React from "react";

const ICON_MAP: Record<string, LucideIcon> = {
  image: Image,
  palette: Palette,
  shapes: Shapes,
  monitor: Monitor,
  keyboard: Keyboard,
  wifi: Wifi,
  "volume-2": Volume2,
  info: Info,
};

interface SidebarItemProps {
  readonly id: PageId;
  readonly label: string;
  readonly icon: string;
  readonly isActive: boolean;
}

const SidebarItem = ({ id, label, icon, isActive }: SidebarItemProps): React.JSX.Element => {
  const setActive = useSetAtom(activePageAtom);
  const Icon = ICON_MAP[icon] ?? Info;

  return (
    <motion.button
      onClick={(): void => setActive(id)}
      className={`
        group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5
        transition-colors duration-150 cursor-pointer
        ${
          isActive
            ? "bg-accent/18 text-text-header"
            : "text-text-subtitle hover:bg-surface-hover hover:text-text-body"
        }
      `}
      whileTap={{ scale: 0.98 }}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute -left-1 top-1/2 h-[55%] w-[3px] -translate-y-1/2 rounded-full bg-accent"
            initial={{ opacity: 0, scaleY: 0.5 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.5 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <div
        className={`
          flex h-[26px] w-[26px] items-center justify-center rounded-lg
          transition-colors duration-150
          ${
            isActive
              ? "bg-accent/28 text-accent"
              : "bg-surface-elevated text-text-subtitle group-hover:text-text-body"
          }
        `}
      >
        <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
      </div>

      <span
        className={`text-[13px] font-medium transition-colors duration-150 ${
          isActive ? "text-text-header" : ""
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
};

const Sidebar = (): React.JSX.Element => {
  const [activePage] = useAtom(activePageAtom);

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-2 py-3 scrollbar-thin">
      {SIDEBAR_SECTIONS.map((section) => {
        const sectionLabel = section.section;
        return (
          <div key={sectionLabel} className="mb-1">
            <div className="mb-1 px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.8px] text-text-muted">
              {sectionLabel}
            </div>

            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  isActive={activePage === item.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default Sidebar;
