import { motion } from "framer-motion";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import React from "react";

const INFO_ITEMS = [
  { label: "Compositor", value: "Niri" },
  { label: "Shell", value: "Quickshell" },
  { label: "OS", value: "Arch Linux (CachyOS)" },
  { label: "Kernel", value: "Linux 6.x" },
  { label: "Display Server", value: "Wayland" },
  { label: "Qt Version", value: "6.x" },
] as const;

const SysInfoPage = (): React.JSX.Element => (
  <div className="h-full overflow-y-auto scrollbar-thin">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="px-7 pt-5 pb-2">
        <h1 className="text-[24px] font-bold text-text-header">System Info</h1>
        <p className="text-[12px] text-text-subtitle mt-1">About your system and environment.</p>
      </div>

      <div className="flex flex-col gap-5 p-7">
        <SettingsGroup header="System">
          {INFO_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <SettingsRow title={item.label}>
                <span className="text-[12px] font-mono text-text-subtitle">{item.value}</span>
              </SettingsRow>
            </motion.div>
          ))}
        </SettingsGroup>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[11px] text-text-muted py-4"
        >
          Niri Settings v0.1.0 — Built with Tauri + React
        </motion.div>
      </div>
    </motion.div>
  </div>
);

export default SysInfoPage;
