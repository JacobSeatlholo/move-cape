// api/flights.js
// Vercel Serverless Function — proxies AviationStack from server side.
// Bypasses the HTTP/HTTPS restriction on AviationStack free plan.
//
// SETUP:
//   1. Create folder `api` in your Vercel project root
//   2. Place this file at: api/flights.js
//   3. In Vercel dashboard → Settings → Environment Variables add:
//      Name:  AVIATIONSTACK_KEY
//      Value: 58b978d2fbb5e96363002c48311c9d78
//   4. Redeploy. Endpoint will be live at:
//      https://www.movecape.online/api/flights?type=departures
//      https://www.movecape.online/api/flights?type=arrivals

export default async function handler(req, res) {
  // Allow MoveCape frontend to call this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const key  = process.env.AVIATIONSTACK_KEY;
  const type = req.query.type === "arrivals" ? "arrivals" : "departures";

  if (!key) {
    return res.status(500).json({ error: "AVIATIONSTACK_KEY environment variable not set." });
  }

  const param = type === "arrivals" ? "arr_iata=CPT" : "dep_iata=CPT";
  const url   = `http://api.aviationstack.com/v1/flights?access_key=${key}&${param}&limit=20`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    const data = await upstream.json();
    if (data.error) return res.status(400).json({ error: data.error.info });

    // Cache 60s on Vercel CDN — protects your 500 req/month quota
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
