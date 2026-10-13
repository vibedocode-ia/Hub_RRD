import assert from 'node:assert/strict'
import { db, conn } from '../src/db'
import { convertApprovedLead } from '../src/lib/lead-conversion'
async function main() {
 const [leadId, proposalId, actorUserId] = process.argv.slice(2)
 if (!process.env.DATABASE_URL?.includes('@127.0.0.1:55439/rrd_disposable')) throw new Error('Disposable database required')
 try { await assert.rejects(db.transaction(tx => convertApprovedLead(tx, {leadId,proposalId,actorUserId})), /TEST_LEAD_OPERATION_BLOCKED/); console.log('PASS conversion guard') } finally { await conn?.end() }
}
main().catch(() => { console.error('Conversion guard failed'); process.exitCode=1 })
