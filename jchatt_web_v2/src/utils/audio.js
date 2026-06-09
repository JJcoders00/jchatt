import { Haptics, ImpactStyle } from '@capacitor/haptics';

const popAudio = new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
let ringAudio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
ringAudio.loop = true;

// Preload the audio files
popAudio.load();
ringAudio.load();

let unlocked = false;

export const initAudioContext = () => {
  if (unlocked) return;
  // A dummy play-pause sequence triggered by user gesture
  // unlocks the audio element for future programmatic plays.
  popAudio.play().then(() => popAudio.pause()).catch(() => {});
  ringAudio.play().then(() => ringAudio.pause()).catch(() => {});
  unlocked = true;
};

export const playPopSound = () => {
  popAudio.currentTime = 0;
  popAudio.play().catch(e => console.log('Audio blocked by browser policy', e));
};

let hapticsInterval = null;

export const startRinging = () => {
  ringAudio.currentTime = 0;
  // Set volume to max to ensure it's loud enough
  ringAudio.volume = 1.0;
  ringAudio.play().catch(e => {
    console.log('Audio blocked by browser policy. Ensure user has interacted with the page.', e);
  });
};

export const stopRinging = () => {
  ringAudio.pause();
  ringAudio.currentTime = 0;
};
