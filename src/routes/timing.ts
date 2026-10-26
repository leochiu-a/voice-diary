import { createFileRoute } from "@tanstack/react-router";

// Receives LaunchTiming's reports and writes them to the logs, next to the
// server's own [timing] lines. Only known names and plain values are logged.
const NAMES = new Set(["TTFB", "FCP", "LCP", "hydrated"]);
const MODES = new Set(["standalone", "browser"]);

export const Route = createFileRoute("/timing")({
  server: { handlers: { POST: ({ request }) => log(request) } },
});

async function log(request: Request) {
  const { name, value, mode, load } = await request.json();
  if (
    NAMES.has(name) &&
    MODES.has(mode) &&
    Number.isFinite(value) &&
    typeof load === "string" &&
    /^[a-z0-9]{1,8}$/.test(load)
  ) {
    console.info(`[timing] client load=${load} mode=${mode} ${name}=${Math.round(value)}ms`);
  }
  return new Response(null, { status: 204 });
}
