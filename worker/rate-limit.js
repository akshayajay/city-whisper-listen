// Cloudflare overwrites CF-Connecting-IP. Never use user-supplied forwarding headers.
// The Node adapter supplies the socket address instead. Store only rotating hashes.
export async function allowReport(request, env) {
  const ip = env.CLIENT_IP || request.headers.get("CF-Connecting-IP");
  if (!ip) return true; // Direct in-process tests have no network client.
  const window = Math.floor(Date.now() / 600000);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${window}:${ip}`),
  );
  const key = Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.batch([
    env.DB.prepare("DELETE FROM intake_limits WHERE expires_at < ?").bind(now),
    env.DB.prepare(
      "INSERT INTO intake_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count",
    ).bind(key, (window + 1) * 600),
  ]);
  return result[1].results[0].count <= 10;
}
