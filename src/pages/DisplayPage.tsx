import { useAtom, useSetAtom } from "jotai";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Monitor, RefreshCw } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import PillSelector from "@/components/settings/PillSelector";
import SettingsSlider from "@/components/settings/SettingsSlider";
import type { DisplayOutput } from "@/lib/schemas";
import {
  displayAtom,
  appearanceAtom,
  setDisplayScaleAtom,
  setNightLightAtom,
  setNightLightTempAtom,
  setColorSchemeAtom,
} from "@/lib/atoms";
import {
  displayOutputsAtom,
  displayOutputsLoadingAtom,
  refreshDisplayOutputsAtom,
} from "@/lib/displayAtoms";

const SCALE_KEYS: readonly string[] = ["0.8", "1.0", "1.25", "1.5", "2.0"];
const SCALE_LABELS: readonly string[] = ["0.8x", "1.0x", "1.25x", "1.5x", "2.0x"];

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onToggle: (v: boolean) => void;
}

const ToggleSwitch = ({ checked, onToggle }: ToggleSwitchProps): React.JSX.Element => (
  <button
    onClick={(): void => onToggle(!checked)}
    className={`relative h-6.5 w-11.5 shrink-0 rounded-full p-0.75 transition-colors duration-200 cursor-pointer ${
      checked ? "bg-accent" : "bg-surface-active"
    }`}
  >
    <motion.div
      className="h-5 w-5 rounded-full bg-white shadow-md"
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </button>
);

interface MonitorVisualizationProps {
  readonly outputs: readonly DisplayOutput[];
}

const MonitorVisualization = ({ outputs }: MonitorVisualizationProps): React.JSX.Element => {
  if (outputs.length === 0) {
    return (
      <div className="relative h-50 w-full rounded-xl bg-surface-active border border-border overflow-hidden flex items-center justify-center">
        <span className="text-[12px] text-text-muted">No outputs detected</span>
      </div>
    );
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const o of outputs) {
    if (o.x < minX) minX = o.x;
    if (o.y < minY) minY = o.y;
    if (o.x + o.width > maxX) maxX = o.x + o.width;
    if (o.y + o.height > maxY) maxY = o.y + o.height;
  }

  const totalW = maxX - minX || 1;
  const totalH = maxY - minY || 1;
  const padding = 30;
  const svgW = 800;
  const svgH = 220;
  const scaleF = Math.min((svgW - padding * 2) / totalW, (svgH - padding * 2) / totalH);

  return (
    <div className="relative h-55 w-full rounded-xl bg-surface-active border border-border overflow-hidden">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
        <rect
          x="0"
          y={svgH - 20}
          width={svgW}
          height="20"
          rx="4"
          fill="var(--color-surface-elevated)"
        />

        {outputs.map((o) => {
          const x = (o.x - minX) * scaleF + padding;
          const y = (o.y - minY) * scaleF + padding;
          const w = o.width * scaleF;
          const h = o.height * scaleF;
          const scaleText = o.scale > 1 ? ` ${o.scale}x` : "";

          return (
            <g key={o.name}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="6"
                fill={o.focused ? "var(--color-accent)" : "var(--color-surface-sidebar)"}
                opacity={o.focused ? 0.12 : 1}
                stroke={o.focused ? "var(--color-accent)" : "var(--color-border-strong)"}
                strokeWidth={o.focused ? "2" : "1.5"}
              />
              <text
                x={x + w / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-text-subtitle)"
                fontSize="11"
                fontFamily="var(--font-sans)"
              >
                {o.name}
                {scaleText}
              </text>
              <text
                x={x + w / 2}
                y={y + h / 2 + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-text-muted)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {o.width}x{o.height}@{o.refresh_hz}Hz
              </text>
              <rect
                x={x + w / 2 - 10}
                y={y + h}
                width="20"
                height={Math.max(8, svgH - 20 - (y + h))}
                rx="2"
                fill="var(--color-surface-elevated)"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const DisplayPage = (): React.JSX.Element => {
  const [display] = useAtom(displayAtom);
  const [appearance] = useAtom(appearanceAtom);
  const setScale = useSetAtom(setDisplayScaleAtom);
  const setNightLight = useSetAtom(setNightLightAtom);
  const setNightLightTemp = useSetAtom(setNightLightTempAtom);
  const setColorScheme = useSetAtom(setColorSchemeAtom);

  const [outputs] = useAtom(displayOutputsAtom);
  const [loading] = useAtom(displayOutputsLoadingAtom);
  const refresh = useSetAtom(refreshDisplayOutputsAtom);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scaleIndex = SCALE_KEYS.indexOf(display.scale);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-5 pb-2">
          <h1 className="text-[24px] font-bold text-text-header">Display</h1>
          <p className="text-[12px] text-text-subtitle mt-1">
            Scaling, night light, and per-display options.
          </p>
        </div>

        <div className="flex flex-col gap-5 p-7">
          <SettingsGroup header="Scaling">
            <SettingsRow
              title="Text scaling factor"
              description="Applies to GTK and Qt applications system-wide."
            >
              <PillSelector
                options={SCALE_LABELS}
                currentIndex={scaleIndex >= 0 ? scaleIndex : 1}
                onSelected={(i): void => setScale(SCALE_KEYS[i])}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Night Light" accent="#ffb86c">
            <SettingsRow
              title="Night light"
              description="Warmer screen tones to reduce eye strain."
              hint={!display.night_light_enabled ? "Requires wlsunset (install via pacman)" : ""}
            >
              <ToggleSwitch checked={display.night_light_enabled} onToggle={setNightLight} />
            </SettingsRow>
            <SettingsRow title="Color temperature" description="Lower = warmer, higher = cooler.">
              <SettingsSlider
                value={display.night_light_temperature}
                min={1500}
                max={6500}
                step={100}
                unitLabel={`${display.night_light_temperature} K`}
                onChange={setNightLightTemp}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Color Scheme">
            <SettingsRow
              title="Appearance mode"
              description="Applies to the shell bar, popouts, settings, and all GTK/Qt apps."
            >
              <PillSelector
                options={["Dark", "Light"]}
                currentIndex={appearance.color_scheme === "light" ? 1 : 0}
                onSelected={(i): void => setColorScheme(i === 1 ? "light" : "dark")}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Monitors" accent="#64d2ff">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[12px] text-text-subtitle">
                  <Monitor size={14} />
                  {loading ? "Detecting displays..." : `${outputs.length} display(s) connected`}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] text-text-subtitle hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
                  Refresh
                </motion.button>
              </div>
              <MonitorVisualization outputs={outputs} />
            </div>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default DisplayPage;
