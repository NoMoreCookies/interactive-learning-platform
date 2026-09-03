export function buildLegalAcceptanceId(
  userId: string,
  termsVersion: string,
  privacyVersion: string,
): string {
  return [
    "legal",
    encodeURIComponent(userId),
    encodeURIComponent(termsVersion),
    encodeURIComponent(privacyVersion),
  ].join("#");
}