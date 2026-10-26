// Records where a request's time goes, as Server-Timing entries: the session
// middleware sends them as a header (Safari's Web Inspector shows them under the
// document's Timing tab) and the page logs them, since a streamed page has
// sent its headers before its data arrives.

// Requests this instance has handled, to tell a cold start from a warm one.
let handled = 0;

export function createTimings() {
  const entries: string[] = [
    // On a cold start, boot is how long the process ran before this request
    // reached our code: starting Node and loading the app.
    handled++ === 0
      ? `instance;desc="cold", boot;dur=${(process.uptime() * 1000).toFixed(1)}`
      : 'instance;desc="warm"',
  ];
  const add = (name: string, start: number, desc?: string) => {
    const dur = (performance.now() - start).toFixed(1);
    entries.push(desc ? `${name};desc="${desc}";dur=${dur}` : `${name};dur=${dur}`);
  };

  return {
    async measure<T>(name: string, run: () => Promise<T>): Promise<T> {
      const start = performance.now();
      try {
        return await run();
      } finally {
        add(name, start);
      }
    },
    // Passed to the Supabase client, so each call it makes (a token refresh,
    // the signing keys, a query) shows up by its method and path.
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = performance.now();
      try {
        return await fetch(input, init);
      } finally {
        const url = new URL(input instanceof Request ? input.url : input);
        const method = init?.method ?? (input instanceof Request ? input.method : "GET");
        add("supabase", start, `${method} ${url.pathname}`);
      }
    }) as typeof fetch,
    toString() {
      return entries.join(", ");
    },
  };
}
