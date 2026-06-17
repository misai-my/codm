const cfg = window.PORTAL_CONFIG || {};
const sb = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function text(v) { return String(v ?? "").trim(); }
function esc(v) {
  return text(v).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[c]);
}

function toast(message) {
  let el = qs("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
}

async function getSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function signOut() {
  await sb.auth.signOut();
  location.href = "index.html";
}

async function sendMagicLink(email) {
  const redirectTo = `${location.origin}${location.pathname.replace(/\/[^/]*$/, "/")}dashboard.html`;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw error;
}

async function currentUserAccess() {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return { session, email: "", access: [] };

  const { data, error } = await sb
    .from("registered_access")
    .select("*")
    .eq("email", email.toLowerCase())
    .in("status", ["registered", "approved", "active"]);

  if (error) throw error;
  return { session, email, access: data || [] };
}

function requireConfig() {
  if (!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("PASTE_")) {
    const msg = "Missing Supabase anon key in assets/js/config.js";
    console.warn(msg);
    return false;
  }
  return true;
}

function wireNavAuth() {
  qsa("[data-signout]").forEach(btn => btn.addEventListener("click", signOut));
}

document.addEventListener("DOMContentLoaded", wireNavAuth);
window.portal = { qs, qsa, text, esc, toast, getSession, signOut, sendMagicLink, currentUserAccess, requireConfig };
