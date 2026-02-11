export type ShareArtifact = {
  title?: string;
  text: string;
  createdAt?: string;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const base64 = btoa(binary);
  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecodeToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeShareArtifact(artifact: ShareArtifact): string {
  const payload = JSON.stringify(artifact);
  return base64UrlEncode(new TextEncoder().encode(payload));
}

export function decodeShareArtifact(value: string): ShareArtifact | null {
  try {
    const bytes = base64UrlDecodeToBytes(value);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const maybe = parsed as Partial<ShareArtifact>;
    if (typeof maybe.text !== "string") return null;
    return {
      title: typeof maybe.title === "string" ? maybe.title : undefined,
      text: maybe.text,
      createdAt: typeof maybe.createdAt === "string" ? maybe.createdAt : undefined,
    };
  } catch {
    return null;
  }
}

