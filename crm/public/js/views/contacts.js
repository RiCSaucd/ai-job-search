import { list, create, update, remove } from "../api.js";
import { esc, fmtDate, formModal, confirmModal, toast } from "../ui.js";

const FIELDS = (c = {}, accounts = []) => [
  { name: "firstName", label: "First name", value: c.firstName, required: true },
  { name: "lastName", label: "Last name", value: c.lastName },
  { name: "email", label: "Email", type: "email", value: c.email },
  { name: "phone", label: "Phone", value: c.phone },
  { name: "title", label: "Job title", value: c.title },
  { name: "accountId", label: "Account", type: "select",
    options: [{ value: "", label: "— none —" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))],
    value: c.accountId || "" },
];

export async function renderContacts(main) {
  const [contacts, accounts] = await Promise.all([
    list("contacts", { limit: 500 }),
    list("accounts", { orderBy: "name", dir: "asc", limit: 500 }),
  ]);
  const accountName = (id) => accounts.find((a) => a.id === id)?.name || "—";

  main.innerHTML = `
    <div class="page-header">
      <h1>Contacts</h1>
      <button class="btn btn-primary" id="new-contact">+ New contact</button>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Title</th><th>Account</th><th>Email</th><th>Phone</th><th>Created</th><th></th></tr></thead>
      <tbody>
        ${contacts.map((c) => `
          <tr data-id="${c.id}">
            <td><strong>${esc(c.firstName)} ${esc(c.lastName)}</strong></td>
            <td>${esc(c.title || "—")}</td>
            <td>${esc(accountName(c.accountId))}</td>
            <td>${esc(c.email || "—")}</td>
            <td>${esc(c.phone || "—")}</td>
            <td>${fmtDate(c.createdAt)}</td>
            <td><button class="btn btn-ghost small" data-del="${c.id}">✕</button></td>
          </tr>`).join("")}
      </tbody>
    </table>
    ${contacts.length ? "" : '<div class="empty">No contacts yet — convert a qualified lead or add one manually.</div>'}`;

  main.querySelector("#new-contact").onclick = async () => {
    const data = await formModal("New contact", FIELDS({}, accounts));
    if (!data) return;
    await create("contacts", data);
    toast("Contact created");
    renderContacts(main);
  };

  main.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.onclick = async (e) => {
      if (e.target.dataset.del) {
        if (await confirmModal("Delete this contact?")) {
          await remove("contacts", e.target.dataset.del);
          renderContacts(main);
        }
        return;
      }
      const contact = contacts.find((c) => c.id === tr.dataset.id);
      const data = await formModal("Edit contact", FIELDS(contact, accounts));
      if (!data) return;
      await update("contacts", contact.id, data);
      renderContacts(main);
    };
  });
}
