import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import { AudioInfoSchema, type AudioInfo } from "../schemas";

export const getAudioDevices = async (): Promise<AudioInfo | null> => {
  sidecarLogger.info("Getting audio devices from sidecar");
  try {
    const raw = await invokeRaw("get_audio_devices");
    const result = AudioInfoSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    sidecarLogger.warn("get_audio_devices returned unexpected shape", raw);
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to get audio devices", err);
    return null;
  }
};

export const setDefaultAudioDevice = async (id: number): Promise<boolean> => {
  sidecarLogger.info(`Setting default audio device to ID ${id}`);
  try {
    await invokeRaw("set_audio_device", { id });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to set default audio device", err);
    return false;
  }
};

export const setAudioDeviceVolume = async (
  id: number,
  volume: number,
  muted: boolean,
): Promise<boolean> => {
  try {
    await invokeRaw("set_audio_volume", { id, volume, muted });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to set audio volume", err);
    return false;
  }
};

export const testAudio = async (): Promise<boolean> => {
  try {
    await invokeRaw("test_audio");
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to test audio", err);
    return false;
  }
};
