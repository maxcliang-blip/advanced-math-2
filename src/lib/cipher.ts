// AES-256-CBC encryption using Web Crypto API
// Key is derived from a SHA-256 hash of the secret string
// Output format: base64(IV[16 bytes] || ciphertext)

const SECRET = "tc_AES256_s3cr3t_k3y_tabcl0ak_v3!";

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const enc = new TextEncoder();
  const rawKey = await crypto.subtle.digest("SHA-256", enc.encode(SECRET));
  cachedKey = await crypto.subtle.importKey(
    "raw", rawKey, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]
  );
  return cachedKey;
}

export async function encryptUrl(url: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoded = new TextEncoder().encode(url);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, encoded);

  // Combine IV + ciphertext into a single base64 string
  const combined = new Uint8Array(16 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 16);

  // base64 encode
  let binary = "";
  combined.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export async function decryptUrl(encrypted: string): Promise<string> {
  const key = await getKey();
  const binary = atob(encrypted);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const iv = bytes.slice(0, 16);
  const ciphertext = bytes.slice(16);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
