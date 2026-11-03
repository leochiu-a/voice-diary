import { expect, test } from "vitest";
import { isWaveform, peaks, waveform, WAVEFORM_PEAKS } from "./waveform";

test("each bar is its stretch's loudest sample, scaled to the loudest bar", () => {
  const samples = Float32Array.from([0.125, -0.25, 0, 0, 0.0625, -0.5, 0.375, 0.125]);
  expect(peaks(samples, 4)).toEqual([0.5, 0, 1, 0.75]);
});

test("silence stays flat", () => {
  expect(peaks(new Float32Array(8), 4)).toEqual([0, 0, 0, 0]);
});

test("a saved waveform has a fixed number of peaks, rounded to three decimals", () => {
  const samples = Float32Array.from({ length: WAVEFORM_PEAKS * 2 }, (_, i) => (i % 3) / 3);
  const saved = waveform(samples);
  expect(saved).toHaveLength(WAVEFORM_PEAKS);
  expect(saved.every((height) => Math.round(height * 1000) / 1000 === height)).toBe(true);
  expect(isWaveform(saved)).toBe(true);
});

test("only heights between 0 and 1, no more of them than saved, pass as a waveform", () => {
  expect(isWaveform([])).toBe(true);
  expect(isWaveform([0, 0.5, 1])).toBe(true);
  expect(isWaveform([1.5])).toBe(false);
  expect(isWaveform(["1"])).toBe(false);
  expect(isWaveform(Array.from({ length: WAVEFORM_PEAKS + 1 }, () => 0))).toBe(false);
});
