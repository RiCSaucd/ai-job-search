import { list, get, create, update, remove, convertLead, importLeads, parseCsv } from "../api.js";
import { esc, fmtDate, formModal, confirmModal, toast, scoreClass } from "../ui.js";

const STATUSES = ["New", "Working", "Qualified", "Unqualified"];

const FIELDS = (lead = {}) => [
  { name: "firstName", label: "First name", value: lead.firstName },
  { name: "lastName", label: "Last name", value: lead.lastName },
  { name: "email", label: "Email", type: "email", value: lead.email },
  { name: "phone", label: "Phone", value: lead.phone },
  { name: "company", label: "Company", value: lead.company },
  { name: "title", label: "Job title", value: lead.title },
  { name: "website", label: "Website", value: lead.website },
  { name: "source", label: "Source", type: "select", options: ["manual", "web-to-lead", "referral", "event", "csv-import", "data-provider"], value: lead.source || "manual" },
  { name: "status", label: "Status", type: "select", options: STATUSES, value: lead.status || "New" },
  { name: "notes", label: "Notes", type: "textarea", value: lead.notes, full: true },
];

export async function renderLeads(main, leadId) {
  if (leadId) return renderLeadDetail(main, leadId);

  const leads = await list("leads", { limit: 500 });

  main.innerHTML = `
    <div class="page-header">
      <h1>Leads</h1>
      <div class="toolbar">
        <select id="status-filter">
          <option value="">All statuses</option>
          ${STATUSES.map((s) => `<option>${s}</option>`).join("")}
        </select>
        <button class="btn" id="import-csv">Import CSV</button>
        <input type="file" id="csv-file" accept=".csv" class="hidden">
        <button class="btn btn-primary" id="new-lead">+ New lead</button>
      </div>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Status</th><th>Score</th><th>Source</th><th>Created</th></tr></thead>
      <tbody id="lead-rows"></tbody>
    </table>
    <div class="empty hidden" id="lead-empty">No leads yet. Add one, import a CSV, or wire up the web-to-lead form (Settings).</div>`;

  const rowsEl = main.querySelector("#lead-rows");
  const emptyEl = main.querySelector("#lead-empty");

  function draw(filter = "") {
    const visible = leads.filter((l) => !filter || l.status === filter);
    emptyEl.classList.toggle("hidden", visible.length > 0);
    rowsEl.innerHTML = visible.map((l) => `
      <tr data-id="${l.id}">
        <td><strong>${esc(l.firstName)} ${esc(l.lastName)}</strong></td>
        <td>${esc(l.company || "—")}</td>
        <td>${esc(l.email || "—")}</td>
        <td><span class="badge ${l.converted ? "Converted" : esc(l.status)}">${l.converted ? "Converted" : esc(l.status)}</span></td>
        <td><span class="score ${scoreClass(l.score)}">${l.score ?? "—"}</span></td>
        <td>${esc(l.source || "—")}</td>
        <td>${fmtDate(l.createdAt)}</td>
      </tr>`).join("");
    rowsEl.querySelectorAll("tr").forEach((tr) => {
      tr.onclick = () => { location.hash = `#/leads/${tr.dataset.id}`; };
    });
  }
  draw();

  main.querySelector("#status-filter").onchange = (e) => draw(e.target.value);

  main.querySelector("#new-lead").onclick = async () => {
    const data = await formModal("New lead", FIELDS());
    if (!data) return;
    await create("leads", { ...data, score: null, converted: false });
    toast("Lead created");
    renderLeads(main);
  };

  const fileInput = main.querySelector("#csv-file");
  main.querySelector("#import-csv").onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) { toast("Couldn't parse any rows from that CSV"); return; }
    toast(`Importing ${rows.length} rows…`);
    const { imported, skipped } = await importLeads(rows);
    toast(`Imported ${imported} leads (${skipped} skipped as duplicates/incomplete)`);
    renderLeads(main);
  };
}

async function renderLeadDetail(main, id) {
  const lead = await get("leads", id);
  if (!lead) { main.innerHTML = '<div class="card">Lead not found.</div>'; return; }
  const activities = await list("activities", { where: ["relatedToId", "==", id], limit: 50 });

  main.innerHTML = `
    <div class="page-header">
      <h1>${esc(lead.firstName)} ${esc(lead.lastName)}
        <span class="badge ${lead.converted ? "Converted" : esc(lead.status)}">${lead.converted ? "Converted" : esc(lead.status)}</span>
      </h1>
      <div class="toolbar">
        <a href="#/leads" class="btn">← Back</a>
        <button class="btn" id="edit">Edit</button>
        ${lead.converted ? "" : '<button class="btn btn-primary" id="convert">Convert</button>'}
        <button class="btn btn-danger" id="delete">Delete</button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="card field-list">
        ${[
          ["Email", lead.email], ["Phone", lead.phone], ["Company", lead.company],
          ["Title", lead.title], ["Website", lead.website], ["Source", lead.source],
          ["Score", lead.score ?? "—"], ["Created", fmtDate(lead.createdAt)],
          ["Notes", lead.notes],
        ].map(([k, v]) => `<div class="row"><span class="k">${k}</span><span>${esc(v || "—")}</span></div>`).join("")}
      </div>
      <div class="card">
        <h3>Activity</h3>
        <button class="btn small" id="log-activity">+ Log activity</button>
        <div class="timeline" style="margin-top:.75rem">
          ${activities.map((a) => `
            <div class="item"><strong>${esc(a.subject)}</strong>
              <div class="muted small">${esc(a.type)} · ${fmtDate(a.createdAt)}</div>
              ${a.body ? `<div class="small">${esc(a.body)}</div>` : ""}
            </div>`).join("") || '<p class="muted small">No activity yet.</p>'}
        </div>
      </div>
    </div>`;

  main.querySelector("#edit").onclick = async () => {
    const data = await formModal("Edit lead", FIELDS(lead));
    if (!data) return;
    await update("leads", id, data);
    renderLeadDetail(main, id);
  };

  const convertBtn = main.querySelector("#convert");
  if (convertBtn) convertBtn.onclick = async () => {
    const data = await formModal("Convert lead", [
      { name: "oppName", label: "Opportunity name (blank = no opportunity)", value: lead.company ? `${lead.company} — new business` : "", full: true },
      { name: "amount", label: "Amount (USD)", type: "number", value: "" },
    ], "Convert");
    if (!data) return;
    await convertLead(lead, data.oppName.trim(), data.amount);
    toast("Lead converted to contact" + (lead.company ? " + account" : "") + (data.oppName.trim() ? " + opportunity" : ""));
    renderLeadDetail(main, id);
  };

  main.querySelector("#delete").onclick = async () => {
    if (!(await confirmModal("Delete this lead?"))) return;
    await remove("leads", id);
    location.hash = "#/leads";
  };

  main.querySelector("#log-activity").onclick = async () => {
    const data = await formModal("Log activity", [
      { name: "type", label: "Type", type: "select", options: ["call", "email", "meeting", "note", "task"] },
      { name: "subject", label: "Subject", required: true },
      { name: "body", label: "Details", type: "textarea", full: true },
    ]);
    if (!data) return;
    await create("activities", { ...data, relatedToId: id, relatedToType: "lead", relatedToName: `${lead.firstName} ${lead.lastName}` });
    renderLeadDetail(main, id);
  };
}
