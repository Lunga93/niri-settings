import { useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Plus, Trash2, Loader2, Zap } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import IntegrationNotice from "@/components/settings/IntegrationNotice";
import {
  startupAppsAtom,
  startupRunnerAtom,
  startupLoadingAtom,
  loadStartupAppsAtom,
  toggleStartupAppAtom,
  addStartupAppAtom,
  removeStartupAppAtom,
  ensureAutostartRunnerAtom,
} from "@/stores";

const StartupAppsPage = (): React.JSX.Element => {
  const apps = useAtomValue(startupAppsAtom);
  const runner = useAtomValue(startupRunnerAtom);
  const loading = useAtomValue(startupLoadingAtom);
  const loadApps = useSetAtom(loadStartupAppsAtom);
  const toggleApp = useSetAtom(toggleStartupAppAtom);
  const addApp = useSetAtom(addStartupAppAtom);
  const removeApp = useSetAtom(removeStartupAppAtom);
  const fixRunner = useSetAtom(ensureAutostartRunnerAtom);

  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [comment, setComment] = useState("");
  const [adding, setAdding] = useState(false);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const canAdd = name.trim() !== "" && command.trim() !== "" && !adding;

  const handleAdd = async (): Promise<void> => {
    setAdding(true);
    try {
      if (await addApp({ name: name.trim(), command: command.trim(), comment: comment.trim() })) {
        setName("");
        setCommand("");
        setComment("");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleFixRunner = async (): Promise<void> => {
    setFixing(true);
    try {
      await fixRunner();
    } finally {
      setFixing(false);
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
          <h1 className="text-[24px] font-bold text-text-header tracking-tight">Startup Apps</h1>
          <p className="text-[12px] text-text-subtitle mt-0.5">
            Applications launched automatically when your session starts.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-7">
          {/* ── RUNNER STATUS — will these entries actually run? ── */}
          {!runner.runner_installed && (
            <IntegrationNotice
              show
              title="No autostart runner installed"
              message="niri does not run XDG autostart entries by itself. Install dex (e.g. pacman -S dex) so your startup applications are launched at login."
            />
          )}
          {runner.runner_installed && !runner.runner_line_present && (
            <div className="rounded-2xl border border-border bg-surface-elevated p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Zap size={15} className="mt-0.5 shrink-0 text-accent" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-text-header">
                    Autostart entries are not being launched
                  </span>
                  <span className="text-[11px] leading-relaxed text-text-body">
                    {runner.runner_installed_detail} is installed but nothing invokes it on startup.
                    Add one line to the niri config to activate all entries below.
                  </span>
                </div>
              </div>
              <button
                onClick={(): void => {
                  void handleFixRunner();
                }}
                disabled={fixing}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer"
              >
                {fixing ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
                Enable autostart
              </button>
            </div>
          )}

          {/* ── ENTRIES ── */}
          <SettingsGroup header="Applications" accent="var(--color-accent)">
            {loading && apps.length === 0 && (
              <div className="flex items-center gap-2 p-4 text-[12px] text-text-subtitle">
                <Loader2 size={14} className="animate-spin" />
                Reading autostart entries…
              </div>
            )}
            {!loading && apps.length === 0 && (
              <div className="p-4 text-[12px] text-text-subtitle">
                No startup applications configured yet.
              </div>
            )}
            {apps.map((app) => (
              <SettingsRow
                key={app.id}
                title={app.name}
                description={app.comment || app.command}
                hint={!app.hidden ? undefined : "Disabled"}
              >
                <div className="flex items-center gap-3">
                  {!app.hidden && (
                    <span className="text-[11px] text-text-muted hidden xl:inline max-w-60 truncate">
                      {app.command}
                    </span>
                  )}
                  <ToggleSwitch
                    checked={!app.hidden}
                    onToggle={(): void => {
                      void toggleApp(app.id);
                    }}
                  />
                  <button
                    onClick={(): void => {
                      void removeApp(app.id);
                    }}
                    title={`Remove ${app.name}`}
                    className="text-text-muted hover:text-danger transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </SettingsRow>
            ))}
          </SettingsGroup>

          {/* ── ADD NEW ENTRY ── */}
          <SettingsGroup header="Add Application" accent="#30d158">
            <div className="p-4 flex flex-col gap-3">
              <input
                value={name}
                onChange={(e): void => setName(e.target.value)}
                placeholder="Name (e.g. JetBrains Toolbox)"
                className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-[12px] text-text-body outline-none focus:border-accent"
              />
              <input
                value={command}
                onChange={(e): void => setCommand(e.target.value)}
                placeholder="Command (e.g. /opt/toolbox/bin/toolbox --minimize)"
                className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-[12px] text-text-body outline-none focus:border-accent font-mono"
              />
              <input
                value={comment}
                onChange={(e): void => setComment(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-[12px] text-text-body outline-none focus:border-accent"
              />
              <button
                onClick={(): void => {
                  void handleAdd();
                }}
                disabled={!canAdd}
                className="self-start flex items-center gap-1.5 rounded-xl border border-accent bg-accent/20 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add to startup
              </button>
            </div>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default StartupAppsPage;
