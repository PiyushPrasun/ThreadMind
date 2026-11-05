import { Hono } from "hono";
import type { Env } from "../types";

export const health = new Hono<{ Bindings: Env }>();
health.get("/api/health", c => c.json({ ok: true, service: "commentdigest" }));
