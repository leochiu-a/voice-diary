import { createStart } from "@tanstack/react-start";
import { sessionMiddleware } from "@/lib/session-middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [sessionMiddleware],
}));
