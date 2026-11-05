import { Hono } from "hono";
import type { Env } from "./types.js";
import { health } from "./routes/health.js";
import { digestRoute } from "./routes/digest.js";
import { pageRoute } from "./routes/page.js";
import { homeHtml } from "./templates/home.js";

const app = new Hono<{ Bindings: Env }>();
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
});
app.get("/", c => c.html(homeHtml()));
app.route("/", health);
app.route("/", digestRoute);
app.route("/", pageRoute);
app.notFound(c => c.json({ error: "Not found" }, 404));
app.onError((error, c) => { console.error("Request failed", error.message); return c.json({ error: "Something went wrong. Please try again." }, 500); });

export default app;
