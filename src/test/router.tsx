import { type ComponentProps, useSyncExternalStore } from "react";

// A stand-in for @tanstack/react-router in component tests, backed by
// jsdom's URL: navigating changes window.location and notifies readers, the
// way the router does. Tests load it with
// vi.mock("@tanstack/react-router", () => import("@/test/router")).

type To = { to?: string; params?: Record<string, string>; search?: Record<string, string> };

// The entry a test is on; set it before rendering.
export const route = { params: {} as Record<string, string> };

function href({ to = "/", params = {}, search = {} }: To) {
  const path = to.replace(/\$(\w+)/g, (_, name: string) => params[name]);
  const query = new URLSearchParams(search).toString();
  return query ? `${path}?${query}` : path;
}

function navigate(options: To & { replace?: boolean }) {
  window.history[options.replace ? "replaceState" : "pushState"](null, "", href(options));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function useUrl() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("popstate", notify);
      return () => window.removeEventListener("popstate", notify);
    },
    () => window.location.href,
  );
}

export function useSearch() {
  const url = new URL(useUrl());
  return Object.fromEntries(url.searchParams);
}

export function useLocation<T>({ select }: { select: (location: { pathname: string }) => T }) {
  return select({ pathname: new URL(useUrl()).pathname });
}

export function useParams() {
  return route.params;
}

export function useNavigate() {
  return async (options: To & { replace?: boolean }) => navigate(options);
}

export function Link({ to, params, search, onClick, ...props }: ComponentProps<"a"> & To) {
  const target = { to, params, search };
  return (
    // oxlint-disable-next-line jsx-a11y/anchor-has-content -- the children come in props
    <a
      href={href(target)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(target);
      }}
      {...props}
    />
  );
}
