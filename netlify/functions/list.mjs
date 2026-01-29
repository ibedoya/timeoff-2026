import { getStore } from "@netlify/blobs";

const STORE_NAME = "timeoff";
const KEY = "entries_2026_v1";

export default async (req) => {
  try {
    const store = getStore(STORE_NAME);
    const res = await store.get(KEY, { type: "json" });

    // store.get returns null if missing
    const data = res ?? { version: 1, year: 2026, updatedAt: null, entries: [] };

    // Get ETag/revision: Blobs returns metadata via store.getWithMetadata
    const withMeta = await store.getWithMetadata(KEY, { type: "json" });
    const revision = withMeta?.metadata?.etag || withMeta?.metadata?.version || withMeta?.metadata?.last_modified || null;
    const updatedAt = data.updatedAt || null;

    return json(200, { data, revision, updatedAt });
  } catch (e) {
    return json(500, { error: "Error en list", details: String(e?.message || e) });
  }
};

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
