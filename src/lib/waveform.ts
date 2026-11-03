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

// The waveform saved with a recording (see 0006_recording_waveform.sql), from
// its samples. Three decimals are plenty for a bar's height.
export function waveform(samples: ArrayLike<number>) {
  return peaks(samples, WAVEFORM_PEAKS).map((height) => Math.round(height * 1000) / 1000);
}

// Worked out once, by the browser that made the recording. A low sample rate is
// plenty for bars. Empty if the browser can't decode its own recording, which
// the player draws flat.
export async function recordingWaveform(audio: Blob) {
  try {
    const decoder = new OfflineAudioContext(1, 1, 8000);
    const decoded = await decoder.decodeAudioData(await audio.arrayBuffer());
    return waveform(decoded.getChannelData(0));
  } catch {
    return [];
  }
}

export function isWaveform(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length <= WAVEFORM_PEAKS &&
    value.every((height) => typeof height === "number" && height >= 0 && height <= 1)
  );
}
