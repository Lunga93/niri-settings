import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Zap, Shield, Cpu } from "lucide-react";

const highlights = [
  {
    icon: Zap,
    title: "Instant Response",
    description: "Sub-100ms command execution via Go sidecar",
  },
  {
    icon: Shield,
    title: "Type-Safe",
    description: "End-to-end Zod validation from Go to React",
  },
  {
    icon: Cpu,
    title: "Lightweight",
    description: "6.7 MB sidecar, statically linked, no runtime deps",
  },
];

export function Showcase(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="architecture" className="relative py-32 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 transition-colors duration-700" style={{ background: "var(--site-bg)" }}>
        <div
          className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-700"
          style={{ background: "var(--site-orb-b)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-700"
          style={{ background: "var(--site-orb-a)" }}
        />
      </div>

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
            >
              <span className="text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
                Built with care
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              <span style={{ color: "var(--site-text)" }} className="transition-colors duration-700">
                Engineered for
              </span>
              <br />
              <span className="text-gradient">Performance</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg mb-8 leading-relaxed transition-colors duration-700"
              style={{ color: "var(--site-text-secondary)" }}
            >
              Three-tier architecture keeps the UI fast, the core thin, and the
              system access powerful. React for the interface, Rust for the bridge,
              Go for the heavy lifting.
            </motion.p>

            {/* Highlights */}
            <div className="space-y-4">
              {highlights.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl glass"
                >
                  <div
                    className="p-2 rounded-lg transition-colors duration-700"
                    style={{ background: `color-mix(in srgb, var(--site-accent-from) 20%, transparent)` }}
                  >
                    <item.icon className="w-5 h-5 transition-colors duration-700" style={{ color: "var(--site-accent-from)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 transition-colors duration-700" style={{ color: "var(--site-text)" }}>
                      {item.title}
                    </h4>
                    <p className="text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Animated visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Terminal-style code block */}
            <div className="rounded-2xl glass p-6 font-mono text-sm">
              <div
                className="flex items-center gap-2 mb-4 pb-4 border-b transition-colors duration-700"
                style={{ borderColor: "var(--site-card-border)" }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 transition-colors duration-700" style={{ color: "var(--site-terminal-comment)" }}>
                  Architecture
                </span>
              </div>

              <div className="space-y-3 transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 1 }}
                  className="flex items-center gap-2"
                >
                  <span style={{ color: "var(--site-accent-from)" }}>1</span>
                  <span style={{ color: "var(--site-terminal-comment)" }}>├──</span>
                  <span style={{ color: "var(--site-accent-to)" }}>React 19</span>
                  <span style={{ color: "var(--site-terminal-comment)" }}>// UI Layer</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 1.1 }}
                  className="flex items-center gap-2"
                >
                  <span style={{ color: "var(--site-accent-from)" }}>2</span>
                  <span style={{ color: "var(--site-terminal-comment)" }}>├──</span>
                  <span style={{ color: "#f97316" }}>Rust (Tauri)</span>
                  <span style={{ color: "var(--site-terminal-comment)" }}>// Bridge</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 1.2 }}
                  className="flex items-center gap-2"
                >
                  <span style={{ color: "var(--site-accent-from)" }}>3</span>
                  <span style={{ color: "var(--site-terminal-comment)" }}>└──</span>
                  <span style={{ color: "#22c55e" }}>Go Sidecar</span>
                  <span style={{ color: "var(--site-terminal-comment)" }}>// System Access</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: 1.4 }}
                  className="mt-4 pt-4 border-b transition-colors duration-700"
                  style={{ borderColor: "var(--site-card-border)" }}
                >
                  <div className="flex items-center gap-2" style={{ color: "var(--site-terminal-prompt)" }}>
                    <Check className="w-4 h-4" />
                    <span>45+ commands, type-safe IPC</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Glow */}
            <div
              className="absolute -inset-20 blur-[80px] -z-10 transition-all duration-700"
              style={{ background: `linear-gradient(135deg, var(--site-orb-a), var(--site-orb-b))`, opacity: 0.5 }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
