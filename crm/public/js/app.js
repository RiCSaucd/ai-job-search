// App shell: auth gate + hash router.
import { watchAuth, signIn, signUp, logOut, getUserProfile } from "./api.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderLeads } from "./views/leads.js";
import { renderContacts } from "./views/contacts.js";
import { renderAccounts } from "./views/accounts.js";
import { renderPipeline } from "./views/pipeline.js";
import { renderActivities } from "./views/activities.js";
import { renderSettings } from "./views/settings.js";

const routes = {
  dashboard: renderDashboard,
  leads: renderLeads,
  contacts: renderContacts,
  accounts: renderAccounts,
  pipeline: renderPipeline,
  activities: renderActivities,
  settings: renderSettings,
};

const authScreen = document.getElementById("auth-screen");
const appEl = document.getElementById("app");
const main = document.getElementById("main");

let isSignUp = false;

function showAuth(pendingActivation = false) {
  appEl.classList.add("hidden");
  authScreen.classList.remove("hidden");
  document.getElementById("auth-pending-msg").style.display =
    pendingActivation ? "block" : "none";
}

function showApp(user) {
  authScreen.classList.add("hidden");
  appEl.classList.remove("hidden");
  document.getElementById("user-email").textContent = user.email;
  route();
}

async function route() {
  const [, name, param] = location.hash.split("/");
  const view = routes[name] || renderDashboard;
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === (routes[name] ? name : "dashboard")));
  main.innerHTML = '<p class="muted">Loading…</p>';
  try {
    await view(main, param);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="card"><strong>Error:</strong> ${err.message}</div>`;
  }
}

window.addEventListener("hashchange", route);

document.getElementById("auth-toggle").addEventListener("click", (e) => {
  e.preventDefault();
  isSignUp = !isSignUp;
  document.getElementById("auth-submit").textContent = isSignUp ? "Sign up" : "Sign in";
  document.getElementById("auth-subtitle").textContent =
    isSignUp ? "Create your account" : "Sign in to your workspace";
  e.target.textContent = isSignUp ? "Have an account? Sign in" : "No account? Sign up";
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("auth-error");
  errEl.textContent = "";
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  try {
    await (isSignUp ? signUp(email, password) : signIn(email, password));
  } catch (err) {
    errEl.textContent = err.message.replace("Firebase: ", "");
  }
});

document.getElementById("sign-out").addEventListener("click", () => logOut());

watchAuth(async (user) => {
  if (!user) { showAuth(); return; }
  const profile = await getUserProfile(user.uid);
  if (!profile?.active) {
    // Signed in but not yet activated as a workspace member.
    showAuth(true);
    return;
  }
  showApp(user);
});
