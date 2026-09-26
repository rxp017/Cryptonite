declare module "node-forge" {
  type ParsedCertificate = {
    signatureOid: string;
    validity: { notAfter: Date };
    publicKey: { n?: { bitLength(): number } };
  };
  const forge: {
    pki: {
      certificateFromPem(pem: string): ParsedCertificate;
      oids: Record<string, string>;
    };
  };
  export default forge;
}
