import { list, create, update, remove } from "../api.js";
import { esc, fmtDate, formModal, confirmModal, toast } from "../ui.js";

export async function renderActivities(main) {
  const activities = await list("activities", { limit: 200 });

  main.innerHTML = `
    <div class="page-header">
      <h1>Activities</h1>
      <button class="btn btn-primary" id="new-activity">+ Log activity</button>
    </div>
    <table>
      <thead><tr><th>Type</th><th>Subject</th><th>Related to</th><th>Due</th><th>Done</th><th>Logged</th><th></th></tr></thead>
      <tbody>
        ${activities.map((a) => `
          <tr data-id="${a.id}">
            <td>${esc(a.type)}</td>
            <td><strong>${esc(a.subject)}</strong>${a.body ? `<div class="muted small">${esc(a.body)}</div>` : ""}</td>
            <td>${esc(a.relatedToName || "—")}</td>
            <td>${esc(a.dueDate || "—")}</td>
            <td>${a.type === "task" ? `<input type="checkbox" data-done="${a.id}" ${a.done ? "checked" : ""}>` : "—"}</td>
            <td>${fmtDate(a.createdAt)}</td>
            <td><button class="btn btn-ghost small" data-del="${a.id}">✕</button></td>
          </tr>`).join("")}
      </tbody>
    </table>
    ${activities.length ? "" : '<div class="empty">Nothing logged yet. Activities can also be logged from a lead\'s detail page.</div>'}`;

  main.querySelector("#new-activity").onclick = async () => {
    const data = await formModal("Log activity", [
      { name: "type", label: "Type", type: "select", options: ["call", "email", "meeting", "note", "task"] },
      { name: "subject", label: "Subject", required: true },
      { name: "dueDate", label: "Due date (tasks)", type: "date" },
      { name: "body", label: "Details", type: "textarea", full: true },
    ]);
    if (!data) return;
    await create("activities", { ...data, done: false });
    toast("Activity logged");
    renderActivities(main);
  };

  main.querySelectorAll("[data-done]").forEach((cb) => {
    cb.onclick = (e) => {
      e.stopPropagation();
      update("activities", cb.dataset.done, { done: cb.checked });
    };
  });
  main.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!(await confirmModal("Delete this activity?"))) return;
      await remove("activities", btn.dataset.del);
      renderActivities(main);
    };
  });
}
