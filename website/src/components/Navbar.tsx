import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Settings } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Gallery", href: "#gallery" },
  { label: "Architecture", href: "#architecture" },
  { label: "Download", href: "#download" },
];

export function Navbar(): React.JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "color-mix(in srgb, var(--site-bg) 85%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--site-card-border)" : "1px solid transparent",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
            }}
          >
            <Settings className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-semibold text-lg transition-colors duration-500 hidden sm:block"
            style={{ color: "var(--site-text)" }}
          >
            Niri Settings
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5"
              style={{ color: "var(--site-text-secondary)" }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#download"
            className="ml-4 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
            }}
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg transition-colors duration-300"
          style={{ color: "var(--site-text)" }}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t transition-colors duration-500"
            style={{
              background: "color-mix(in srgb, var(--site-bg) 95%, transparent)",
              borderColor: "var(--site-card-border)",
            }}
          >
            <div className="px-6 py-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300"
                  style={{ color: "var(--site-text-secondary)" }}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#download"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-semibold text-white text-center mt-2"
                style={{
                  background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
                }}
              >
                Get Started
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
