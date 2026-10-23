// Shared by the recorder (client) and the upload actions (server).

// OpenAI's transcription endpoint rejects files above 25 MB.
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
export const MAX_RECORDING_MS = 20 * 60 * 1000;

// Browsers differ: Chrome/Firefox record WebM or Ogg, Safari records MP4.
export const RECORDING_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"] as const;

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
