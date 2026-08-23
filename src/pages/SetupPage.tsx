import React, { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { Wand2, Check, CircleAlert, Loader2, Download, RefreshCw } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import {
  capabilitiesAtom,
  loadCapabilitiesAtom,
  tierStatusAtom,
  tierBackupsAtom,
  loadTierStatusAtom,
  updateInfoAtom,
  checkUpdateAtom,
} from "@/stores";
import {
  installHelperScripts,
  adoptTier2,
  restoreTier2Backup,
  downloadUpdate,
  applyUpdate,
} from "@/lib/services";
import type { HelperScriptResult } from "@/lib/schemas";

// --- Tier 1 helpers ---

type HelperKey = "apply_theme" | "apply_display_scale" | "night_light";

const HELPER_KEYS: readonly HelperKey[] = ["apply_theme", "apply_display_scale", "night_light"];

const HELPER_LABELS: Record<HelperKey, string> = {
  apply_theme: "Theme pipeline",
  apply_display_scale: "Display scaling",
  night_light: "Night light",
};

// --- Tier 2 feature list ---

const TIER2_FEATURES = [
  "Quickshell top bar, notifications (swaync) and app launcher (wofi)",
  "Lock screen, clipboard manager and media controls",
  "Full helper-script suite with wallpaper logging and restore",
  "Alacritty, GTK themes, fastfetch, welcome app and systemd units",
];

// --- Stepper ---

type TierLevel = 0 | 1 | 2;

const STEPS: { tier: TierLevel; label: string; color: string; bg: string }[] = [
  { tier: 0, label: "Bare niri", color: "var(--color-text-muted)", bg: "transparent" },
  {
    tier: 1,
    label: "Appearance Helpers",
    color: "var(--color-success)",
    bg: "var(--color-success-soft)",
  },
  {
    tier: 2,
    label: "Full Desktop Suite",
    color: "var(--color-accent)",
    bg: "var(--color-accent-soft)",
  },
];

const StepIndicator = ({
  tier,
  currentTier,
  label,
  color,
  bg,
}: {
  tier: TierLevel;
  currentTier: number;
  label: string;
  color: string;
  bg: string;
}): React.JSX.Element => {
  const reached = currentTier >= tier;
  const isCurrent = currentTier === tier;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors"
        style={{
          borderColor: reached ? color : "var(--color-border)",
          backgroundColor: reached ? bg : "transparent",
          color: reached ? color : "var(--color-text-muted)",
        }}
      >
        {reached ? <Check size={14} /> : tier}
      </div>
      <span
        className="text-[10px] font-medium text-center leading-tight max-w-[80px]"
        style={{ color: isCurrent ? color : "var(--color-text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
};

const Stepper = ({ currentTier }: { currentTier: number }): React.JSX.Element => (
  <div className="flex items-center justify-center gap-3">
    {STEPS.map((step, i) => (
      <React.Fragment key={step.tier}>
        <StepIndicator {...step} currentTier={currentTier} />
        {i < STEPS.length - 1 && (
          <div
            className="flex-1 h-0.5 min-w-[32px] rounded-full"
            style={{
              backgroundColor: currentTier > step.tier ? STEPS[i + 1].color : "var(--color-border)",
            }}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// --- Tier 1 content ---

const Tier1Content = ({
  caps,
  installing,
  results,
  onInstall,
}: {
  caps: Record<string, boolean>;
  installing: boolean;
  results: HelperScriptResult[];
  onInstall: () => void;
}): React.JSX.Element => {
  const missing = HELPER_KEYS.filter((key) => !caps[key]);
  return (
    <>
      <p className="text-[12px] leading-relaxed text-text-body">
        Helper scripts power theming, display scaling, and night light on bare setups. One click
        installs them into your local bin directory — no terminal work, no environment variables.
        Existing custom versions are never overwritten.
      </p>
      <div className="flex flex-col gap-2">
        {HELPER_KEYS.map((key) => {
          const present = Boolean(caps[key]);
          return (
            <div key={key} className="flex items-center gap-2.5 text-[12px]">
              {present ? (
                <Check size={14} className="text-success shrink-0" />
              ) : (
                <CircleAlert size={14} className="text-warn shrink-0" />
              )}
              <span className={present ? "text-text-header" : "text-text-subtitle"}>
                {HELPER_LABELS[key]}
              </span>
              {!present && <span className="text-[11px] text-text-muted ml-auto">not found</span>}
            </div>
          );
        })}
      </div>
      {missing.length > 0 && (
        <button
          onClick={onInstall}
          disabled={installing}
          className="self-start flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
        >
          {installing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Install helper scripts
        </button>
      )}
      {results.length > 0 && (
        <ul className="text-[11px] text-text-subtitle flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.script} className="flex items-center gap-1.5">
              <Check size={11} className="text-success shrink-0" />
              <span className="font-mono">{r.script}</span>
              <span>
                {r.status === "kept"
                  ? "— kept your existing version"
                  : r.status === "updated"
                    ? "— updated"
                    : "— installed"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!caps.pywal_cache && (
        <div className="rounded-xl border border-border bg-surface-elevated/60 p-3">
          <p className="text-[11px] leading-relaxed text-text-subtitle">
            Optional: install pywal and wlsunset so wallpapers recolor your apps and night light
            actually shifts color temperature:
          </p>
          <code className="block mt-1.5 text-[11px] text-text-body font-mono select-all">
            sudo pacman -S --needed pywal wlsunset
          </code>
        </div>
      )}
    </>
  );
};

// --- Tier 2 content ---

const Tier2Content = ({
  active,
  backups,
  confirming,
  working,
  status,
  onAdopt,
  onRestore,
  onSetConfirming,
}: {
  active: boolean;
  backups: { id: string; created: string; items: number }[];
  confirming: boolean;
  working: string;
  status: { stowed: string[] } | null;
  onAdopt: (dryRun: boolean) => void;
  onRestore: (id: string) => void;
  onSetConfirming: (v: boolean) => void;
}): React.JSX.Element => (
  <>
    {active ? (
      <div className="flex items-center gap-2.5 text-[12px]">
        <Check size={14} className="text-success shrink-0" />
        <span className="text-text-header font-semibold">
          Full desktop active
          {status && ` — ${status.stowed.length} configs linked from ~/dotfiles`}
        </span>
      </div>
    ) : (
      <>
        <p className="text-[12px] leading-relaxed text-text-body">
          Adopt the complete desktop experience from the dotfiles suite. This runs the official
          installer in a terminal window:
        </p>
        <ul className="flex flex-col gap-1.5 text-[12px] text-text-body list-none">
          {TIER2_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check size={13} className="text-accent mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-border bg-surface-elevated/60 p-3 text-[11px] leading-relaxed text-text-subtitle flex flex-col gap-1">
          <span>
            • Installs ~50 packages via pacman and AUR — you will type your sudo password in the
            terminal.
          </span>
          <span>
            • Existing configs are replaced, but a full backup is created first and can be restored
            below at any time.
          </span>
          <span>• A logout/login afterwards activates everything.</span>
        </div>
      </>
    )}
    <div className="flex items-center gap-2">
      <button
        onClick={(): void => onAdopt(true)}
        disabled={working !== ""}
        className="flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface-hover px-3 py-2 text-[11px] font-semibold text-text-header hover:bg-surface-active disabled:opacity-50 cursor-pointer"
      >
        {working === "preview" && <Loader2 size={12} className="animate-spin" />}
        Preview changes (dry-run)
      </button>
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            onClick={(): void => onAdopt(false)}
            disabled={working !== ""}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
          >
            {working === "adopt" ? <Loader2 size={12} className="animate-spin" /> : null}
            Yes, back up & install
          </button>
          <button
            onClick={(): void => onSetConfirming(false)}
            className="text-[11px] text-text-subtitle hover:text-text-body cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={(): void => onSetConfirming(true)}
          disabled={working !== ""}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
        >
          <Wand2 size={13} />
          Install full desktop
        </button>
      )}
    </div>
    <div className="rounded-xl border border-border bg-surface-elevated/60 p-3 flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-text-subtitle">
        Config backups
      </span>
      {backups.length === 0 ? (
        <span className="text-[11px] text-text-muted">No backups yet</span>
      ) : (
        <>
          {backups.map((backup) => (
            <div key={backup.id} className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-text-body font-mono">
                {backup.created}
                <span className="text-text-muted"> · {backup.items} configs</span>
              </span>
              <button
                onClick={(): void => onRestore(backup.id)}
                disabled={working !== ""}
                className="text-[11px] font-semibold text-warn hover:text-text-header disabled:opacity-50 cursor-pointer"
              >
                {working === `restore-${backup.id}` ? "Restoring…" : "Restore"}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  </>
);

// --- Update Banner ---

const UpdateBanner = (): React.JSX.Element | null => {
  const info = useAtomValue(updateInfoAtom);
  const checkUpdate = useSetAtom(checkUpdateAtom);
  const [downloading, setDownloading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void checkUpdate();
  }, [checkUpdate]);

  if (!info?.available) return null;

  const handleDownload = async (): Promise<void> => {
    setDownloading(true);
    setError("");
    try {
      const result = await downloadUpdate(info.url!);
      if (!result || result.status === "error") {
        setError(result?.message ?? "Download failed.");
        return;
      }
      const applied_ = await applyUpdate(result.path!);
      if (applied_?.status === "ready") {
        setApplied(true);
      } else {
        setError(applied_?.message ?? "Apply failed.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-accent bg-accent-soft p-4 flex items-center gap-3"
    >
      <RefreshCw size={16} className="text-accent shrink-0" />
      <div className="flex-1">
        <p className="text-[12px] font-semibold text-text-header">
          Update available: v{info.version}
        </p>
        <p className="text-[11px] text-text-subtitle mt-0.5">
          Part of the Manatee Desktop experience — download and restart to update.
        </p>
      </div>
      {applied ? (
        <span className="text-[11px] font-semibold text-success">Ready — restart to apply</span>
      ) : (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {downloading ? "Downloading…" : "Update now"}
        </button>
      )}
      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
    </motion.div>
  );
};

// --- Main SetupPage ---

const SetupPage = (): React.JSX.Element => {
  const caps = useAtomValue(capabilitiesAtom);
  const reloadCaps = useSetAtom(loadCapabilitiesAtom);
  const tierStatus = useAtomValue(tierStatusAtom);
  const backups = useAtomValue(tierBackupsAtom);
  const loadTier = useSetAtom(loadTierStatusAtom);

  const [installing, setInstalling] = useState(false);
  const [helperResults, setHelperResults] = useState<HelperScriptResult[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState("");
  const [note, setNote] = useState("");

  const tier: number = tierStatus?.tier ?? 0;
  const tier2Active = tier === 2;

  useEffect(() => {
    void loadTier();
  }, [loadTier]);

  const handleInstall = async (): Promise<void> => {
    setInstalling(true);
    try {
      const result = await installHelperScripts();
      if (result) {
        setHelperResults(result.results);
        await reloadCaps();
      }
    } finally {
      setInstalling(false);
    }
  };

  const runAdopt = async (dryRun: boolean): Promise<void> => {
    setWorking(dryRun ? "preview" : "adopt");
    try {
      const result = await adoptTier2(dryRun);
      if (!result) {
        setNote("Could not start the installer.");
      } else if (result.status === "already_active") {
        setNote("The full desktop is already installed — nothing was changed.");
      } else if (result.status === "preview_launched") {
        setNote("Dry-run opened in a terminal window. Close it when you finish reading.");
      } else {
        setNote(
          result.backup_id
            ? `Backup ${result.backup_id} created (${result.backed_up ?? 0} items). Installer opened in a terminal window — enter your sudo password there.`
            : "Installer opened in a terminal window.",
        );
      }
      await loadTier();
    } finally {
      setWorking("");
      setConfirming(false);
    }
  };

  const restore = async (id: string): Promise<void> => {
    setWorking(`restore-${id}`);
    try {
      const count = await restoreTier2Backup(id);
      setNote(count === null ? "Restore failed." : `Restored ${count} items from ${id}.`);
      await loadTier();
    } finally {
      setWorking("");
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-6 pb-2">
          <h1 className="text-[24px] font-bold text-text-header tracking-tight">Get Started</h1>
          <p className="text-[12px] text-text-subtitle mt-0.5">
            Progressively unlock your desktop experience.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-7">
          <UpdateBanner />
          <SettingsGroup header="Setup Progress" accent="var(--color-accent)">
            <div className="p-4 flex flex-col gap-5">
              <Stepper currentTier={tier} />

              {/* Tier 1 card */}
              <div
                className="rounded-xl border p-4 flex flex-col gap-3"
                style={{
                  borderColor: tier >= 1 ? "var(--color-success)" : "var(--color-border)",
                  backgroundColor:
                    tier >= 1 ? "var(--color-success-soft)" : "var(--color-surface-elevated)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: tier >= 1 ? "var(--color-success)" : "var(--color-border)",
                      color: tier >= 1 ? "white" : "var(--color-text-muted)",
                    }}
                  >
                    {tier >= 1 ? <Check size={12} /> : 1}
                  </div>
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: tier >= 1 ? "var(--color-success)" : "var(--color-text-header)",
                    }}
                  >
                    Tier 1 — Appearance Helpers
                  </span>
                </div>
                <Tier1Content
                  caps={caps}
                  installing={installing}
                  results={helperResults}
                  onInstall={handleInstall}
                />
              </div>

              {/* Tier 2 card */}
              <div
                className="rounded-xl border p-4 flex flex-col gap-3"
                style={{
                  borderColor: tier2Active ? "var(--color-accent)" : "var(--color-border)",
                  backgroundColor: tier2Active
                    ? "var(--color-accent-soft)"
                    : "var(--color-surface-elevated)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: tier2Active ? "var(--color-accent)" : "var(--color-border)",
                      color: tier2Active ? "white" : "var(--color-text-muted)",
                    }}
                  >
                    {tier2Active ? <Check size={12} /> : 2}
                  </div>
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: tier2Active ? "var(--color-accent)" : "var(--color-text-header)",
                    }}
                  >
                    Tier 2 — Full Desktop Suite
                  </span>
                </div>
                <Tier2Content
                  active={tier2Active}
                  backups={backups}
                  confirming={confirming}
                  working={working}
                  status={tierStatus}
                  onAdopt={runAdopt}
                  onRestore={restore}
                  onSetConfirming={setConfirming}
                />
              </div>

              {note && <p className="text-[11px] leading-relaxed text-text-body">{note}</p>}
            </div>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupPage;
