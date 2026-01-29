import { getStore } from "@netlify/blobs";

const STORE_NAME = "timeoff";
const KEY = "entries_2026_v1";

export default async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.entries)) {
      return json(400, { error: "Body inválido. Se esperaba { entries: [] }" });
    }

    const expectedRevision = body.expectedRevision || null;

    const store = getStore(STORE_NAME);

    // Basic optimistic concurrency (best-effort):
    // - Read current metadata
    const current = await store.getWithMetadata(KEY, { type: "json" });
    const currentRevision = current?.metadata?.etag || current?.metadata?.version || current?.metadata?.last_modified || null;

    if (expectedRevision && currentRevision && expectedRevision !== currentRevision) {
      return json(409, { error: "Conflict: revision mismatch", currentRevision });
    }

    const updated = {
      version: 1,
      year: 2026,
      updatedAt: new Date().toISOString(),
      entries: body.entries
    };

    // Write
    await store.set(KEY, JSON.stringify(updated), {
      metadata: {
        // store.set accepts metadata; we set an app-level version stamp
        app_version: "v1",
        updated_at: updated.updatedAt
      }
    });

    // Read back metadata for new revision
    const after = await store.getWithMetadata(KEY, { type: "json" });
    const revision = after?.metadata?.etag || after?.metadata?.version || after?.metadata?.last_modified || null;

    return json(200, { ok: true, revision, updatedAt: updated.updatedAt });
  } catch (e) {
    return json(500, { error: "Error en save", details: String(e?.message || e) });
  }
};

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
