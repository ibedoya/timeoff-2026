import { getStore } from "@netlify/blobs";

const STORE_NAME = "timeoff";
const KEY = "entries_2026_v1";

export default async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const store = getStore(STORE_NAME);
    await store.delete(KEY);

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: "Error en clear", details: String(e?.message || e) });
  }
};

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
