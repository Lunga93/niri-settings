import { useAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import TitleBar from "./TitleBar";
import { activePageAtom } from "@/stores/appAtoms";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import WallpaperPage from "@/pages/WallpaperPage";
import AppearancePage from "@/pages/AppearancePage";
import IconsPage from "@/pages/IconsPage";
import DisplayPage from "@/pages/DisplayPage";
import KeybindingsPage from "@/pages/KeybindingsPage";
import NetworkPage from "@/pages/NetworkPage";
import SoundPage from "@/pages/SoundPage";
import SysInfoPage from "@/pages/SysInfoPage";

const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  wallpaper: WallpaperPage,
  appearance: AppearancePage,
  icons: IconsPage,
  display: DisplayPage,
  keybindings: KeybindingsPage,
  network: NetworkPage,
  sound: SoundPage,
  sysinfo: SysInfoPage,
};

const pageVariants = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.995 },
};

const AppLayout = (): React.JSX.Element => {
  const [activePage] = useAtom(activePageAtom);
  const PageComponent = PAGE_COMPONENTS[activePage] ?? WallpaperPage;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl border border-border bg-surface-window shadow-2xl"
    >
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[232px] shrink-0 bg-surface-sidebar border-r border-border">
          <Sidebar />
        </div>

        <div className="flex-1 overflow-hidden bg-surface-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <ErrorBoundary context={activePage} fallback={<PageFallback />}>
                <PageComponent />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const PageFallback = (): React.JSX.Element => (
  <div className="flex h-full items-center justify-center">
    <p className="text-[13px] text-text-subtitle">Failed to load page.</p>
  </div>
);

export default AppLayout;
