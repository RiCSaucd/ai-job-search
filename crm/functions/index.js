/**
 * FireCRM Cloud Functions
 *
 *  - webToLead:  public HTTPS endpoint for capturing leads from landing pages,
 *                ad forms, or licensed-data integrations (Salesforce-style
 *                Web-to-Lead). Guarded by API key + honeypot + rate limit.
 *  - scoreLead:  Firestore trigger that assigns a simple 0-100 score to every
 *                new lead based on data completeness and source.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const LEAD_FIELDS = [
  "firstName", "lastName", "email", "phone", "company",
  "title", "website", "source", "message",
];

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // submissions per IP per window

function sanitize(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 500);
}

/**
 * Per-IP rate limiting backed by Firestore. Returns true when the caller is
 * within limits. Uses a transaction so concurrent submissions count correctly.
 */
async function withinRateLimit(ip) {
  const key = ip.replace(/[^a-zA-Z0-9]/g, "_") || "unknown";
  const ref = db.collection("captureRateLimits").doc(key);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: now });
      return true;
    }
    if (data.count >= RATE_LIMIT_MAX) return false;
    tx.set(ref, { count: data.count + 1, windowStart: data.windowStart });
    return true;
  });
}

exports.webToLead = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const body = req.body || {};

  // Honeypot: real forms render this field hidden; bots fill it in.
  if (body.faxNumber) {
    // Pretend success so bots don't adapt.
    res.status(200).json({ ok: true });
    return;
  }

  // API key check against settings/capture.
  const settingsSnap = await db.collection("settings").doc("capture").get();
  const configuredKey = settingsSnap.exists ? settingsSnap.data().apiKey : null;
  if (!configuredKey) {
    res.status(503).json({ error: "Lead capture is not configured" });
    return;
  }
  const providedKey = req.get("x-api-key") || body.apiKey;
  if (providedKey !== configuredKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const ip = req.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown";
  if (!(await withinRateLimit(ip))) {
    res.status(429).json({ error: "Too many submissions, try again later" });
    return;
  }

  const lead = {};
  for (const field of LEAD_FIELDS) lead[field] = sanitize(body[field]);

  if (!lead.email && !(lead.firstName && lead.lastName)) {
    res.status(400).json({ error: "An email or a full name is required" });
    return;
  }
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  // Dedupe by email: update the existing lead instead of creating a copy.
  if (lead.email) {
    const dup = await db.collection("leads")
      .where("email", "==", lead.email).limit(1).get();
    if (!dup.empty) {
      await dup.docs[0].ref.update({
        ...Object.fromEntries(Object.entries(lead).filter(([, v]) => v)),
        updatedAt: FieldValue.serverTimestamp(),
        captureCount: FieldValue.increment(1),
      });
      res.status(200).json({ ok: true, deduped: true });
      return;
    }
  }

  await db.collection("leads").add({
    ...lead,
    source: lead.source || "web-to-lead",
    status: "New",
    score: null,
    converted: false,
    captureCount: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({ ok: true });
});

/**
 * Simple completeness + source based lead score (0-100), assigned once when
 * the lead is created. Editable later by hand from the UI.
 */
exports.scoreLead = onDocumentCreated("leads/{leadId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const lead = snap.data();
  if (lead.score !== null && lead.score !== undefined) return;

  let score = 0;
  if (lead.email) score += 25;
  if (lead.phone) score += 15;
  if (lead.company) score += 20;
  if (lead.title) score += 10;
  if (lead.website) score += 10;

  const sourceBonus = {
    "web-to-lead": 20,   // inbound — they came to you
    "referral": 20,
    "event": 10,
    "csv-import": 5,     // cold list
  };
  score += sourceBonus[lead.source] ?? 5;

  await snap.ref.update({ score: Math.min(score, 100) });
});
