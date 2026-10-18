// Reused from src/lib/sofia/central-knowledge.ts; no corpus included.
/** Server-side, read-only private sources. Never import into client components.
 * Paths come exclusively from an operator-owned manifest, never from the model.
 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
const unavailable = () => ({ status: 'unavailable', items: [] });
const inside = (root, file) => { const rel = relative(root, file); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };
class OversizedSourceError extends Error {
}
async function boundedRead(file, max) {
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
        const stat = await handle.stat();
        if (!stat.isFile())
            throw new Error('source_unavailable');
        if (stat.size > max)
            throw new OversizedSourceError();
        const bytes = Buffer.alloc(max + 1);
        let bytesRead = 0;
        while (bytesRead < bytes.length) {
            const chunk = await handle.read(bytes, bytesRead, bytes.length - bytesRead, bytesRead);
            if (!chunk.bytesRead)
                break;
            bytesRead += chunk.bytesRead;
        }
        if (bytesRead > max)
            throw new OversizedSourceError();
        return bytes.subarray(0, bytesRead).toString('utf8');
    }
    finally {
        await handle.close();
    }
}
export function createCentralKnowledgeReader(manifestPath = process.env.SOFIA_CENTRAL_SOURCES_MANIFEST) {
    return async (request) => {
        if (!request || !['catalog', 'search', 'read'].includes(request.action))
            return { status: 'invalid_request', items: [] };
        if (request.kind !== undefined && !['memory', 'skills', 'radar'].includes(request.kind))
            return { status: 'invalid_request', items: [] };
        const offset = request.offset ?? 0;
        const limit = request.limit ?? (request.action === 'read' ? 4000 : 20);
        if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > (request.action === 'read' ? 8000 : 50))
            return { status: 'invalid_request', items: [] };
        try {
            if (!manifestPath || !isAbsolute(manifestPath))
                return unavailable();
            const manifest = JSON.parse(await boundedRead(manifestPath, 32768));
            if (manifest.version !== 1 || !Array.isArray(manifest.sources) || manifest.sources.length > 16)
                return unavailable();
            let docs = [];
            const ids = new Set();
            let visited = 0;
            for (const source of manifest.sources) {
                if (!source || !/^[a-z0-9-]{1,64}$/.test(source.id) || ids.has(source.id) || !['memory', 'skills', 'radar'].includes(source.kind) || typeof source.root !== 'string' || !isAbsolute(source.root))
                    return unavailable();
                ids.add(source.id);
                const root = await realpath(source.root);
                const walk = async (dir, depth) => {
                    if (depth > 12)
                        throw new Error('source_limit');
                    for (const entry of await readdir(dir, { withFileTypes: true })) {
                        if (++visited > 10000)
                            throw new Error('source_limit');
                        if (entry.name.startsWith('.') || entry.isSymbolicLink())
                            continue;
                        const file = join(dir, entry.name);
                        if (entry.isDirectory())
                            await walk(file, depth + 1);
                        else if (entry.isFile() && entry.name.endsWith('.md')) {
                            const rel = relative(root, file);
                            docs.push({ reference: createHash('sha256').update(`${source.id}/${rel}`).digest('hex'), kind: source.kind, title: `${source.id}/${rel}`, file, root });
                            if (docs.length > 4096)
                                throw new Error('source_limit');
                        }
                    }
                };
                await walk(root, 0);
            }
            if (request.kind)
                docs = docs.filter(doc => doc.kind === request.kind);
            docs.sort((a, b) => a.title.localeCompare(b.title, 'en'));
            let oversized = 0;
            if (request.action === 'search') {
                if (typeof request.query !== 'string' || !request.query.trim() || request.query.length > 160)
                    return { status: 'invalid_request', items: [] };
                const normalize = (text) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
                const terms = normalize(request.query).split(/\s+/).filter(Boolean);
                const matches = [];
                let budget = 0;
                for (const doc of docs) {
                    if (!inside(doc.root, await realpath(doc.file)))
                        throw new Error('source_unavailable');
                    let text;
                    try {
                        text = await boundedRead(doc.file, 262144);
                    }
                    catch (error) {
                        if (!(error instanceof OversizedSourceError))
                            throw error;
                        oversized++;
                        continue;
                    }
                    budget += Buffer.byteLength(text);
                    if (budget > 33554432)
                        throw new Error('source_limit');
                    const haystack = normalize(`${doc.title} ${text}`);
                    if (terms.every(term => haystack.includes(term)))
                        matches.push(doc);
                }
                docs = matches;
            }
            if (request.action === 'read') {
                const doc = docs.find(doc => doc.reference === request.reference);
                if (!doc || !inside(doc.root, await realpath(doc.file)))
                    return unavailable();
                const text = await boundedRead(doc.file, 262144);
                return { status: 'ok', items: [], content: text.slice(offset, offset + limit), total: text.length, nextOffset: offset + limit < text.length ? offset + limit : null, digest: createHash('sha256').update(text).digest('hex') };
            }
            // Counts cover the filtered result, not just this page. References are not skills.
            const skillCount = docs.filter(doc => doc.kind === 'skills' && doc.title.endsWith('/SKILL.md')).length;
            // Pagination/count cover only successfully searched documents when partial.
            if (oversized)
                return { status: 'partial', skillCount, items: docs.slice(offset, offset + limit).map(({ reference, kind, title }) => ({ reference, kind, title })), matchedCount: docs.length, exclusions: { count: oversized, reasons: { oversized } }, nextOffset: offset + limit < docs.length ? offset + limit : null };
            return { status: 'ok', skillCount, items: docs.slice(offset, offset + limit).map(({ reference, kind, title }) => ({ reference, kind, title })), total: docs.length, nextOffset: offset + limit < docs.length ? offset + limit : null };
        }
        catch {
            return unavailable();
        }
    };
}
