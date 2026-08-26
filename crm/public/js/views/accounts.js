import { list, create, update, remove } from "../api.js";
import { esc, fmtDate, formModal, confirmModal, toast } from "../ui.js";

const FIELDS = (a = {}) => [
  { name: "name", label: "Account name", value: a.name, required: true },
  { name: "website", label: "Website", value: a.website },
  { name: "industry", label: "Industry", value: a.industry },
  { name: "phone", label: "Phone", value: a.phone },
  { name: "city", label: "City", value: a.city },
  { name: "country", label: "Country", value: a.country },
];

export async function renderAccounts(main) {
  const [accounts, contacts] = await Promise.all([
    list("accounts", { orderBy: "name", dir: "asc", limit: 500 }),
    list("contacts", { limit: 1000 }),
  ]);
  const contactCount = (id) => contacts.filter((c) => c.accountId === id).length;

  main.innerHTML = `
    <div class="page-header">
      <h1>Accounts</h1>
      <button class="btn btn-primary" id="new-account">+ New account</button>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Industry</th><th>Website</th><th>Contacts</th><th>Created</th><th></th></tr></thead>
      <tbody>
        ${accounts.map((a) => `
          <tr data-id="${a.id}">
            <td><strong>${esc(a.name)}</strong></td>
            <td>${esc(a.industry || "—")}</td>
            <td>${esc(a.website || "—")}</td>
            <td>${contactCount(a.id)}</td>
            <td>${fmtDate(a.createdAt)}</td>
            <td><button class="btn btn-ghost small" data-del="${a.id}">✕</button></td>
          </tr>`).join("")}
      </tbody>
    </table>
    ${accounts.length ? "" : '<div class="empty">No accounts yet — they are created automatically when you convert leads with a company.</div>'}`;

  main.querySelector("#new-account").onclick = async () => {
    const data = await formModal("New account", FIELDS());
    if (!data) return;
    await create("accounts", data);
    toast("Account created");
    renderAccounts(main);
  };

  main.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.onclick = async (e) => {
      if (e.target.dataset.del) {
        if (await confirmModal("Delete this account?")) {
          await remove("accounts", e.target.dataset.del);
          renderAccounts(main);
        }
        return;
      }
      const account = accounts.find((a) => a.id === tr.dataset.id);
      const data = await formModal("Edit account", FIELDS(account));
      if (!data) return;
      await update("accounts", account.id, data);
      renderAccounts(main);
    };
  });
}
