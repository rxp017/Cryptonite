export const ESTATE_NAME = "Seeded Crypto Estate";
export const ESTATE_NOTE = "Source, manifests, and PEM certificates from demo/seeded-estate/ are bundled into the app.";

// Presence proves a direct dependency, never algorithm use.
export const KNOWN_CRYPTO_PACKAGES: Record<string, { concern: string }> = {
  "node-forge": { concern: "Cryptography and PKI APIs; inspect caller algorithms." },
  selfsigned: { concern: "Certificate generator; inspect generated certificate fields." },
  pycryptodome: { concern: "Cipher APIs; inspect the selected algorithm and mode." },
  bcrypt: { concern: "Password hashing package; inventory only." },
};
