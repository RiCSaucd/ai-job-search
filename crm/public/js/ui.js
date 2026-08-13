// Small shared UI helpers: modal dialogs, escaping, formatting.

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function scoreClass(score) {
  if (score == null) return "";
  return score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
}

/**
 * Open a modal containing a form. `fields` is a list of
 * {name, label, type?, options?, value?, required?, full?}.
 * Resolves with the entered values, or null if cancelled.
 */
export function formModal(title, fields, submitLabel = "Save") {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    const inputs = fields.map((f) => {
      const value = esc(f.value ?? "");
      const cls = f.full ? "full" : "";
      if (f.type === "select") {
        // Options are strings or {value, label} objects.
        const opts = f.options.map((o) => {
          const v = typeof o === "object" ? o.value : o;
          const label = typeof o === "object" ? o.label : o;
          return `<option value="${esc(v)}" ${v === f.value ? "selected" : ""}>${esc(label)}</option>`;
        }).join("");
        return `<label class="${cls}">${esc(f.label)}<select name="${esc(f.name)}">${opts}</select></label>`;
      }
      if (f.type === "textarea") {
        return `<label class="${cls}">${esc(f.label)}<textarea name="${esc(f.name)}" rows="3">${value}</textarea></label>`;
      }
      return `<label class="${cls}">${esc(f.label)}<input name="${esc(f.name)}" type="${f.type || "text"}" value="${value}" ${f.required ? "required" : ""}></label>`;
    }).join("");

    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <h2>${esc(title)}</h2>
          <form id="modal-form">
            <div class="form-grid">${inputs}</div>
            <div class="modal-actions">
              <button type="button" class="btn" id="modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>`;

    const close = (result) => { root.innerHTML = ""; resolve(result); };
    root.querySelector("#modal-cancel").onclick = () => close(null);
    root.querySelector(".modal-backdrop").onclick = (e) => {
      if (e.target.classList.contains("modal-backdrop")) close(null);
    };
    root.querySelector("#modal-form").onsubmit = (e) => {
      e.preventDefault();
      close(Object.fromEntries(new FormData(e.target).entries()));
    };
  });
}

export function confirmModal(message) {
  return formModal(message, [], "Confirm").then((r) => r !== null);
}

export function toast(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = "position:fixed;bottom:1.5rem;right:1.5rem;background:#1f2328;color:#fff;padding:.7rem 1.1rem;border-radius:8px;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.25)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
