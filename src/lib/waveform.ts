import { queryOptions } from "@tanstack/react-query";

// Peaks decoded per recording. The player folds them into as many bars as its
// width fits, so this caps how dense a waveform can get.
export const WAVEFORM_PEAKS = 512;

// Each bar is the loudest sample in its stretch of the recording, scaled so the
// loudest bar fills the height. Silence stays 0.
export function peaks(samples: ArrayLike<number>, bars: number) {
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

// The audio is fetched and decoded in the browser, like wavesurfer.js does. A
// low sample rate is plenty for bars. The fetch skips the HTTP cache: the
// player's <audio> is loading the same URL in ranges at the same time, and
// sharing its cache entry held the fetch back by seconds.
async function loadPeaks(src: string) {
  const response = await fetch(src, { cache: "no-store" });
  if (!response.ok) throw new Error(`Couldn't load the audio (${response.status})`);
  const decoder = new OfflineAudioContext(1, 1, 8000);
  const audio = await decoder.decodeAudioData(await response.arrayBuffer());
  return peaks(audio.getChannelData(0), WAVEFORM_PEAKS);
}

// Keyed by recording, not URL: a note just recorded plays from its local audio
// before it plays from the server, and its audio never changes.
export function waveformQuery(recordingId: string, src: string) {
  return queryOptions({
    queryKey: ["waveform", recordingId],
    queryFn: () => loadPeaks(src),
    staleTime: Infinity,
    retry: false,
  });
}
