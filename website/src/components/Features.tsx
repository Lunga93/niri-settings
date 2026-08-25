import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Palette,
  Monitor,
  Volume2,
  Keyboard,
  Image,
  Sun,
  MousePointer,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: Image,
    title: "Wallpaper Management",
    description:
      "Auto-rotating wallpapers from multiple sources — Unsplash, Reddit, Bing, and your local collection. Mood-based categorization with smart caching.",
    iconColor: "var(--site-accent-from)",
  },
  {
    icon: Palette,
    title: "Dynamic Theming",
    description:
      "Pywal-powered theme generation from your wallpaper. Instant dark/light mode switching with real-time color adaptation across your entire desktop.",
    iconColor: "var(--site-accent-to)",
  },
  {
    icon: Monitor,
    title: "Display Configuration",
    description:
      "Visual arrangement editor for multi-monitor setups. Scale, transform, and position displays with a intuitive drag-and-drop interface.",
    iconColor: "#22c55e",
  },
  {
    icon: Volume2,
    title: "Audio Control",
    description:
      "Per-device volume control with input/output management. Test audio output directly from the settings app.",
    iconColor: "#f97316",
  },
  {
    icon: Keyboard,
    title: "Keybinding Editor",
    description:
      "Visual keybinding editor for niri's keyboard shortcuts. Edit and validate your config with real-time feedback.",
    iconColor: "#ef4444",
  },
  {
    icon: Sun,
    title: "Night Light",
    description:
      "Blue light filtering with adjustable temperature. Automatic scheduling based on sunset times in your location.",
    iconColor: "#eab308",
  },
  {
    icon: MousePointer,
    title: "Cursor & Icons",
    description:
      "Browse and apply installed icon themes and cursor styles. Preview before applying system-wide.",
    iconColor: "#8b5cf6",
  },
  {
    icon: Layers,
    title: "Desktop Tiers",
    description:
      "Progressive enhancement from bare niri to full Manatee Desktop. One-click installation of appearance helpers and dotfiles.",
    iconColor: "#14b8a6",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative p-6 rounded-2xl glass hover:bg-white/5 transition-all duration-500"
    >
      {/* Icon */}
      <div
        className="inline-flex p-3 rounded-xl mb-4 transition-colors duration-700"
        style={{ background: `color-mix(in srgb, ${feature.iconColor} 20%, transparent)` }}
      >
        <feature.icon className="w-6 h-6" style={{ color: feature.iconColor }} />
      </div>

      {/* Title */}
      <h3
        className="text-xl font-semibold mb-2 transition-colors duration-700"
        style={{ color: "var(--site-text)" }}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p className="leading-relaxed transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
        {feature.description}
      </p>
    </motion.div>
  );
}

export function Features(): React.JSX.Element {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative py-32 px-6">
      {/* Background gradient */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: `linear-gradient(to bottom, var(--site-bg), var(--site-bg-secondary), var(--site-bg))`,
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div ref={sectionRef} className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
          >
            <span className="text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
              Everything you need
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6 transition-colors duration-700"
            style={{ color: "var(--site-text)" }}
          >
            Complete Desktop Control
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg max-w-2xl mx-auto transition-colors duration-700"
            style={{ color: "var(--site-text-secondary)" }}
          >
            Every setting you need, beautifully organized. From wallpapers to
            keybindings, we've got your entire desktop covered.
          </motion.p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
