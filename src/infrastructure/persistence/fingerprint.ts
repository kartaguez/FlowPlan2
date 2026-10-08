export async function sha256(text: string): Promise<string> {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
