import type { Env } from "../types";

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `ip:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function reserveGeneration(env: Env, ip: string): Promise<"ok" | "ip" | "global"> {
  const ipLimit = Number(env.DAILY_IP_LIMIT || 5), globalLimit = Number(env.DAILY_GLOBAL_LIMIT || 40);
  const ipHash = await hashIp(ip);
  const response = await fetch(new URL("/rest/v1/rpc/reserve_generation", env.SUPABASE_URL), {
    method: "POST",
    headers: { "apikey": env.SUPABASE_SECRET_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_ip_hash: ipHash, p_ip_limit: ipLimit, p_global_limit: globalLimit }),
  });
  if (!response.ok) throw new Error("Supabase quota check failed.");
  const result = await response.json() as string;
  if (result !== "ok" && result !== "ip" && result !== "global") throw new Error("Supabase returned an invalid quota response.");
  return result;
}
