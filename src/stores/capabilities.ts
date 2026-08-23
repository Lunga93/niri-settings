import { atom } from "jotai";
import { CAPABILITIES_FALLBACK, type Capabilities, type NetworkStatus } from "@/lib/schemas";
import { getCapabilities, getNetworkStatus } from "@/lib/services/system";

// Host capability probe result; all-false until first load. Pages use this
// to hide or annotate integrations the current machine does not have.
export const capabilitiesAtom = atom<Capabilities>(CAPABILITIES_FALLBACK);

export const loadCapabilitiesAtom = atom(null, async (_get, set) => {
  set(capabilitiesAtom, await getCapabilities());
});

// Live network snapshot (nmcli/ip); null until first load or on failure.
const networkStatusFallback: NetworkStatus = {
  nm_available: false,
  interfaces: [],
};
export const networkStatusAtom = atom<NetworkStatus>(networkStatusFallback);

export const loadNetworkStatusAtom = atom(null, async (_get, set) => {
  const status = await getNetworkStatus();
  if (status) set(networkStatusAtom, status);
});
