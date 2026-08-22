import React from "react";
import { motion } from "framer-motion";
import { Wifi, Signal, CheckCircle2, Lock } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";

const NetworkPage = (): React.JSX.Element => (
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
        {/* Active Connection Solid Card */}
        <div className="rounded-2xl border border-border bg-surface-elevated p-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
              <Wifi size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-text-header">Connected to Network</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-success/20 text-success">
                  <CheckCircle2 size={11} />
                  Active
                </span>
              </div>
              <div className="text-[12px] text-text-subtitle mt-0.5">
                Managed via NetworkManager & iwd
              </div>
            </div>
          </div>
        </div>

        <SettingsGroup header="Active Interfaces" accent="var(--color-accent)">
          <SettingsRow
            title="Wi-Fi Interface"
            description="Wireless 802.11ax/ac dual-band connection."
          >
            <div className="flex items-center gap-2">
              <Signal size={14} className="text-success" />
              <span className="text-[12px] font-semibold text-success">Connected</span>
            </div>
          </SettingsRow>
          <SettingsRow title="Ethernet" description="Gigabit wired network link.">
            <span className="text-[12px] text-text-muted">Unplugged</span>
          </SettingsRow>
          <SettingsRow title="VPN & Security" description="Encrypted WireGuard / OpenVPN tunnel.">
            <div className="flex items-center gap-1.5 text-text-subtitle">
              <Lock size={13} />
              <span className="text-[12px]">Ready</span>
            </div>
          </SettingsRow>
        </SettingsGroup>
      </div>
    </motion.div>
  </div>
);

export default NetworkPage;
