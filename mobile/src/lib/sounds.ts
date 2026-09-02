import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_ENABLED_KEY = 'tmt_sounds_enabled';

export type SoundEffect = 'signal_new' | 'tp_hit' | 'sl_hit' | 'boom' | 'click' | 'refresh' | 'success' | 'error';

let soundsEnabled = true;
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const raw = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
  soundsEnabled = raw !== 'false';
  initialized = true;
}

export async function setSoundsEnabled(enabled: boolean): Promise<void> {
  soundsEnabled = enabled;
  await AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

export async function areSoundsEnabled(): Promise<boolean> {
  await ensureInitialized();
  return soundsEnabled;
}

// Sound effect players — one-shot, auto-cleanup
const activePlayers: Partial<Record<SoundEffect, ReturnType<typeof createAudioPlayer>>> = {};

async function cleanup(effect: SoundEffect) {
  const p = activePlayers[effect];
  if (p) {
    try { p.release(); } catch {}
    delete activePlayers[effect];
  }
}

async function playTone(effect: SoundEffect): Promise<void> {
  await ensureInitialized();
  if (!soundsEnabled) return;

  await cleanup(effect);

  try {
    await setAudioModeAsync({ playsInSilentMode: true });

    // Bundle actual sound files at: assets/sounds/{effect}.mp3
    // Then: const player = createAudioPlayer(require(`@/assets/sounds/${effect}.mp3`));
    // For now: silent no-op (no bundled audio files yet)
    return;

    // Example with bundled files:
    // const player = createAudioPlayer(require(`@/assets/sounds/${effect}.mp3`));
    // activePlayers[effect] = player;
    // player.play();
    // setTimeout(() => cleanup(effect), 2000);
  } catch {
    // Silent fail — sound is non-critical
  }
}

export async function playSound(effect: SoundEffect): Promise<void> {
  await playTone(effect);
}

export async function playSignalAlert(): Promise<void> { await playSound('signal_new'); }
export async function playTPHit(): Promise<void> { await playSound('tp_hit'); }
export async function playSLHit(): Promise<void> { await playSound('sl_hit'); }
export async function playBoom(): Promise<void> { await playSound('boom'); }
export async function playClick(): Promise<void> { await playSound('click'); }
export async function playSuccess(): Promise<void> { await playSound('success'); }
export async function playError(): Promise<void> { await playSound('error'); }
