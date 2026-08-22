import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSlider from "@/components/settings/SettingsSlider";
import {
  soundAtom,
  setOutputVolumeAtom,
  setOutputMutedAtom,
  setInputVolumeAtom,
  setInputMutedAtom,
} from "@/lib/atoms";
import React from "react";

const SoundPage = (): React.JSX.Element => {
  const [sound] = useAtom(soundAtom);
  const setOutputVolume = useSetAtom(setOutputVolumeAtom);
  const setOutputMuted = useSetAtom(setOutputMutedAtom);
  const setInputVolume = useSetAtom(setInputVolumeAtom);
  const setInputMuted = useSetAtom(setInputMutedAtom);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-5 pb-2">
          <h1 className="text-[24px] font-bold text-text-header">Sound</h1>
          <p className="text-[12px] text-text-subtitle mt-1">Output and input volume settings.</p>
        </div>

        <div className="flex flex-col gap-5 p-7">
          <SettingsGroup header="Output">
            <SettingsRow title="Volume" description="Main output volume.">
              <div className="flex items-center gap-3 w-65">
                <SettingsSlider
                  value={sound.output_volume}
                  min={0}
                  max={100}
                  onChange={setOutputVolume}
                  unitLabel={`${sound.output_volume}%`}
                />
              </div>
            </SettingsRow>
            <SettingsRow title="Muted">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(): void => setOutputMuted(!sound.output_muted)}
                className={`h-6.5 w-11.5 shrink-0 rounded-full p-0.75 transition-colors duration-200 cursor-pointer ${
                  sound.output_muted ? "bg-danger" : "bg-surface-active"
                }`}
              >
                <motion.div
                  className="h-5 w-5 rounded-full bg-white shadow-md"
                  animate={{ x: sound.output_muted ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup header="Input" accent="#bf5af2">
            <SettingsRow title="Microphone" description="Input volume level.">
              <div className="flex items-center gap-3 w-65">
                <SettingsSlider
                  value={sound.input_volume}
                  min={0}
                  max={100}
                  onChange={setInputVolume}
                  unitLabel={`${sound.input_volume}%`}
                />
              </div>
            </SettingsRow>
            <SettingsRow title="Muted">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(): void => setInputMuted(!sound.input_muted)}
                className={`h-6.5 w-11.5 shrink-0 rounded-full p-0.75 transition-colors duration-200 cursor-pointer ${
                  sound.input_muted ? "bg-danger" : "bg-surface-active"
                }`}
              >
                <motion.div
                  className="h-5 w-5 rounded-full bg-white shadow-md"
                  animate={{ x: sound.input_muted ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </SettingsRow>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default SoundPage;
