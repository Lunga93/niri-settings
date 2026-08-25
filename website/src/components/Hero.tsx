import { motion } from "framer-motion";
import { Settings, Sparkles, ArrowDown } from "lucide-react";

export function Hero(): React.JSX.Element {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background gradient */}
      <div className="absolute inset-0" style={{ background: "var(--site-bg)" }}>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] animate-pulse-glow transition-all duration-700"
          style={{ background: `linear-gradient(135deg, var(--site-orb-a), var(--site-orb-b))` }}
        />
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] animate-float transition-all duration-700"
          style={{ background: "var(--site-orb-a)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] animate-float transition-all duration-700"
          style={{ background: "var(--site-orb-b)", animationDelay: "2s" }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <Sparkles className="w-4 h-4 transition-colors duration-700" style={{ color: "var(--site-accent-to)" }} />
          <span className="text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)" }}>
            Part of the Manatee Desktop experience
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span style={{ color: "var(--site-text)" }} className="transition-colors duration-700">
            Your Desktop,
          </span>
          <br />
          <span className="text-gradient">Beautifully Configured</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed transition-colors duration-700"
          style={{ color: "var(--site-text-secondary)" }}
        >
          The most beautiful settings app for the{" "}
          <span className="font-medium transition-colors duration-700" style={{ color: "var(--site-accent-from)" }}>
            niri
          </span>{" "}
          Wayland compositor. Manage wallpapers, themes, displays, and more with a stunning
          interface that feels like it belongs on your desktop.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#download"
            className="group relative px-8 py-4 rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
              boxShadow: `0 0 40px var(--site-orb-a)`,
            }}
          >
            <span className="relative z-10 flex items-center gap-2 text-white">
              <Settings className="w-5 h-5" />
              Download Now
            </span>
          </a>
          <a
            href="#features"
            className="px-8 py-4 rounded-xl glass font-semibold text-lg transition-all duration-300"
            style={{ color: "var(--site-text-secondary)" }}
          >
            Explore Features
          </a>
        </motion.div>

        {/* Floating app preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-20 relative"
        >
          <div className="animated-border rounded-2xl p-1">
            <div className="rounded-xl overflow-hidden transition-colors duration-700" style={{ background: "var(--site-terminal-bg)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b transition-colors duration-700" style={{ borderColor: "var(--site-card-border)" }}>
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-sm transition-colors duration-700" style={{ color: "var(--site-text-secondary)", opacity: 0.5 }}>
                  Niri Settings
                </span>
              </div>
              <div className="p-8 grid grid-cols-3 gap-6">
                {/* Mock sidebar */}
                <div className="space-y-2">
                  {["Wallpaper", "Appearance", "Display", "Sound", "Keybindings"].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 + i * 0.1 }}
                      className="px-3 py-2 rounded-lg text-sm transition-all duration-700"
                      style={
                        i === 0
                          ? {
                              background: `color-mix(in srgb, var(--site-accent-from) 20%, transparent)`,
                              color: "var(--site-accent-from)",
                              border: `1px solid color-mix(in srgb, var(--site-accent-from) 30%, transparent)`,
                            }
                          : { color: "var(--site-text-secondary)", opacity: 0.5 }
                      }
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
                {/* Mock content */}
                <div className="col-span-2 space-y-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.8 }}
                    className="h-32 rounded-xl border transition-all duration-700"
                    style={{
                      background: `linear-gradient(135deg, var(--site-orb-a), var(--site-orb-b))`,
                      borderColor: "var(--site-card-border)",
                    }}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2 }}
                      className="h-20 rounded-lg transition-colors duration-700"
                      style={{ background: "var(--site-card)", border: `1px solid var(--site-card-border)` }}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.1 }}
                      className="h-20 rounded-lg transition-colors duration-700"
                      style={{ background: "var(--site-card)", border: `1px solid var(--site-card-border)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow behind preview */}
          <div
            className="absolute -inset-10 blur-[60px] -z-10 transition-all duration-700"
            style={{ background: `linear-gradient(135deg, var(--site-orb-a), var(--site-orb-b))` }}
          />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="transition-colors duration-700"
          style={{ color: "var(--site-text-secondary)" }}
        >
          <ArrowDown className="w-6 h-6" />
        </motion.div>
      </motion.div>
    </section>
  );
}
