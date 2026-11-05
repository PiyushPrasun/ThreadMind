import { Hono } from "hono";
import type { Env } from "../types.js";

export const health = new Hono<{ Bindings: Env }>();
health.get("/api/health", c => c.json({ ok: true, service: "commentdigest" }));
