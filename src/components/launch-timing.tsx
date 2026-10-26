import { useEffect } from "react";
import { onFCP, onLCP, onTTFB } from "web-vitals";

// Groups this page load's reports in the logs; the module runs once per load.
const load = Math.random().toString(36).slice(2, 8);

// Sends how a page load went, as the phone saw it, to the server logs: when
// the first byte arrived, the first paint (which ends the launch image on the
// home screen), the largest paint, and when React finished hydrating. Each is
// tagged with whether the page was opened from the home screen, which the
// server can't tell from the request.
function send(name: string, value: number) {
  const mode = matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser";
  navigator.sendBeacon("/timing", JSON.stringify({ name, value, mode, load }));
}

// Each metric is reported once, for the page load; moving between pages
// afterwards isn't measured.
export function LaunchTiming() {
  useEffect(() => {
    send("hydrated", performance.now());
    for (const onMetric of [onTTFB, onFCP, onLCP]) {
      onMetric((metric) => send(metric.name, metric.value));
    }
  }, []);
  return null;
}
