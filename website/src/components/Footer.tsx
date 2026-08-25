import { Github, Heart } from "lucide-react";

export function Footer(): React.JSX.Element {
  return (
    <footer
      className="relative py-12 px-6 border-t transition-colors duration-700"
      style={{ borderColor: "var(--site-card-border)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-700"
              style={{
                background: `linear-gradient(135deg, var(--site-accent-from), var(--site-accent-to))`,
              }}
            >
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold transition-colors duration-700" style={{ color: "var(--site-text)" }}>
              Niri Settings
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm transition-colors duration-700" style={{ color: "var(--site-terminal-comment)" }}>
            <a
              href="https://github.com/Lunga93/niri-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="https://github.com/Lunga93/niri-settings/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Releases
            </a>
            <a
              href="https://github.com/YaLTeR/niri"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              niri
            </a>
          </div>

          {/* Copyright */}
          <div className="flex items-center gap-1 text-sm transition-colors duration-700" style={{ color: "var(--site-terminal-comment)" }}>
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>for the Wayland community</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
