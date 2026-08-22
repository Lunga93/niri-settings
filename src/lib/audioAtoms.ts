import { atom } from "jotai";
import { AudioInfoSchema, type AudioInfo } from "./schemas";
import {
  getAudioDevices,
  setDefaultAudioDevice,
  setAudioDeviceVolume,
  testAudio,
} from "./services";
import { logger } from "./logger";

export const DEFAULT_AUDIO_INFO: AudioInfo = AudioInfoSchema.parse({});

export const audioInfoAtom = atom<AudioInfo>(DEFAULT_AUDIO_INFO);
export const audioLoadingAtom = atom<boolean>(false);

export const refreshAudioDevicesAtom = atom(null, async (_get, set) => {
  set(audioLoadingAtom, true);
  try {
    const info = await getAudioDevices();
    if (info) {
      set(audioInfoAtom, info);
    }
  } catch (err) {
    logger.warn("Failed to fetch audio devices", err);
  } finally {
    set(audioLoadingAtom, false);
  }
});

export const setDefaultAudioDeviceAtom = atom(null, async (get, set, id: number) => {
  const prev = get(audioInfoAtom);
  // Optimistic update
  const updatedSinks = prev.sinks.map((s) => ({
    ...s,
    is_default: s.id === id,
  }));
  const updatedSources = prev.sources.map((s) => ({
    ...s,
    is_default: s.id === id,
  }));

  const isSink = prev.sinks.some((s) => s.id === id);

  set(audioInfoAtom, {
    ...prev,
    sinks: updatedSinks,
    sources: updatedSources,
    default_sink_id: isSink ? id : prev.default_sink_id,
    default_source_id: !isSink ? id : prev.default_source_id,
  });

  try {
    await setDefaultAudioDevice(id);
    const refreshed = await getAudioDevices();
    if (refreshed) {
      set(audioInfoAtom, refreshed);
    }
  } catch (err) {
    logger.error("Failed to switch audio device", err);
  }
});

export const updateDeviceVolumeAtom = atom(
  null,
  async (get, set, { id, volume, muted }: { id: number; volume: number; muted: boolean }) => {
    const prev = get(audioInfoAtom);
    const updateList = (list: typeof prev.sinks): typeof prev.sinks =>
      list.map((item) => (item.id === id ? { ...item, volume, muted } : item));

    set(audioInfoAtom, {
      ...prev,
      sinks: updateList(prev.sinks),
      sources: updateList(prev.sources),
    });

    try {
      await setAudioDeviceVolume(id, volume, muted);
    } catch (err) {
      logger.warn("Failed to set audio volume", err);
    }
  },
);

export const testAudioAtom = atom(null, async () => {
  try {
    await testAudio();
  } catch (err) {
    logger.warn("Failed to trigger test sound", err);
  }
});
