import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import { iconsAtom, setIconThemeAtom, setCursorThemeAtom, setCursorSizeAtom } from "@/lib/atoms";

const ICON_THEMES = ["Papirus", "Tela", "Colloid", "Papirus-Dark", "WhiteSur"] as const;
const CURSOR_THEMES = ["Capitaine", "Breeze", "Adwaita", "Numix", "WhiteSur"] as const;
const CURSOR_SIZES = [16, 20, 24, 28, 32, 36, 48] as const;

const IconsPage = (): React.JSX.Element => {
  const [icons] = useAtom(iconsAtom);
  const setIconTheme = useSetAtom(setIconThemeAtom);
  const setCursorTheme = useSetAtom(setCursorThemeAtom);
  const setCursorSize = useSetAtom(setCursorSizeAtom);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-5 pb-2">
          <h1 className="text-[24px] font-bold text-text-header">Icons</h1>
          <p className="text-[12px] text-text-subtitle mt-1">
            Icon themes and cursor configuration.
          </p>
        </div>

        <div className="flex flex-col gap-5 p-7">
          <SettingsGroup header="Icon Theme">
            <SettingsRow
              title="Icon theme"
              description="System-wide icon set for applications and file managers."
            >
              <select
                value={icons.icon_theme}
                onChange={(e): void => setIconTheme(e.target.value)}
                className="rounded-lg border border-border bg-surface-active px-3 py-1.5 text-[12px] text-text-body cursor-pointer"
              >
                {ICON_THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Cursor">
            <SettingsRow title="Cursor theme" description="Mouse pointer appearance.">
              <select
                value={icons.cursor_theme}
                onChange={(e): void => setCursorTheme(e.target.value)}
                className="rounded-lg border border-border bg-surface-active px-3 py-1.5 text-[12px] text-text-body cursor-pointer"
              >
                {CURSOR_THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow title="Cursor size" description="Pointer size in pixels.">
              <div className="flex gap-1.5">
                {CURSOR_SIZES.map((size) => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={(): void => setCursorSize(size)}
                    className={`
                      h-8 min-w-[36px] rounded-lg text-[11px] font-medium border transition-all cursor-pointer
                      ${
                        icons.cursor_size === size
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-active text-text-subtitle hover:bg-surface-hover"
                      }
                    `}
                  >
                    {size}
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

export default IconsPage;
