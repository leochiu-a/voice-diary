import { queryOptions } from "@tanstack/react-query";

// Bars in a voice note's waveform.
export const WAVEFORM_BARS = 96;

// Each bar is the loudest sample in its stretch of the recording, scaled so the
// loudest bar fills the height. Silence stays 0.
export function peaks(samples: Float32Array, bars = WAVEFORM_BARS) {
  const size = samples.length / bars;
  const heights = Array.from({ length: bars }, (_, bar) => {
    let peak = 0;
    for (let i = Math.floor(bar * size); i < Math.floor((bar + 1) * size); i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return peak;
  });
  const loudest = Math.max(...heights);
  return loudest > 0 ? heights.map((height) => height / loudest) : heights;
}

// The audio is fetched and decoded in the browser, like wavesurfer.js does; the
// bucket's CORS policy allows the GET. A low sample rate is plenty for bars.
async function loadPeaks(src: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Couldn't load the audio (${response.status})`);
  const decoder = new OfflineAudioContext(1, 1, 8000);
  const audio = await decoder.decodeAudioData(await response.arrayBuffer());
  return peaks(audio.getChannelData(0));
}

// Keyed by recording, not URL: a saved note's playback URL is signed afresh on
// every page load, and its audio never changes.
export function waveformQuery(recordingId: string, src: string) {
  return queryOptions({
    queryKey: ["waveform", recordingId],
    queryFn: () => loadPeaks(src),
    staleTime: Infinity,
    retry: false,
  });
}
