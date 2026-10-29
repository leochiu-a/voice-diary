// A voice note still playing would be recorded too, and on iOS playback
// holds the audio session the microphone needs, so recording stops it first.
export function pausePlayback() {
  document.querySelectorAll("audio").forEach((audio) => audio.pause());
}

export function releaseMicrophone(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

// Made inside the press, so iOS lets it run: started later, it stays suspended.
export function openAudioContext() {
  if (typeof AudioContext === "undefined") return null;
  const audio = new AudioContext();
  void audio.resume();
  return audio;
}

export function listen(audio: AudioContext | null, stream: MediaStream) {
  if (!audio) return null;
  const analyser = audio.createAnalyser();
  analyser.fftSize = 1024;
  audio.createMediaStreamSource(stream).connect(analyser);
  return analyser;
}

// How loud the last moment was, 0 to 1, from the samples' root mean square.
// Speech rarely goes past 0.25 RMS, so that is scaled up to fill the height.
export function loudness(analyser: AnalyserNode, samples: Float32Array<ArrayBuffer>) {
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

// iOS sometimes never answers a request for a microphone it already allowed,
// most often in the home-screen app. Waiting on it would leave the button dead
// until a reload, so give up and let the next press ask again. The first
// request waits without a limit, since the user may be reading the permission
// prompt.
const OPEN_TIMEOUT_MS = 5000;

export class MicrophoneTimeout extends Error {}

export async function openMicrophone() {
  const permission = await navigator.permissions
    ?.query({ name: "microphone" as PermissionName })
    .then(
      (status) => status.state,
      () => undefined,
    );
  const request = navigator.mediaDevices.getUserMedia({ audio: true });
  if (permission !== "granted") return request;
  return new Promise<MediaStream>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new MicrophoneTimeout());
      // Answered after all: close it, since nothing is recording anymore.
      request.then(releaseMicrophone, () => {});
    }, OPEN_TIMEOUT_MS);
    request.then(
      (stream) => {
        clearTimeout(timer);
        resolve(stream);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
