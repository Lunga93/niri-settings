import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Monitor, RefreshCw, RotateCw, Check, Move } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import PillSelector from "@/components/settings/PillSelector";
import SettingsSlider from "@/components/settings/SettingsSlider";
import {
  displayAtom,
  appearanceAtom,
  setDisplayScaleAtom,
  setNightLightAtom,
  setNightLightTempAtom,
  setColorSchemeAtom,
} from "@/stores";
import {
  displayOutputsAtom,
  displayOutputsLoadingAtom,
  selectedOutputNameAtom,
  displaySavingAtom,
  refreshDisplayOutputsAtom,
  updateOutputPositionAtom,
  updateOutputTransformAtom,
  updateOutputScaleAtom,
  saveDisplayLayoutAtom,
  capabilitiesAtom,
} from "@/stores";
import IntegrationNotice from "@/components/settings/IntegrationNotice";
import type { DisplayOutput } from "@/lib/schemas";

const SCALE_KEYS: readonly string[] = ["0.8", "1.0", "1.25", "1.5", "2.0"];
const SCALE_LABELS: readonly string[] = ["0.8x", "1.0x", "1.25x", "1.5x", "2.0x"];

const ROTATION_OPTIONS = [
  { id: "normal", label: "0° Normal", angle: 0 },
  { id: "90", label: "90° Right", angle: 90 },
  { id: "180", label: "180° Inverted", angle: 180 },
  { id: "270", label: "270° Left", angle: 270 },
] as const;

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

const DisplayPage = (): React.JSX.Element => {
  const [display] = useAtom(displayAtom);
  const [appearance] = useAtom(appearanceAtom);
  const setScale = useSetAtom(setDisplayScaleAtom);
  const setNightLight = useSetAtom(setNightLightAtom);
  const setNightLightTemp = useSetAtom(setNightLightTempAtom);
  const setColorScheme = useSetAtom(setColorSchemeAtom);

  const [outputs] = useAtom(displayOutputsAtom);
  const caps = useAtomValue(capabilitiesAtom);
  const [loading] = useAtom(displayOutputsLoadingAtom);
  const [saving] = useAtom(displaySavingAtom);
  const [selectedName, setSelectedName] = useAtom(selectedOutputNameAtom);
  const refresh = useSetAtom(refreshDisplayOutputsAtom);

  const updatePosition = useSetAtom(updateOutputPositionAtom);
  const updateTransform = useSetAtom(updateOutputTransformAtom);
  const updateOutputScale = useSetAtom(updateOutputScaleAtom);
  const saveLayout = useSetAtom(saveDisplayLayoutAtom);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dragging state on canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scaleIndex = SCALE_KEYS.indexOf(display.scale);

  const selectedOutput =
    outputs.find((o) => o.name === selectedName) ||
    outputs.find((o) => o.connector === selectedName) ||
    outputs[0];

  // Canvas coordinate math
  let minX = 0,
    minY = 0,
    maxX = 1920,
    maxY = 1080;
  if (outputs.length > 0) {
    minX = Math.min(...outputs.map((o) => o.x));
    minY = Math.min(...outputs.map((o) => o.y));
    maxX = Math.max(
      ...outputs.map((o) => {
        const isPortrait = o.transform === "90" || o.transform === "270";
        const w = isPortrait ? o.height || 1080 : o.width || 1920;
        return o.x + w;
      }),
    );
    maxY = Math.max(
      ...outputs.map((o) => {
        const isPortrait = o.transform === "90" || o.transform === "270";
        const h = isPortrait ? o.width || 1920 : o.height || 1080;
        return o.y + h;
      }),
    );
  }

  const canvasWidth = 720;
  const canvasHeight = 240;
  const pad = 40;
  const boundW = Math.max(1, maxX - minX);
  const boundH = Math.max(1, maxY - minY);
  const scaleRatio = Math.min(
    (canvasWidth - pad * 2) / boundW,
    (canvasHeight - pad * 2) / boundH,
    0.12,
  );

  const handlePointerDown = (e: React.PointerEvent, o: DisplayOutput): void => {
    e.preventDefault();
    setSelectedName(o.name);
    setDraggingName(o.name);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: o.x,
      initialY: o.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent): void => {
    if (!draggingName || !dragStart) return;
    const dx = (e.clientX - dragStart.mouseX) / scaleRatio;
    const dy = (e.clientY - dragStart.mouseY) / scaleRatio;

    let targetX = Math.round(dragStart.initialX + dx);
    let targetY = Math.round(dragStart.initialY + dy);

    // Magnetic snapping (snap to 0 or adjacent monitor edges)
    const snapThreshold = 60;
    if (Math.abs(targetX) < snapThreshold) targetX = 0;
    if (Math.abs(targetY) < snapThreshold) targetY = 0;

    for (const other of outputs) {
      if (other.name === draggingName) continue;
      const isOtherPortrait = other.transform === "90" || other.transform === "270";
      const otherW = isOtherPortrait ? other.height : other.width;

      // Snap to right edge of other
      if (Math.abs(targetX - (other.x + otherW)) < snapThreshold) {
        targetX = other.x + otherW;
      }
      // Snap to left edge of other
      const isCurPortrait =
        selectedOutput?.transform === "90" || selectedOutput?.transform === "270";
      const curW = isCurPortrait ? selectedOutput?.height || 1080 : selectedOutput?.width || 1920;
      if (Math.abs(targetX + curW - other.x) < snapThreshold) {
        targetX = other.x - curW;
      }
      // Snap Y alignment
      if (Math.abs(targetY - other.y) < snapThreshold) {
        targetY = other.y;
      }
    }

    updatePosition({ name: draggingName, x: targetX, y: targetY });
  };

  const handlePointerUp = (): void => {
    setDraggingName(null);
    setDragStart(null);
  };

  const handleRotateNext = (): void => {
    if (!selectedOutput) return;
    const current = selectedOutput.transform || "normal";
    let next = "90";
    if (current === "normal" || current === "0") next = "90";
    else if (current === "90") next = "180";
    else if (current === "180") next = "270";
    else if (current === "270") next = "normal";
    updateTransform({ name: selectedOutput.name, transform: next });
  };

  const handleApplyLayout = async (): Promise<void> => {
    await saveLayout();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-2">
          <div>
            <h1 className="text-[24px] font-bold text-text-header tracking-tight">Display</h1>
            <p className="text-[12px] text-text-subtitle mt-0.5">
              Arrangement, rotation, scaling, night light, and per-display layout.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(): void => {
              void refresh();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-accent" : ""} />
            <span>Detect Displays</span>
          </motion.button>
        </div>

        <div className="flex flex-col gap-6 p-7">
          <IntegrationNotice
            show={!caps.apply_display_scale || !caps.night_light}
            title="Some display helpers are missing"
            message={`${["apply-display-scale", "night-light"]
              .filter(
                (script) =>
                  (script === "apply-display-scale" && !caps.apply_display_scale) ||
                  (script === "night-light" && !caps.night_light),
              )
              .join(
                " and ",
              )} not found in ~/.local/bin. Related controls will have no effect until the dotfiles helper scripts are installed.`}
          />
          {/* ── INTERACTIVE DISPLAY ARRANGER CANVAS ── */}
          <SettingsGroup header="Display Arrangement & Canvas" accent="var(--color-accent)">
            <div className="p-4 bg-surface-elevated">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Move size={14} className="text-accent" />
                  <span className="text-[12px] font-semibold text-text-header">
                    Drag displays to reposition
                  </span>
                </div>
                <span className="text-[11px] text-text-subtitle">
                  {outputs.length} {outputs.length === 1 ? "monitor" : "monitors"} detected
                </span>
              </div>

              {/* Drag Canvas Container */}
              <div
                ref={canvasRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative h-64 w-full rounded-2xl bg-surface-active/60 border border-border overflow-hidden select-none touch-none flex items-center justify-center"
              >
                {/* Background grid pattern */}
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage:
                      "radial-gradient(var(--color-text-subtitle) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {outputs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-text-muted">
                    <Monitor size={32} />
                    <span className="text-[12px]">No displays found via niri</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {outputs.map((o) => {
                      const isSelected =
                        selectedOutput &&
                        (o.name === selectedOutput.name ||
                          o.connector === selectedOutput.connector);
                      const isPortrait = o.transform === "90" || o.transform === "270";
                      const renderW = Math.max(60, (isPortrait ? o.height : o.width) * scaleRatio);
                      const renderH = Math.max(40, (isPortrait ? o.width : o.height) * scaleRatio);

                      // Canvas center offset
                      const leftOffset = canvasWidth / 2 - (boundW * scaleRatio) / 2;
                      const topOffset = canvasHeight / 2 - (boundH * scaleRatio) / 2;
                      const posX = leftOffset + (o.x - minX) * scaleRatio;
                      const posY = topOffset + (o.y - minY) * scaleRatio;

                      return (
                        <div
                          key={o.name}
                          onPointerDown={(e) => handlePointerDown(e, o)}
                          style={{
                            position: "absolute",
                            left: `${posX}px`,
                            top: `${posY}px`,
                            width: `${renderW}px`,
                            height: `${renderH}px`,
                            cursor: draggingName === o.name ? "grabbing" : "grab",
                          }}
                          className={`rounded-xl border-2 transition-shadow flex flex-col items-center justify-center p-2 text-center select-none shadow-md ${
                            isSelected
                              ? "border-accent bg-accent/25 shadow-accent/20 ring-2 ring-accent/30"
                              : "border-border-strong bg-surface-elevated/90 hover:border-text-subtitle"
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Monitor
                              size={12}
                              className={isSelected ? "text-accent" : "text-text-subtitle"}
                            />
                            <span className="text-[11px] font-bold text-text-header truncate max-w-25">
                              {o.connector || o.name}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-text-subtitle">
                            {o.width}x{o.height}
                          </span>
                          {o.transform && o.transform !== "normal" && (
                            <span className="mt-1 px-1.5 py-0.2 rounded text-[8px] font-bold bg-accent/30 text-accent uppercase">
                              {o.transform}°
                            </span>
                          )}
                          <span className="text-[8px] text-text-muted mt-0.5">
                            ({o.x}, {o.y})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── SELECTED MONITOR INSPECTOR ── */}
            {selectedOutput && (
              <div className="p-4 border-t border-border bg-surface-elevated flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                      Configuring Display
                    </span>
                    <h3 className="text-[15px] font-bold text-text-header mt-0.5">
                      {selectedOutput.full_name || selectedOutput.name} (
                      {selectedOutput.connector || selectedOutput.name})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRotateNext}
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-active px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover cursor-pointer"
                    >
                      <RotateCw size={13} className="text-accent" />
                      <span>Rotate 90°</span>
                    </motion.button>
                  </div>
                </div>

                {/* Rotation Options */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-text-subtitle font-medium">
                    Orientation / Rotation:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {ROTATION_OPTIONS.map((opt) => {
                      const isActive = (selectedOutput.transform || "normal") === opt.id;
                      return (
                        <motion.button
                          key={opt.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            updateTransform({ name: selectedOutput.name, transform: opt.id })
                          }
                          className={`rounded-xl py-2 px-3 text-[11px] font-medium border text-center transition-all cursor-pointer ${
                            isActive
                              ? "bg-accent/20 border-accent text-accent font-semibold shadow-sm"
                              : "bg-surface-active/50 border-border text-text-subtitle hover:bg-surface-hover"
                          }`}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Scale Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-text-subtitle font-medium">Display Scale:</span>
                  <div className="flex items-center gap-2">
                    {[1.0, 1.25, 1.5, 1.75, 2.0].map((sc) => {
                      const isActive = Math.abs((selectedOutput.scale || 1.0) - sc) < 0.01;
                      return (
                        <motion.button
                          key={sc}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            updateOutputScale({ name: selectedOutput.name, scale: sc })
                          }
                          className={`rounded-xl py-1.5 px-3 text-[11px] font-medium border transition-all cursor-pointer ${
                            isActive
                              ? "bg-accent/20 border-accent text-accent font-semibold shadow-sm"
                              : "bg-surface-active/50 border-border text-text-subtitle hover:bg-surface-hover"
                          }`}
                        >
                          {sc}x
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Position and Alignments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-active/40 border border-border">
                    <span className="text-[12px] text-text-subtitle">Position X:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={selectedOutput.x}
                        onChange={(e) =>
                          updatePosition({
                            name: selectedOutput.name,
                            x: parseInt(e.target.value) || 0,
                            y: selectedOutput.y,
                          })
                        }
                        className="w-24 rounded-lg bg-surface-elevated border border-border px-2 py-1 text-[12px] font-mono text-text-header text-right"
                      />
                      <span className="text-[10px] text-text-muted">px</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-active/40 border border-border">
                    <span className="text-[12px] text-text-subtitle">Position Y:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={selectedOutput.y}
                        onChange={(e) =>
                          updatePosition({
                            name: selectedOutput.name,
                            x: selectedOutput.x,
                            y: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-24 rounded-lg bg-surface-elevated border border-border px-2 py-1 text-[12px] font-mono text-text-header text-right"
                      />
                      <span className="text-[10px] text-text-muted">px</span>
                    </div>
                  </div>
                </div>

                {/* Apply Layout Button */}
                <div className="flex justify-end pt-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleApplyLayout}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-accent/20 hover:brightness-110 cursor-pointer"
                  >
                    {saving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : saveSuccess ? (
                      <Check size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>
                      {saving
                        ? "Applying..."
                        : saveSuccess
                          ? "Applied & Saved!"
                          : "Apply Display Layout"}
                    </span>
                  </motion.button>
                </div>
              </div>
            )}
          </SettingsGroup>

          {/* ── SYSTEM SCALING & NIGHT LIGHT ── */}
          <SettingsGroup header="System Scaling" accent="#30d158">
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
              hint={!display.night_light_enabled ? "Requires wlsunset" : ""}
            >
              <ToggleSwitch checked={display.night_light_enabled} onToggle={setNightLight} />
            </SettingsRow>
            <SettingsRow title="Color temperature" description="Lower = warmer, higher = cooler.">
              <div className="flex items-center gap-3 w-65">
                <SettingsSlider
                  value={display.night_light_temperature}
                  min={1500}
                  max={6500}
                  step={100}
                  unitLabel={`${display.night_light_temperature} K`}
                  onChange={setNightLightTemp}
                />
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Color Scheme" accent="#64d2ff">
            <SettingsRow
              title="Appearance mode"
              description="Applies to the shell bar, popouts, settings, and all GTK/Qt apps."
            >
              <PillSelector
                options={["Dark", "Light"]}
                currentIndex={appearance.color_scheme === "light" ? 1 : 0}
                onSelected={(i): void => {
                  void setColorScheme(i === 1 ? "light" : "dark");
                }}
              />
            </SettingsRow>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default DisplayPage;
