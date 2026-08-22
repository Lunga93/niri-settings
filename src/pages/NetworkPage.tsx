import { motion } from "framer-motion";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";

const NetworkPage = (): React.JSX.Element => (
  <div className="h-full overflow-y-auto scrollbar-thin">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="px-7 pt-5 pb-2">
        <h1 className="text-[24px] font-bold text-text-header">Network</h1>
        <p className="text-[12px] text-text-subtitle mt-1">Wi-Fi, ethernet, and VPN connections.</p>
      </div>

      <div className="flex flex-col gap-5 p-7">
        <SettingsGroup header="Connections">
          <SettingsRow title="Wi-Fi" description="Wireless network connections.">
            <span className="text-[11px] text-success font-medium">Connected</span>
          </SettingsRow>
          <SettingsRow title="Ethernet" description="Wired network connections.">
            <span className="text-[11px] text-text-muted">Not connected</span>
          </SettingsRow>
        </SettingsGroup>
      </div>
    </motion.div>
  </div>
);

export default NetworkPage;
