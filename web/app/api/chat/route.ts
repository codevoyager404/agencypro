const BACKEND_URL = process.env.AGENT_BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(req: Request): Promise<Response> {
  const payload = await req.json();

  if (!payload.callbackUrl) {
    const origin = req.headers.get("origin");
    if (origin) {
      payload.callbackUrl = `${origin}/auth/callback`;
    }
  }

  const upstream = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!upstream.body) {
    return new Response("Missing backend stream body", { status: 502 });
  }

  const headers = new Headers(upstream.headers);
  headers.set("x-vercel-ai-ui-message-stream", "v1");
  headers.set("cache-control", "no-cache");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
