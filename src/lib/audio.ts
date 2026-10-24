// Shared by the recorder (client) and the upload actions (server).

// OpenAI's transcription endpoint rejects files above 25 MB.
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
export const MAX_RECORDING_MS = 20 * 60 * 1000;

// AAC in MP4 first: Safari and Chrome both record it and every browser plays
// it, with a known duration. Safari can record WebM too, but plays the files it
// makes, and Chrome's, in silence. Firefox records only WebM or Ogg.
export const RECORDING_MIME_TYPES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/webm",
  "audio/ogg",
] as const;

export function audioExtension(mimeType: string) {
  const base = mimeType.split(";")[0].trim();
  switch (base) {
    case "audio/webm":
      return "webm";
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    default:
      return null;
  }
}
