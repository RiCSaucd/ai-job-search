import { list, create, update, remove } from "../api.js";
import { esc, fmtMoney, formModal, confirmModal, toast } from "../ui.js";

const STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

const FIELDS = (o = {}, accounts = []) => [
  { name: "name", label: "Opportunity name", value: o.name, required: true, full: true },
  { name: "accountId", label: "Account", type: "select",
    options: [{ value: "", label: "— none —" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))],
    value: o.accountId || "" },
  { name: "stage", label: "Stage", type: "select", options: STAGES, value: o.stage || "Prospecting" },
  { name: "amount", label: "Amount (USD)", type: "number", value: o.amount },
  { name: "closeDate", label: "Close date", type: "date", value: o.closeDate },
];

export async function renderPipeline(main) {
  const [opportunities, accounts] = await Promise.all([
    list("opportunities", { limit: 500 }),
    list("accounts", { orderBy: "name", dir: "asc", limit: 500 }),
  ]);
  const accountName = (id) => accounts.find((a) => a.id === id)?.name || "";

  main.innerHTML = `
    <div class="page-header">
      <h1>Pipeline</h1>
      <button class="btn btn-primary" id="new-opp">+ New opportunity</button>
    </div>
    <div class="kanban">
      ${STAGES.map((stage) => {
        const cards = opportunities.filter((o) => o.stage === stage);
        const total = cards.reduce((s, o) => s + (Number(o.amount) || 0), 0);
        return `
        <div class="kanban-col" data-stage="${esc(stage)}">
          <h3><span>${esc(stage)}</span><span>${fmtMoney(total)}</span></h3>
          ${cards.map((o) => `
            <div class="kanban-card" draggable="true" data-id="${o.id}">
              <div><strong>${esc(o.name)}</strong></div>
              <div class="muted small">${esc(accountName(o.accountId))}</div>
              <div class="amount">${fmtMoney(o.amount)}</div>
            </div>`).join("")}
        </div>`;
      }).join("")}
    </div>
    <p class="muted small">Drag cards between columns to change stage. Click a card to edit.</p>`;

  main.querySelector("#new-opp").onclick = async () => {
    const data = await formModal("New opportunity", FIELDS({}, accounts));
    if (!data) return;
    await create("opportunities", { ...data, amount: Number(data.amount) || 0 });
    toast("Opportunity created");
    renderPipeline(main);
  };

  // Drag & drop between stage columns.
  let draggedId = null;
  main.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("dragstart", () => { draggedId = card.dataset.id; });
    card.addEventListener("click", async () => {
      const opp = opportunities.find((o) => o.id === card.dataset.id);
      const action = await formModal("Edit opportunity", FIELDS(opp, accounts));
      if (action === null) return;
      if (action.name === "") {
        if (await confirmModal("Empty name — delete this opportunity?")) {
          await remove("opportunities", opp.id);
        }
      } else {
        await update("opportunities", opp.id, { ...action, amount: Number(action.amount) || 0 });
      }
      renderPipeline(main);
    });
  });
  main.querySelectorAll(".kanban-col").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      if (!draggedId) return;
      await update("opportunities", draggedId, { stage: col.dataset.stage });
      renderPipeline(main);
    });
  });
}
