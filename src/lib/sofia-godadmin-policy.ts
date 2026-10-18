const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** This is a second, explicit policy alongside the existing Hub-member contract.
 * The caller must have authenticated with the dedicated Central-to-RRD transport
 * credential before trustedGodAdmin is set; the JSON envelope alone is NOT proof. */
export function authorizeRrdCentralEnvelope(raw: unknown, policy: { expectedHubId: string | undefined; trustedGodAdmin: boolean }): boolean {
  const expected = policy.expectedHubId
  if (!policy.trustedGodAdmin || !expected || !UUID.test(expected) || !raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const body = raw as Record<string, unknown>
  return body.centralRole === 'god_admin'
    && body.centralHubId === expected
    && typeof body.centralGrantId === 'string' && UUID.test(body.centralGrantId)
    && typeof body.senderPhone === 'string' && /^\+[1-9]\d{7,14}$/.test(body.senderPhone)
    // Action-specific fields and supported operations are validated by the parsers.
    && typeof body.action === 'string' && body.action.length > 0
    && !Object.hasOwn(body, 'centralContactId') && !Object.hasOwn(body, 'centralClientId')
}
