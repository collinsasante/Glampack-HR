export function makeFakeToken(payload: { uid: string; email: string; email_verified?: boolean }): string {
  const claims = { email_verified: true, ...payload };
  return Buffer.from(JSON.stringify(claims)).toString("base64url");
}
