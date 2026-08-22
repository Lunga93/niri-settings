import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import {
  appearanceAtom,
  setColorSchemeAtom,
  setAccentColorAtom,
  setAccentModeAtom,
} from "@/lib/atoms";

const ACCENT_COLORS = [
  "#0a84ff",
  "#5e5ce6",
  "#bf5af2",
  "#ff375f",
  "#ff453a",
  "#ff9f0a",
  "#ffd60a",
  "#30d158",
  "#00c7be",
  "#64d2ff",
] as const;

const AppearancePage = (): React.JSX.Element => {
  const [appearance] = useAtom(appearanceAtom);
  const setColorScheme = useSetAtom(setColorSchemeAtom);
  const setAccentColor = useSetAtom(setAccentColorAtom);
  const setAccentMode = useSetAtom(setAccentModeAtom);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-5 pb-2">
          <h1 className="text-[24px] font-bold text-text-header">Appearance</h1>
          <p className="text-[12px] text-text-subtitle mt-1">Colors, accents, and visual style.</p>
        </div>

        <div className="flex flex-col gap-5 p-7">
          <SettingsGroup header="Color Scheme">
            <SettingsRow title="Theme" description="Dark or light mode for the entire shell.">
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((scheme) => (
                  <motion.button
                    key={scheme}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(): void => setColorScheme(scheme)}
                    className={`
                      rounded-xl px-5 py-2 text-[12px] font-medium border transition-all cursor-pointer
                      ${
                        appearance.color_scheme === scheme
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-active text-text-subtitle hover:bg-surface-hover"
                      }
                    `}
                  >
                    {scheme === "dark" ? "Dark" : "Light"}
                  </motion.button>
                ))}
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Accent Color" accent="#bf5af2">
            <div className="p-5">
              <div className="grid grid-cols-5 gap-3">
                {ACCENT_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(): void => setAccentColor(color)}
                    className={`
                      relative h-10 w-10 rounded-xl cursor-pointer border-2 transition-all
                      ${
                        appearance.manual_primary === color
                          ? "border-white/80 ring-2 ring-white/20"
                          : "border-transparent hover:border-white/20"
                      }
                    `}
                    style={{ backgroundColor: color }}
                  >
                    {appearance.manual_primary === color && (
                      <motion.div
                        layoutId="accent-ring"
                        className="absolute -inset-1 rounded-xl border-2 border-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup header="Mode">
            <SettingsRow
              title="Accent mode"
              description="Dynamic extracts from wallpaper; Manual uses your chosen color."
            >
              <div className="flex gap-2">
                {(["dynamic", "manual"] as const).map((mode) => (
                  <motion.button
                    key={mode}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(): void => setAccentMode(mode)}
                    className={`
                      rounded-xl px-4 py-1.5 text-[12px] font-medium border transition-all cursor-pointer
                      ${
                        appearance.accent_mode === mode
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-active text-text-subtitle hover:bg-surface-hover"
                      }
                    `}
                  >
                    {mode === "dynamic" ? "Dynamic" : "Manual"}
                  </motion.button>
                ))}
              </div>
            </SettingsRow>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default AppearancePage;
