import { expect, test } from "vitest";
import { peaks } from "./waveform";

test("each bar is its stretch's loudest sample, scaled to the loudest bar", () => {
  const samples = Float32Array.from([0.125, -0.25, 0, 0, 0.0625, -0.5, 0.375, 0.125]);
  expect(peaks(samples, 4)).toEqual([0.5, 0, 1, 0.75]);
});

test("silence stays flat", () => {
  expect(peaks(new Float32Array(8), 4)).toEqual([0, 0, 0, 0]);
});
