import { QueryClient } from "@tanstack/react-query";
import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // One query cache per browser session, and per request on the server, so
  // users' data never mix: the pages' data, entry text and search results.
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Hovering or touching a link starts loading its page.
    defaultPreload: "intent",
    // Queries hold the data, so the router keeps none of its own.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // Search params stay plain strings ("/?tag=2024&day=2026-10-23"), as the
    // list's filters expect, instead of the router's default JSON values.
    parseSearch: parseSearchWith((value) => value),
    stringifySearch: stringifySearchWith(String),
  });
  // Streams queries fetched while rendering on the server to the browser.
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
