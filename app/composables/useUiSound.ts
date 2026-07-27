import { play, type SoundName } from "cuelume";

export function useUiSound() {
  function playUiSound(sound: SoundName) {
    if (!import.meta.client) return;
    try {
      play(sound);
    } catch {
      // Sound feedback must never block the interaction it accompanies.
    }
  }

  return { playUiSound };
}
