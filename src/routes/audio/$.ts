import { createFileRoute } from "@tanstack/react-router";
import { MAX_RECORDING_BYTES } from "@/lib/audio";
import { requireUser } from "@/lib/auth";
import { putObject, serveObject } from "@/lib/r2";

// A voice note's audio, played from and uploaded to here (see recordingUrl).
// Every key starts with its owner's id, so each account reaches only its own.
export const Route = createFileRoute("/audio/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = await ownKey(params._splat);
        if (!key) return new Response(null, { status: 404 });
        return serveObject(key, request);
      },

      // The recorder sends each recording, and each part it transcribes while
      // recording, under the key createRecordingUpload gave it.
      PUT: async ({ request, params }) => {
        const key = await ownKey(params._splat);
        const size = Number(request.headers.get("Content-Length"));
        const contentType = request.headers.get("Content-Type");
        if (!key || !request.body || !contentType) return new Response(null, { status: 400 });
        if (!(size > 0 && size <= MAX_RECORDING_BYTES)) {
          return new Response(null, { status: 413 });
        }
        await putObject(key, request.body, contentType);
        return new Response(null, { status: 204 });
      },
    },
  },
});

async function ownKey(path: string | undefined) {
  const { userId } = await requireUser();
  return path?.startsWith(`${userId}/`) && !path.includes("..") ? path : null;
}
