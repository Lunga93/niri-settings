import { atom } from "jotai";
import { CAPABILITIES_FALLBACK, type Capabilities } from "@/lib/schemas";
import { getCapabilities } from "@/lib/services/system";

// Host capability probe result; all-false until first load. Pages use this
// to hide or annotate integrations the current machine does not have.
export const capabilitiesAtom = atom<Capabilities>(CAPABILITIES_FALLBACK);

export const loadCapabilitiesAtom = atom(null, async (_get, set) => {
  set(capabilitiesAtom, await getCapabilities());
});
