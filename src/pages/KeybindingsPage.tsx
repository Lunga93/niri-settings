import React, { useState, useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, RotateCcw, FileText } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import { keybindingsAtom, KEYBINDING_GROUPS } from "@/stores/keybindingAtoms";
import {
  readKeybindings,
  writeKeybinding,
  openFile,
  reloadNiriConfig,
  getNiriConfigPath,
} from "@/lib/services";
import { logger } from "@/lib/logger";

interface KeyRowProps {
  readonly action: string;
  readonly label: string;
  readonly alternate: boolean;
  readonly onUpdated: () => void;
}

interface CaptureDialogProps {
  readonly initialKey: string;
  readonly onAccept: (key: string) => void;
  readonly onReject: () => void;
}

const KeyRow = ({ action, label, alternate, onUpdated }: KeyRowProps): React.JSX.Element => {
  const [bindings] = useAtom(keybindingsAtom);
  const binding = bindings.find((b) => b.action === action) ?? null;
  const [editing, setEditing] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const currentKey = pendingKey ?? binding?.key ?? null;
  const isBound = currentKey !== null;

  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        alternate ? "bg-surface-elevated/50" : ""
      }`}
    >
      <span className="text-[12px] text-text-subtitle">{label}</span>

      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentKey ?? "unbound"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`
              rounded-lg px-3 py-1 text-[11px] font-mono font-medium tracking-wide border
              ${
                isBound
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "bg-transparent border-border text-text-muted"
              }
            `}
          >
            {currentKey ?? "Not bound"}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(): void => setEditing(true)}
          className={`
            flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px]
            transition-colors cursor-pointer
            ${
              isBound
                ? "text-text-body hover:bg-surface-hover"
                : "text-text-muted/40 cursor-not-allowed"
            }
          `}
        >
          <Pencil size={10} />
          Edit
        </motion.button>
      </div>

      <AnimatePresence>
        {editing && (
          <CaptureDialog
            initialKey={currentKey ?? ""}
            onAccept={(newKey): void => {
              setPendingKey(newKey);
              setEditing(false);
              // Persist to niri config
              void writeKeybinding(currentKey ?? "", newKey, action).then((ok) => {
                if (ok) {
                  logger.info(`Keybinding updated: ${label} → ${newKey}`);
                  onUpdated();
                }
              });
            }}
            onReject={(): void => setEditing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const CaptureDialog = ({
  initialKey,
  onAccept,
  onReject,
}: CaptureDialogProps): React.JSX.Element => {
  const [captured, setCaptured] = useState<string | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Super");

    const key = e.key;
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    }

    if (parts.length > 0) {
      setCaptured(parts.join("+"));
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onReject}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="w-[320px] rounded-2xl border border-border bg-surface-window p-6 shadow-2xl"
        onClick={(e): void => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        ref={(el): void => {
          el?.focus();
        }}
      >
        <h3 className="text-[15px] font-semibold text-text-header mb-4">Press a key combination</h3>

        <div className="flex h-12 items-center justify-center rounded-xl border border-border bg-surface-active mb-4">
          <AnimatePresence mode="wait">
            <motion.span
              key={captured ?? "waiting"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`text-[13px] font-mono font-medium ${
                captured ? "text-accent" : "text-text-muted"
              }`}
            >
              {captured ?? "Press keys..."}
            </motion.span>
          </AnimatePresence>
        </div>

        {captured !== null && (
          <p className="text-[11px] text-text-subtitle text-center mb-4">
            Initial: {initialKey} → New: {captured}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex-1 rounded-lg border border-border bg-surface-elevated py-2 text-[12px] text-text-body hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={(): void => {
              if (captured) onAccept(captured);
            }}
            disabled={captured === null}
            className="flex-1 rounded-lg bg-accent py-2 text-[12px] font-medium text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const KeybindingsPage = (): React.JSX.Element => {
  const [, setBindings] = useAtom(keybindingsAtom);
  const [reloading, setReloading] = useState(false);

  const loadBindings = useCallback(async (): Promise<void> => {
    try {
      const raw = await readKeybindings();
      if (Array.isArray(raw)) {
        const parsed = raw.filter(
          (b): b is { action: string; key: string } =>
            typeof b === "object" && b !== null && "action" in b && "key" in b,
        );
        setBindings(parsed);
      }
    } catch (err) {
      logger.warn("Failed to load keybindings", err);
    }
  }, [setBindings]);

  useEffect(() => {
    void loadBindings();
  }, [loadBindings]);

  const handleReload = useCallback(async (): Promise<void> => {
    setReloading(true);
    await reloadNiriConfig();
    setReloading(false);
  }, []);

  const handleOpenConfig = useCallback(async (): Promise<void> => {
    const path = await getNiriConfigPath();
    if (path) {
      await openFile(path);
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-7 pt-5 pb-2">
          <div>
            <h1 className="text-[24px] font-bold text-text-header">Keybindings</h1>
            <p className="text-[12px] text-text-subtitle mt-1">
              Niri keybinding reference. MOD = Super/Windows key. Changes save instantly.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleReload}
            disabled={reloading}
            className="flex items-center gap-2 rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-[11px] text-text-body hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={12} className={reloading ? "animate-spin" : ""} />
            {reloading ? "Reloading..." : "Reload"}
          </motion.button>
        </div>

        <div className="flex flex-col gap-4 p-7">
          {KEYBINDING_GROUPS.map((group, gi) => (
            <motion.div
              key={group.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <SettingsGroup header={group.name}>
                {group.rows.map((row, ri) => (
                  <KeyRow
                    key={row.action}
                    action={row.action}
                    label={row.label}
                    alternate={ri % 2 === 1}
                    onUpdated={loadBindings}
                  />
                ))}
              </SettingsGroup>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-surface-elevated p-4 text-[11px] text-text-muted"
          >
            Need something not in this list?
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenConfig}
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <FileText size={11} />
              Open niri config
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default KeybindingsPage;
