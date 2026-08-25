import { motion, AnimatePresence, useInView } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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

function Lightbox({
  screenshot,
  onClose,
  onPrev,
  onNext,
}: {
  screenshot: (typeof SCREENSHOTS)[0];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}): React.JSX.Element {
  const palette = MOOD_PALETTES.find((p) => p.name === screenshot.mood)!;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close lightbox"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 md:left-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Previous screenshot"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next button */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 md:right-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Next screenshot"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Image container */}
      <motion.div
        key={screenshot.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 max-w-5xl w-full mx-4 md:mx-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titlebar mockup */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl" style={{ background: "#1a1a2e" }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <span className="flex-1 text-center text-xs text-white/40 font-medium">
            {screenshot.label}
          </span>
        </div>
        <img
          src={screenshot.image}
          alt={screenshot.label}
          className="w-full h-auto rounded-b-xl shadow-2xl"
        />
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm font-medium" style={{ color: palette.accentFrom }}>
            {screenshot.label}
          </span>
          <span className="text-xs text-white/40">
            {screenshot.description}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScreenshotCard({
  screenshot,
  index,
  onClick,
}: {
  screenshot: (typeof SCREENSHOTS)[0];
  index: number;
  onClick: () => void;
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
      onClick={onClick}
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

        {/* Click hint overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="px-4 py-2 rounded-lg bg-black/60 text-white text-sm font-medium backdrop-blur-sm">
            Click to view full size
          </div>
        </div>
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    document.body.style.overflow = "";
  }, []);

  const goPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + SCREENSHOTS.length) % SCREENSHOTS.length));
  }, []);

  const goNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % SCREENSHOTS.length));
  }, []);

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
              onClick={() => openLightbox(i)}
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

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <Lightbox
            screenshot={SCREENSHOTS[selectedIndex]}
            onClose={closeLightbox}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
