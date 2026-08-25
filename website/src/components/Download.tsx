import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Download as DownloadIcon, Terminal, Github, ExternalLink } from "lucide-react";

export function Download(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="download" className="relative py-32 px-6">
      {/* Background */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: `linear-gradient(to bottom, var(--site-bg), var(--site-bg-secondary), var(--site-bg))`,
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] transition-all duration-700"
          style={{ background: `linear-gradient(135deg, var(--site-orb-a), var(--site-orb-b))` }}
        />
      </div>

      <div ref={ref} className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <span className="text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
            Free & Open Source
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          <span style={{ color: "var(--site-text)" }} className="transition-colors duration-700">
            Ready to Transform
          </span>
          <br />
          <span className="text-gradient">Your Desktop?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg max-w-2xl mx-auto mb-12 transition-colors duration-700"
          style={{ color: "var(--site-text-secondary)" }}
        >
          Get started in seconds. Download the portable tarball or build from
          source — whatever works best for your setup.
        </motion.p>

        {/* Download options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a
            href="https://github.com/Lunga93/niri-settings/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative px-8 py-4 rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
              boxShadow: `0 0 40px var(--site-orb-a)`,
            }}
          >
            <span className="relative z-10 flex items-center gap-2 text-white">
              <DownloadIcon className="w-5 h-5" />
              Download v0.1.2
            </span>
          </a>

          <a
            href="https://github.com/Lunga93/niri-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-xl glass font-semibold text-lg transition-all duration-300 flex items-center gap-2"
            style={{ color: "var(--site-text-secondary)" }}
          >
            <Github className="w-5 h-5" />
            View Source
          </a>
        </motion.div>

        {/* Installation instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="rounded-2xl glass p-8 text-left max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 transition-colors duration-700" style={{ color: "var(--site-terminal-prompt)" }} />
            <h3 className="font-semibold transition-colors duration-700" style={{ color: "var(--site-text)" }}>
              Quick Install
            </h3>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <div>
              <span className="transition-colors duration-700" style={{ color: "var(--site-terminal-comment)" }}>
                # Download and extract
              </span>
              <div className="mt-1 transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
                <span style={{ color: "var(--site-terminal-prompt)" }}>$</span> tar -xzf niri-settings-0.1.2-linux-x86_64.tar.gz
              </div>
            </div>

            <div>
              <span className="transition-colors duration-700" style={{ color: "var(--site-terminal-comment)" }}>
                # Install to ~/.local
              </span>
              <div className="mt-1 transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
                <span style={{ color: "var(--site-terminal-prompt)" }}>$</span> cd niri-settings-0.1.2 && ./install.sh
              </div>
            </div>

            <div>
              <span className="transition-colors duration-700" style={{ color: "var(--site-terminal-comment)" }}>
                # Launch
              </span>
              <div className="mt-1 transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
                <span style={{ color: "var(--site-terminal-prompt)" }}>$</span> niri-settings
              </div>
            </div>
          </div>

          <div
            className="mt-6 pt-4 border-t flex items-center gap-2 text-sm transition-colors duration-700"
            style={{ borderColor: "var(--site-card-border)", color: "var(--site-terminal-comment)" }}
          >
            <ExternalLink className="w-4 h-4" />
            <span>
              Requires{" "}
              <a
                href="https://github.com/YaLTeR/niri"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-700"
                style={{ color: "var(--site-accent-from)" }}
              >
                niri
              </a>{" "}
              Wayland compositor
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
