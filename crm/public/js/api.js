// Firestore data layer. All views go through this module.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, connectAuthEmulator,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, connectFirestoreEmulator,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, serverTimestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
}

// ---- Auth ----

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Profile doc starts inactive; see firestore.rules for activation flow.
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    active: false,
    createdAt: serverTimestamp(),
  });
  return cred;
}

export function logOut() {
  return signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---- Generic CRUD ----

function toObj(snap) {
  return { id: snap.id, ...snap.data() };
}

export async function list(coll, opts = {}) {
  const parts = [collection(db, coll)];
  if (opts.where) parts.push(where(...opts.where));
  parts.push(orderBy(opts.orderBy || "createdAt", opts.dir || "desc"));
  if (opts.limit) parts.push(limit(opts.limit));
  const snap = await getDocs(query(...parts));
  return snap.docs.map(toObj);
}

export async function get(coll, id) {
  const snap = await getDoc(doc(db, coll, id));
  return snap.exists() ? toObj(snap) : null;
}

export async function create(coll, data) {
  const ref = await addDoc(collection(db, coll), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function update(coll, id, data) {
  await updateDoc(doc(db, coll, id), { ...data, updatedAt: serverTimestamp() });
}

export async function remove(coll, id) {
  await deleteDoc(doc(db, coll, id));
}

// ---- Lead conversion (Salesforce-style) ----
// Creates Account (deduped by name), Contact, and optional Opportunity, then
// marks the lead converted.

export async function convertLead(lead, opportunityName, amount) {
  let accountId = null;
  if (lead.company) {
    const existing = await list("accounts", { where: ["name", "==", lead.company], limit: 1 });
    accountId = existing[0]?.id
      || await create("accounts", { name: lead.company, website: lead.website || "" });
  }

  const contactId = await create("contacts", {
    firstName: lead.firstName || "",
    lastName: lead.lastName || "",
    email: lead.email || "",
    phone: lead.phone || "",
    title: lead.title || "",
    accountId,
    leadSource: lead.source || "",
  });

  let opportunityId = null;
  if (opportunityName) {
    opportunityId = await create("opportunities", {
      name: opportunityName,
      accountId,
      contactId,
      stage: "Prospecting",
      amount: Number(amount) || 0,
      closeDate: "",
    });
  }

  await update("leads", lead.id, {
    converted: true,
    status: "Qualified",
    convertedContactId: contactId,
    convertedAccountId: accountId,
    convertedOpportunityId: opportunityId,
  });

  return { accountId, contactId, opportunityId };
}

// ---- CSV import ----
// Accepts parsed rows ({header: value}), maps common column aliases, dedupes
// by email against existing leads, writes in batches.

const CSV_ALIASES = {
  firstName: ["firstname", "first name", "first_name", "given name"],
  lastName: ["lastname", "last name", "last_name", "surname", "family name"],
  email: ["email", "e-mail", "email address", "work email"],
  phone: ["phone", "phone number", "mobile", "telephone"],
  company: ["company", "company name", "organization", "organisation", "account"],
  title: ["title", "job title", "position", "role"],
  website: ["website", "url", "company website", "domain"],
};

export function mapCsvRow(row) {
  const lower = {};
  for (const [k, v] of Object.entries(row)) lower[k.trim().toLowerCase()] = v;
  const lead = {};
  for (const [field, aliases] of Object.entries(CSV_ALIASES)) {
    for (const alias of [field.toLowerCase(), ...aliases]) {
      if (lower[alias]) { lead[field] = String(lower[alias]).trim(); break; }
    }
  }
  return lead;
}

export async function importLeads(rows) {
  const existing = await list("leads", { limit: 5000 });
  const seen = new Set(existing.map((l) => l.email).filter(Boolean));
  let imported = 0, skipped = 0;

  // Firestore batches max out at 500 writes.
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(db);
    for (const row of rows.slice(i, i + 400)) {
      const lead = mapCsvRow(row);
      if (!lead.email && !(lead.firstName && lead.lastName)) { skipped++; continue; }
      if (lead.email && seen.has(lead.email)) { skipped++; continue; }
      if (lead.email) seen.add(lead.email);
      batch.set(doc(collection(db, "leads")), {
        ...lead,
        source: "csv-import",
        status: "New",
        score: null,
        converted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      imported++;
    }
    await batch.commit();
  }
  return { imported, skipped };
}

// Minimal CSV parser handling quoted fields and CRLF.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);

  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) =>
    Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}
