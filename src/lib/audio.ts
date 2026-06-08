/**
 * Utility for playing notification sounds
 */

const playSynthBeep = (frequency: number, duration: number, volume: number = 0.15) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    // Smooth rapid decay
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
    return true;
  } catch (err) {
    console.warn("Web Audio synth failed:", err);
    return false;
  }
};

// Clean, distinct notification sound (First version / Sharp)
const SUCCESS_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
// A sharp warning sound for errors
const WARNING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3';

export type SoundType = 'success' | 'warning' | 'delete';

export const playNotificationSound = (type: SoundType = 'success') => {
  // For 'delete', we always use a clean, precise synth beep (bip rápido)
  if (type === 'delete') {
    playSynthBeep(880, 0.08, 0.12);
    return;
  }

  try {
    let url = SUCCESS_SOUND_URL;
    if (type === 'warning') url = WARNING_SOUND_URL;
    
    const audio = new Audio(url);
    audio.volume = type === 'success' ? 0.4 : 0.5;
    audio.play().catch(err => {
      console.warn("Sound play blocked or failed. Playing custom synthesized beep fallback", err);
      if (type === 'success') {
        playSynthBeep(880, 0.1, 0.08);
      } else if (type === 'warning') {
        playSynthBeep(440, 0.15, 0.12);
      }
    });
  } catch (error) {
    console.error("Audio playback error:", error);
    // Safe synthesized fallback
    if (type === 'success') playSynthBeep(880, 0.1, 0.08);
    else if (type === 'warning') playSynthBeep(440, 0.15, 0.12);
  }
};
