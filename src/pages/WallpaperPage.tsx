import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import {
  wallpaperAtom,
  setWallpaperFrequencyAtom,
  setWallpaperMoodAtom,
  toggleWallpaperSourceAtom,
} from "@/lib/atoms";

const MOODS = ["Sunset", "Ocean", "Forest", "Space", "Minimal"] as const;

const WallpaperPage = (): React.JSX.Element => {
  const [wallpaper] = useAtom(wallpaperAtom);
  const setFrequency = useSetAtom(setWallpaperFrequencyAtom);
  const setMood = useSetAtom(setWallpaperMoodAtom);
  const toggleSource = useSetAtom(toggleWallpaperSourceAtom);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-5 pb-2">
          <h1 className="text-[24px] font-bold text-text-header">Wallpaper</h1>
          <p className="text-[12px] text-text-subtitle mt-1">
            Automated wallpaper rotation and sources.
          </p>
        </div>

        <div className="flex flex-col gap-5 p-7">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative h-[160px] w-full overflow-hidden rounded-2xl border border-border"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-surface-elevated to-secondary/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[13px] text-text-subtitle">No wallpaper preview</span>
            </div>
          </motion.div>

          <SettingsGroup header="Rotation">
            <SettingsRow title="Frequency" description="How often to cycle wallpapers.">
              <select
                value={wallpaper.frequency}
                onChange={(e): void => setFrequency(e.target.value)}
                className="rounded-lg border border-border bg-surface-active px-3 py-1.5 text-[12px] text-text-body cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
                <option value="startup">On startup</option>
                <option value="never">Never</option>
              </select>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Mood" accent="#bf5af2">
            <div className="p-5">
              <div className="grid grid-cols-5 gap-3">
                {MOODS.map((mood) => (
                  <motion.button
                    key={mood}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(): void => setMood(mood.toLowerCase())}
                    className={`
                      rounded-xl p-3 text-center text-[12px] font-medium border transition-all cursor-pointer
                      ${
                        wallpaper.selected_mood === mood.toLowerCase()
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-active text-text-subtitle hover:bg-surface-hover"
                      }
                    `}
                  >
                    {mood}
                  </motion.button>
                ))}
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup header="Sources">
            {Object.entries(wallpaper.sources_enabled).map(([source, enabled]) => (
              <SettingsRow key={source} title={source.charAt(0).toUpperCase() + source.slice(1)}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(): void => toggleSource(source)}
                  className={`h-[26px] w-[46px] shrink-0 rounded-full p-[3px] transition-colors duration-200 cursor-pointer ${
                    enabled ? "bg-accent" : "bg-surface-active"
                  }`}
                >
                  <motion.div
                    className="h-[20px] w-[20px] rounded-full bg-white shadow-md"
                    animate={{ x: enabled ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </SettingsRow>
            ))}
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default WallpaperPage;
