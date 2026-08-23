import { useAtomValue } from "jotai";
import React from "react";
import { motion } from "framer-motion";
import {
  Wifi,
  Signal,
  CheckCircle2,
  CircleDashed,
  Network as NetworkIcon,
  Loader2,
} from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import IntegrationNotice from "@/components/settings/IntegrationNotice";
import { networkStatusAtom, capabilitiesAtom } from "@/stores";
import type { NetworkInterface } from "@/lib/schemas";

const describeInterface = (iface: NetworkInterface | undefined): string => {
  if (!iface) return "Not present on this machine.";
  if (iface.connected && iface.ips.length > 0) {
    return `Connected — ${iface.ips[0]}`;
  }
  if (iface.connected) return "Connected.";
  const state = iface.state.replace(/^\w/, (c) => c.toUpperCase());
  return state === "Unknown" ? "Not present on this machine." : state + ".";
};

const StateBadge = ({ connected }: { connected: boolean }): React.JSX.Element =>
  connected ? (
    <div className="flex items-center gap-2">
      <Signal size={14} className="text-success" />
      <span className="text-[12px] font-semibold text-success">Connected</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <CircleDashed size={14} className="text-text-muted" />
      <span className="text-[12px] text-text-muted">Disconnected</span>
    </div>
  );

const NetworkPage = (): React.JSX.Element => {
  const status = useAtomValue(networkStatusAtom);
  const caps = useAtomValue(capabilitiesAtom);

  const byKind = (kind: NetworkInterface["kind"]): NetworkInterface | undefined =>
    status.interfaces.find((iface) => iface.kind === kind);
  const wifi = byKind("wifi");
  const ethernet = byKind("ethernet");
  const others = status.interfaces.filter(
    (iface) => iface.kind === "other" && iface !== wifi && iface !== ethernet,
  );
  const anyConnected = status.interfaces.some((iface) => iface.connected);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-6 pb-2">
          <h1 className="text-[24px] font-bold text-text-header tracking-tight">Network</h1>
          <p className="text-[12px] text-text-subtitle mt-0.5">
            Wi-Fi, ethernet interfaces, and network security.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-7">
          {!status.nm_available && (
            <IntegrationNotice
              show
              title="NetworkManager not found"
              message="Interface states are read via nmcli. Install NetworkManager for full status reporting."
            />
          )}

          {/* Active Connection Solid Card */}
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  anyConnected ? "bg-success/15 text-success" : "bg-surface-hover text-text-muted"
                }`}
              >
                <Wifi size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-text-header">
                    {anyConnected ? "Connected to Network" : "No Active Connection"}
                  </span>
                  {status.interfaces.length > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        anyConnected
                          ? "bg-success/20 text-success"
                          : "bg-surface-hover text-text-muted"
                      }`}
                    >
                      {anyConnected ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}
                      {anyConnected ? "Active" : "Offline"}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-text-subtitle mt-0.5">
                  {caps.wpctl || caps.niri
                    ? `${status.interfaces.length} interface${status.interfaces.length === 1 ? "" : "s"} detected`
                    : "Scanning interfaces…"}
                </div>
              </div>
            </div>
          </div>

          <SettingsGroup header="Active Interfaces" accent="var(--color-accent)">
            <SettingsRow title="Wi-Fi Interface" description={describeInterface(wifi)}>
              {wifi ? (
                <StateBadge connected={wifi.connected} />
              ) : (
                <Loader2 size={14} className="text-text-muted" />
              )}
            </SettingsRow>
            <SettingsRow title="Ethernet" description={describeInterface(ethernet)}>
              {ethernet ? (
                <StateBadge connected={ethernet.connected} />
              ) : (
                <CircleDashed size={14} className="text-text-muted" />
              )}
            </SettingsRow>
            {others.length > 0 && (
              <SettingsRow
                title="Other Interfaces"
                description={others.map((iface) => iface.name).join(", ")}
              >
                <div className="flex items-center gap-1.5 text-text-subtitle">
                  <NetworkIcon size={13} />
                  <span className="text-[12px]">{others.length}</span>
                </div>
              </SettingsRow>
            )}
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default NetworkPage;
