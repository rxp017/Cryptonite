import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { ml_kem768_x25519 } from "@noble/post-quantum/hybrid.js";
import { equalBytes } from "@noble/post-quantum/utils.js";

export type SuiteId = "classical" | "post-quantum" | "hybrid";
export type ProviderInfo = {
  id: SuiteId;
  label: string;
  establishment: string;
  signature: string;
  cipher: string;
  implementation: string;
  notes: string[];
};
export const PROVIDERS: ProviderInfo[] = [
  {
    id: "classical", label: "Classical", establishment: "ECDH P-256",
    signature: "ECDSA P-256 / SHA-256", cipher: "AES-256-GCM",
    implementation: "Browser Web Crypto",
    notes: ["ECDH, AES-GCM, and ECDSA execute through Web Crypto.", "P-256 is quantum-vulnerable."],
  },
  {
    id: "post-quantum", label: "Post-Quantum", establishment: "ML-KEM-768 (FIPS 203)",
    signature: "ML-DSA-65 (FIPS 204)", cipher: "AES-256-GCM",
    implementation: "@noble/post-quantum 0.7.1 + Web Crypto AEAD",
    notes: ["ML-KEM and ML-DSA execute in the installed noble JS library.", "AES-GCM remains the symmetric cipher."],
  },
  {
    id: "hybrid", label: "Hybrid (X-Wing)", establishment: "X-Wing: ML-KEM-768 + X25519",
    signature: "ECDSA P-256 and ML-DSA-65, separately", cipher: "AES-256-GCM",
    implementation: "@noble/post-quantum ml_kem768_x25519 + Web Crypto AEAD",
    notes: [
      "The installed library implements X-Wing as ml_kem768_x25519; no custom combiner is used.",
      "The two signatures are independent demonstrations, not a certified composite signature.",
      "Peers must support the same X-Wing wire profile and PQ signature format.",
    ],
  },
];

type Establishment = {
  senderSecret: Uint8Array;
  receiverSecret: Uint8Array;
  publicKeyBytes: number;
  exchangeBytes: number;
  exchangeLabel: string;
};
type SignatureCheck = { publicKeyBytes: number; verified: boolean };
interface CryptoProvider {
  establish(): Promise<Establishment>;
  signAndVerify(message: Uint8Array): Promise<SignatureCheck[]>;
}

async function ecdhPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
}
async function ecdsaSignAndVerify(message: Uint8Array): Promise<SignatureCheck> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const input = Uint8Array.from(message);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, input);
  const verified = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, signature, input);
  const publicKeyBytes = (await crypto.subtle.exportKey("raw", pair.publicKey)).byteLength;
  return { publicKeyBytes, verified };
}
async function mldsaSignAndVerify(message: Uint8Array): Promise<SignatureCheck> {
  const pair = ml_dsa65.keygen();
  const signature = ml_dsa65.sign(message, pair.secretKey);
  return { publicKeyBytes: pair.publicKey.length, verified: ml_dsa65.verify(signature, message, pair.publicKey) };
}

const classicalProvider: CryptoProvider = {
  async establish() {
    const alice = await ecdhPair();
    const bob = await ecdhPair();
    const senderSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: bob.publicKey }, alice.privateKey, 256));
    const receiverSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: alice.publicKey }, bob.privateKey, 256));
    const publicKeyBytes = (await crypto.subtle.exportKey("raw", bob.publicKey)).byteLength;
    return { senderSecret, receiverSecret, publicKeyBytes, exchangeBytes: publicKeyBytes, exchangeLabel: "ECDH public exchange" };
  },
  async signAndVerify(message) { return [await ecdsaSignAndVerify(message)]; },
};
const postQuantumProvider: CryptoProvider = {
  async establish() {
    const pair = ml_kem768.keygen();
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(pair.publicKey);
    const recovered = ml_kem768.decapsulate(cipherText, pair.secretKey);
    return { senderSecret: sharedSecret, receiverSecret: recovered, publicKeyBytes: pair.publicKey.length,
      exchangeBytes: cipherText.length, exchangeLabel: "ML-KEM ciphertext" };
  },
  async signAndVerify(message) { return [await mldsaSignAndVerify(message)]; },
};
const hybridProvider: CryptoProvider = {
  async establish() {
    const pair = ml_kem768_x25519.keygen();
    const { cipherText, sharedSecret } = ml_kem768_x25519.encapsulate(pair.publicKey);
    const recovered = ml_kem768_x25519.decapsulate(cipherText, pair.secretKey);
    return { senderSecret: sharedSecret, receiverSecret: recovered, publicKeyBytes: pair.publicKey.length,
      exchangeBytes: cipherText.length, exchangeLabel: "X-Wing ciphertext" };
  },
  async signAndVerify(message) { return [await ecdsaSignAndVerify(message), await mldsaSignAndVerify(message)]; },
};
const IMPLEMENTATIONS: Record<SuiteId, CryptoProvider> = {
  classical: classicalProvider, "post-quantum": postQuantumProvider, hybrid: hybridProvider,
};

export type RunLog = {
  suite: SuiteId;
  establishment: string;
  signature: string;
  cipher: string;
  sizes: { label: string; bytes: number }[];
  decapsulationMatched: boolean;
  encryptionRoundTrip: boolean;
  signatureVerified: boolean;
};

export async function runProvider(suite: SuiteId, message: string): Promise<RunLog> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable for AES-GCM and classical operations.");
  const info = PROVIDERS.find((item) => item.id === suite);
  if (!info) throw new Error("Unknown provider mode");
  const provider = IMPLEMENTATIONS[suite];
  const encoded = new TextEncoder().encode(message);
  const session = await provider.establish();
  const decapsulationMatched = equalBytes(session.senderSecret, session.receiverSecret);
  if (!decapsulationMatched) throw new Error("Key establishment failed: derived secrets differ.");

  const senderKey = await crypto.subtle.importKey("raw", Uint8Array.from(session.senderSecret), "AES-GCM", false, ["encrypt"]);
  const receiverKey = await crypto.subtle.importKey("raw", Uint8Array.from(session.receiverSecret), "AES-GCM", false, ["decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, senderKey, encoded);
  const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, receiverKey, ciphertext));
  const encryptionRoundTrip = equalBytes(encoded, decrypted);
  if (!encryptionRoundTrip) throw new Error("AES-GCM round trip failed.");

  const signatures = await provider.signAndVerify(encoded);
  const signatureVerified = signatures.every((result) => result.verified);
  if (!signatureVerified) throw new Error("Signature verification failed.");

  return {
    suite, establishment: info.establishment, signature: info.signature, cipher: info.cipher,
    sizes: [
      { label: "Establishment public key", bytes: session.publicKeyBytes },
      { label: session.exchangeLabel, bytes: session.exchangeBytes },
      ...signatures.map((result, index) => ({ label: signatures.length === 1 ? "Signing public key" : `${index === 0 ? "ECDSA" : "ML-DSA"} public key`, bytes: result.publicKeyBytes })),
      { label: "AES-GCM ciphertext", bytes: ciphertext.byteLength },
    ],
    decapsulationMatched, encryptionRoundTrip, signatureVerified,
  };
}
