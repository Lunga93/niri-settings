import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Headphones,
  Tv,
  Speaker,
  Play,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSlider from "@/components/settings/SettingsSlider";
import {
  soundAtom,
  setOutputVolumeAtom,
  setOutputMutedAtom,
  setInputVolumeAtom,
  setInputMutedAtom,
} from "@/stores";
import {
  audioInfoAtom,
  audioLoadingAtom,
  refreshAudioDevicesAtom,
  setDefaultAudioDeviceAtom,
  testAudioAtom,
  capabilitiesAtom,
} from "@/stores";
import IntegrationNotice from "@/components/settings/IntegrationNotice";
import type { AudioDevice } from "@/lib/schemas";

const getDeviceIcon = (device: AudioDevice): typeof Volume2 => {
  const type = device.device_type;
  if (type === "headphones") return Headphones;
  if (type === "hdmi") return Tv;
  if (type === "speaker") return Speaker;
  if (type === "mic") return Mic;
  return Volume2;
};

const SoundPage = (): React.JSX.Element => {
  const [sound] = useAtom(soundAtom);
  const setOutputVolume = useSetAtom(setOutputVolumeAtom);
  const setOutputMuted = useSetAtom(setOutputMutedAtom);
  const setInputVolume = useSetAtom(setInputVolumeAtom);
  const setInputMuted = useSetAtom(setInputMutedAtom);

  const [audioInfo] = useAtom(audioInfoAtom);
  const caps = useAtomValue(capabilitiesAtom);
  const [loading] = useAtom(audioLoadingAtom);
  const refreshDevices = useSetAtom(refreshAudioDevicesAtom);
  const setDefaultDevice = useSetAtom(setDefaultAudioDeviceAtom);
  const triggerTestAudio = useSetAtom(testAudioAtom);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const defaultSink =
    audioInfo.sinks.find((s) => s.is_default || s.id === audioInfo.default_sink_id) ||
    audioInfo.sinks[0];
  const defaultSource =
    audioInfo.sources.find((s) => s.is_default || s.id === audioInfo.default_source_id) ||
    audioInfo.sources[0];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-2">
          <div>
            <h1 className="text-[24px] font-bold text-text-header tracking-tight">Sound</h1>
            <p className="text-[12px] text-text-subtitle mt-0.5">
              Output and input devices, volume balance, and audio settings.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(): void => {
              void refreshDevices();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-accent" : ""} />
            <span>Scan Devices</span>
          </motion.button>
        </div>

        <div className="flex flex-col gap-6 p-7">
          <IntegrationNotice
            show={!caps.wpctl}
            title="WirePlumber control not found"
            message="The wpctl command is unavailable, so volume and device switching have no effect. Install WirePlumber (pipewire) to enable audio controls."
          />
          {/* ── OUTPUT SECTION ── */}
          <SettingsGroup header="Output Device" accent="var(--color-accent)">
            {/* Device Selection Cards */}
            <div className="p-4 bg-surface-elevated">
              <div className="mb-2 text-[11px] font-semibold text-text-subtitle uppercase tracking-wider">
                Select Playback Device
              </div>
              {audioInfo.sinks.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-text-muted rounded-xl bg-surface-active/50 border border-border">
                  No audio outputs detected. WirePlumber / PipeWire service may be starting.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {audioInfo.sinks.map((device) => {
                    const isSelected =
                      device.id === (defaultSink ? defaultSink.id : audioInfo.default_sink_id);
                    const Icon = getDeviceIcon(device);
                    return (
                      <motion.button
                        key={device.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={(): void => {
                          void setDefaultDevice(device.id);
                        }}
                        className={`relative flex items-start gap-3 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-accent/15 border-accent shadow-sm"
                            : "bg-surface-active/40 border-border hover:bg-surface-hover hover:border-border-strong"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-accent text-white shadow-sm"
                              : "bg-surface-elevated text-text-subtitle"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-text-header truncate">
                              {device.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-text-subtitle capitalize">
                              {device.device_type}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/25 text-accent uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3.5 right-3 text-accent">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Output Volume Controls */}
            <SettingsRow
              title="Output Volume"
              description={`Controls ${defaultSink ? defaultSink.name : "main output"} level.`}
            >
              <div className="flex items-center gap-3 w-72">
                <SettingsSlider
                  value={sound.output_volume}
                  min={0}
                  max={150}
                  onChange={setOutputVolume}
                  unitLabel={`${sound.output_volume}%`}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title="Mute Output"
              description="Temporarily silence all desktop and application audio."
            >
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(): void => {
                    void triggerTestAudio();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-active px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover cursor-pointer"
                >
                  <Play size={12} className="text-accent" />
                  <span>Test Sound</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(): void => setOutputMuted(!sound.output_muted)}
                  className={`h-7 w-12 shrink-0 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    sound.output_muted ? "bg-danger" : "bg-surface-active"
                  }`}
                >
                  <motion.div
                    className="h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center text-black"
                    animate={{ x: sound.output_muted ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {sound.output_muted ? (
                      <VolumeX size={11} className="text-danger" />
                    ) : (
                      <Volume2 size={11} className="text-surface-content" />
                    )}
                  </motion.div>
                </motion.button>
              </div>
            </SettingsRow>
          </SettingsGroup>

          {/* ── INPUT SECTION ── */}
          <SettingsGroup header="Input Device" accent="#bf5af2">
            {/* Device Selection Cards */}
            <div className="p-4 bg-surface-elevated">
              <div className="mb-2 text-[11px] font-semibold text-text-subtitle uppercase tracking-wider">
                Select Recording Microphone
              </div>
              {audioInfo.sources.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-text-muted rounded-xl bg-surface-active/50 border border-border">
                  No audio input devices detected.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {audioInfo.sources.map((device) => {
                    const isSelected =
                      device.id ===
                      (defaultSource ? defaultSource.id : audioInfo.default_source_id);
                    const Icon = getDeviceIcon(device);
                    return (
                      <motion.button
                        key={device.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={(): void => {
                          void setDefaultDevice(device.id);
                        }}
                        className={`relative flex items-start gap-3 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#bf5af2]/15 border-[#bf5af2] shadow-sm"
                            : "bg-surface-active/40 border-border hover:bg-surface-hover hover:border-border-strong"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-[#bf5af2] text-white shadow-sm"
                              : "bg-surface-elevated text-text-subtitle"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-text-header truncate">
                              {device.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-text-subtitle capitalize">
                              {device.device_type}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#bf5af2]/25 text-[#bf5af2] uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3.5 right-3 text-[#bf5af2]">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Volume Controls */}
            <SettingsRow
              title="Input Sensitivity"
              description={`Gain level for ${defaultSource ? defaultSource.name : "microphone"}.`}
            >
              <div className="flex items-center gap-3 w-72">
                <SettingsSlider
                  value={sound.input_volume}
                  min={0}
                  max={150}
                  onChange={setInputVolume}
                  unitLabel={`${sound.input_volume}%`}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title="Mute Microphone"
              description="Disable audio capture across all apps."
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(): void => setInputMuted(!sound.input_muted)}
                className={`h-7 w-12 shrink-0 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  sound.input_muted ? "bg-danger" : "bg-surface-active"
                }`}
              >
                <motion.div
                  className="h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center text-black"
                  animate={{ x: sound.input_muted ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {sound.input_muted ? (
                    <MicOff size={11} className="text-danger" />
                  ) : (
                    <Mic size={11} className="text-surface-content" />
                  )}
                </motion.div>
              </motion.button>
            </SettingsRow>
          </SettingsGroup>

          {/* ── QUICK SOUND PROFILES CARD ── */}
          <div className="rounded-2xl border border-border bg-surface-elevated p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-text-header">Audio Engine</div>
                <div className="text-[11px] text-text-subtitle">
                  Managed via PipeWire & WirePlumber audio server
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-medium text-success">Active</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SoundPage;
