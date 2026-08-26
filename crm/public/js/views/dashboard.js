import { list } from "../api.js";
import { esc, fmtMoney, fmtDate } from "../ui.js";

export async function renderDashboard(main) {
  const [leads, opportunities, activities] = await Promise.all([
    list("leads", { limit: 1000 }),
    list("opportunities", { limit: 1000 }),
    list("activities", { limit: 8 }),
  ]);

  const openOpps = opportunities.filter((o) => !o.stage.startsWith("Closed"));
  const wonOpps = opportunities.filter((o) => o.stage === "Closed Won");
  const pipelineValue = openOpps.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const wonValue = wonOpps.reduce((s, o) => s + (Number(o.amount) || 0), 0);

  const funnel = {};
  for (const status of ["New", "Working", "Qualified", "Unqualified"]) funnel[status] = 0;
  for (const l of leads) if (!l.converted && funnel[l.status] !== undefined) funnel[l.status]++;
  const converted = leads.filter((l) => l.converted).length;

  main.innerHTML = `
    <div class="page-header"><h1>Dashboard</h1></div>
    <div class="stat-grid">
      <div class="card stat"><div class="value">${leads.length}</div><div class="label">Total leads</div></div>
      <div class="card stat"><div class="value">${converted}</div><div class="label">Converted leads</div></div>
      <div class="card stat"><div class="value">${openOpps.length}</div><div class="label">Open opportunities</div></div>
      <div class="card stat"><div class="value">${fmtMoney(pipelineValue)}</div><div class="label">Pipeline value</div></div>
      <div class="card stat"><div class="value">${fmtMoney(wonValue)}</div><div class="label">Closed won</div></div>
    </div>
    <div class="detail-grid">
      <div class="card">
        <h3>Lead funnel</h3>
        ${Object.entries(funnel).map(([status, count]) => `
          <div class="field-list"><div class="row">
            <span class="k"><span class="badge ${status}">${status}</span></span>
            <span>${count}</span>
          </div></div>`).join("")}
      </div>
      <div class="card">
        <h3>Recent activity</h3>
        <div class="timeline">
          ${activities.length ? activities.map((a) => `
            <div class="item">
              <strong>${esc(a.subject)}</strong>
              <div class="muted small">${esc(a.type)} · ${fmtDate(a.createdAt)}</div>
            </div>`).join("") : '<p class="muted">Nothing logged yet.</p>'}
        </div>
      </div>
    </div>`;
}
