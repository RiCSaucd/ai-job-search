import { db, list, update } from "../api.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { esc, toast, confirmModal } from "../ui.js";

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return "wtl_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function renderSettings(main) {
  const [captureSnap, users] = await Promise.all([
    getDoc(doc(db, "settings", "capture")),
    list("users", { orderBy: "createdAt", dir: "asc", limit: 100 }),
  ]);
  const apiKey = captureSnap.exists() ? captureSnap.data().apiKey : null;

  main.innerHTML = `
    <div class="page-header"><h1>Settings</h1></div>

    <div class="card" style="margin-bottom:1.25rem">
      <h3>Web-to-Lead capture</h3>
      <p class="muted small">
        The <code>webToLead</code> Cloud Function accepts POSTs from your landing
        pages, ad-platform webhooks, or licensed data-provider integrations.
        Requests must carry this API key in an <code>x-api-key</code> header.
        The key only permits creating leads; rotate it any time.
      </p>
      ${apiKey
        ? `<p>Current key: <code id="key-value">${esc(apiKey)}</code>
             <button class="btn small" id="copy-key">Copy</button></p>`
        : "<p class='muted'>No capture key yet — lead capture is disabled.</p>"}
      <button class="btn btn-primary" id="rotate-key">${apiKey ? "Rotate key" : "Generate key"}</button>
      <p class="muted small" style="margin-top:.75rem">
        Endpoint: <code>https://&lt;region&gt;-&lt;project-id&gt;.cloudfunctions.net/webToLead</code><br>
        Example form: <code>public/lead-form.html</code> in this repo.
      </p>
    </div>

    <div class="card">
      <h3>Workspace members</h3>
      <p class="muted small">
        Anyone can sign up, but they can't see CRM data until an existing member
        activates them here (the very first user is activated from the Firebase
        console).
      </p>
      <table>
        <thead><tr><th>Email</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${users.map((u) => `
            <tr>
              <td>${esc(u.email)}</td>
              <td>${u.active ? '<span class="badge Qualified">active</span>' : '<span class="badge Working">pending</span>'}</td>
              <td>${u.active
                ? `<button class="btn small" data-deactivate="${u.id}">Deactivate</button>`
                : `<button class="btn btn-primary small" data-activate="${u.id}">Activate</button>`}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  main.querySelector("#rotate-key").onclick = async () => {
    if (apiKey && !(await confirmModal("Rotate the capture key? Existing forms will stop working until updated."))) return;
    await setDoc(doc(db, "settings", "capture"), {
      apiKey: randomKey(),
      updatedAt: serverTimestamp(),
    });
    toast("Capture key updated");
    renderSettings(main);
  };

  const copyBtn = main.querySelector("#copy-key");
  if (copyBtn) copyBtn.onclick = () => {
    navigator.clipboard.writeText(apiKey);
    toast("Key copied");
  };

  main.querySelectorAll("[data-activate]").forEach((btn) => {
    btn.onclick = async () => {
      await update("users", btn.dataset.activate, { active: true });
      toast("Member activated");
      renderSettings(main);
    };
  });
  main.querySelectorAll("[data-deactivate]").forEach((btn) => {
    btn.onclick = async () => {
      if (!(await confirmModal("Deactivate this member? They will lose access immediately."))) return;
      await update("users", btn.dataset.deactivate, { active: false });
      renderSettings(main);
    };
  });
}
