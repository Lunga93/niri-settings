import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Github, ExternalLink, Code, Heart } from "lucide-react";

export function Developer(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: `linear-gradient(to bottom, var(--site-bg-secondary), var(--site-bg))`,
        }}
      />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Photo side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Photo frame */}
            <div className="relative mx-auto w-72 h-72 lg:w-80 lg:h-80">
              {/* Animated border ring */}
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  background: `conic-gradient(from 0deg, var(--site-accent-from), var(--site-accent-to), var(--site-accent-from))`,
                  animationDuration: "8s",
                  padding: "3px",
                }}
              >
                <div
                  className="w-full h-full rounded-full transition-colors duration-700"
                  style={{ background: "var(--site-bg)" }}
                />
              </div>

              {/* Photo placeholder — replace src with actual photo */}
              <div className="absolute inset-[6px] rounded-full overflow-hidden">
                <img
                  src={`${import.meta.env.BASE_URL}developer-photo.jpg`}
                  alt="Lunga — developer of Niri Settings"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Glow behind photo */}
              <div
                className="absolute -inset-10 blur-[60px] -z-10 transition-all duration-700"
                style={{
                  background: `linear-gradient(135deg, var(--site-orb-a), var(--site-orb-b))`,
                  opacity: 0.4,
                }}
              />
            </div>

            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute top-8 -right-4 lg:right-0 px-3 py-1.5 rounded-full glass text-xs font-medium transition-colors duration-700"
              style={{ color: "var(--site-accent-from)" }}
            >
              <span className="flex items-center gap-1.5">
                <Code className="w-3 h-3" />
                Open Source Builder
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute bottom-12 -left-4 lg:left-0 px-3 py-1.5 rounded-full glass text-xs font-medium transition-colors duration-700"
              style={{ color: "var(--site-accent-to)" }}
            >
              <span className="flex items-center gap-1.5">
                <Heart className="w-3 h-3" />
                From Cape Town
              </span>
            </motion.div>
          </motion.div>

          {/* Text side */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
            >
              <span
                className="text-sm transition-colors duration-700"
                style={{ color: "var(--site-text-secondary)" }}
              >
                The developer
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              <span
                style={{ color: "var(--site-text)" }}
                className="transition-colors duration-700"
              >
                Built with
              </span>{" "}
              <span className="text-gradient">Passion</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg mb-8 leading-relaxed transition-colors duration-700"
              style={{ color: "var(--site-text-secondary)" }}
            >
              I believe everyone deserves a desktop that feels effortless. Niri Settings
              started from that conviction — a settings app that actually looks like it
              belongs on your desktop, not like an afterthought bolted onto Linux.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-lg mb-8 leading-relaxed transition-colors duration-700"
              style={{ color: "var(--site-text-secondary)" }}
            >
              Built from Cape Town with React, Rust, and Go. Open source because
              the best desktop experiences should be accessible to everyone, not
              locked behind proprietary walls.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              {[
                { value: "45+", label: "Commands" },
                { value: "121", label: "Tests" },
                { value: "6.7", label: "MB Binary" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center p-4 rounded-xl glass transition-colors duration-700"
                >
                  <div
                    className="text-2xl font-bold transition-colors duration-700"
                    style={{
                      background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-xs mt-1 transition-colors duration-700"
                    style={{ color: "var(--site-text-secondary)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Social links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex gap-4"
            >
              <a
                href="https://github.com/Lunga93"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl glass text-sm font-medium transition-all duration-300 hover:scale-105"
                style={{ color: "var(--site-text)" }}
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="https://github.com/Lunga93/niri-settings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
                }}
              >
                <ExternalLink className="w-4 h-4" />
                View Project
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
