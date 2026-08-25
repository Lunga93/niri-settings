import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTheme } from "../ThemeContext";
import { MOOD_PALETTES } from "../palettes";

// Real screenshots from the Niri Settings app running on CachyOS + niri.
const SCREENSHOTS = [
  {
    id: "wallpaper-moods",
    mood: "earth",
    label: "Wallpaper Gallery",
    description: "Browse by mood, schedule rotation, and manage sources",
    image: `${import.meta.env.BASE_URL}screenshots/wallpaper-moods.png`,
  },
  {
    id: "wallpaper-hero",
    mood: "sunset",
    label: "Current Wallpaper",
    description: "Hero preview with live wallpaper and mood counts",
    image: `${import.meta.env.BASE_URL}screenshots/wallpaper-hero.png`,
  },
  {
    id: "display",
    mood: "ocean",
    label: "Display Configuration",
    description: "Visual arrangement editor with rotation and scaling",
    image: `${import.meta.env.BASE_URL}screenshots/display.png`,
  },
  {
    id: "keybindings",
    mood: "aurora",
    label: "Keybinding Editor",
    description: "Visual keybinding reference with inline editing",
    image: `${import.meta.env.BASE_URL}screenshots/keybindings.png`,
  },
  {
    id: "appearance-dark",
    mood: "sunset",
    label: "Appearance (Dark)",
    description: "Pywal color schemes with dynamic accent palettes",
    image: `${import.meta.env.BASE_URL}screenshots/appearance-dark.png`,
  },
  {
    id: "default-apps-light",
    mood: "ocean",
    label: "Default Apps (Light)",
    description: "Clean light theme with blue accents",
    image: `${import.meta.env.BASE_URL}screenshots/default-apps-light.png`,
  },
];

function ScreenshotCard({
  screenshot,
  index,
}: {
  screenshot: (typeof SCREENSHOTS)[0];
  index: number;
}): React.JSX.Element {
  const { setPalette, resetPalette } = useTheme();
  const palette = MOOD_PALETTES.find((p) => p.name === screenshot.mood)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setPalette(screenshot.mood)}
      onMouseLeave={resetPalette}
      className="group relative cursor-pointer"
    >
      {/* Screenshot frame */}
      <div className="relative rounded-xl overflow-hidden border border-white/5 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl">
        {/* Actual screenshot */}
        <img
          src={screenshot.image}
          alt={screenshot.label}
          className="w-full h-auto object-cover transition-all duration-700 group-hover:brightness-110"
          loading="lazy"
        />

        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
          style={{
            boxShadow: `inset 0 0 40px ${palette.accentFrom}22, 0 0 30px ${palette.accentFrom}15`,
          }}
        />
      </div>

      {/* Label */}
      <div className="mt-3 text-center">
        <h4
          className="font-semibold transition-colors duration-500"
          style={{ color: palette.accentFrom }}
        >
          {screenshot.label}
        </h4>
        <p className="text-xs mt-1 transition-colors duration-500" style={{ color: palette.textSecondary }}>
          {screenshot.description}
        </p>
      </div>
    </motion.div>
  );
}

export function ScreenshotGallery(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="gallery" className="relative py-32 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 transition-colors duration-700" style={{ background: "var(--site-bg-secondary)" }} />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 mb-6 transition-colors duration-700"
            style={{ background: "var(--site-card)", borderColor: "var(--site-card-border)" }}
          >
            <span className="text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
              Hover to preview
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6 transition-colors duration-700"
            style={{ color: "var(--site-text)" }}
          >
            Your Wallpaper,{" "}
            <span
              className="transition-all duration-700"
              style={{
                background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Your Theme
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg max-w-2xl mx-auto transition-colors duration-700"
            style={{ color: "var(--site-text-secondary)" }}
          >
            Hover over any screenshot to see how niri-settings transforms
            your entire desktop to match. Every color, every accent, every surface
            adapts to your wallpaper.
          </motion.p>
        </div>

        {/* Screenshot grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SCREENSHOTS.map((screenshot, i) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              index={i}
            />
          ))}
        </div>

        {/* Hint text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
          className="text-center mt-10 text-sm transition-colors duration-700"
          style={{ color: "var(--site-text-secondary)", opacity: 0.5 }}
        >
          ↑ Hover the screenshots above — watch the whole page change ↑
        </motion.p>
      </div>
    </section>
  );
}
