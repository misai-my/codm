const cfg = window.PORTAL_CONFIG || {};
const sb = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});


const TOURNAMENT_STORAGE_KEY = "codm_selected_tournament_slug";

function getTournamentSlugFromUrl() {
  return new URLSearchParams(window.location.search).get("tournament") || "";
}

function getSelectedTournamentSlug(fallback = cfg.DEFAULT_TOURNAMENT_SLUG || "community-gladiators-2026-season-2") {
  return getTournamentSlugFromUrl() || localStorage.getItem(TOURNAMENT_STORAGE_KEY) || fallback;
}

function setSelectedTournamentSlug(slug, updateUrl = true) {
  const cleanSlug = text(slug);
  if (!cleanSlug) return;

  localStorage.setItem(TOURNAMENT_STORAGE_KEY, cleanSlug);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("tournament", cleanSlug);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function tournamentUrl(path, slug = getSelectedTournamentSlug()) {
  const url = new URL(path, window.location.href);
  url.searchParams.set("tournament", slug);
  return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
}

async function listTournaments() {
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .order("start_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getTournamentBySlug(slug = getSelectedTournamentSlug()) {
  const targetSlug = slug || cfg.DEFAULT_TOURNAMENT_SLUG || "community-gladiators-2026-season-2";
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("slug", targetSlug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function tournamentFallback(slug = getSelectedTournamentSlug()) {
  const fallback = cfg.TOURNAMENT_FALLBACKS?.[slug] || {};
  return {
    id: null,
    slug,
    title: fallback.title || cfg.SITE_NAME || "CODM Tournament OS",
    registration_form_url: fallback.registration_form_url || "",
    rulebook_url: fallback.rulebook_url || cfg.RULEBOOK_URL || "",
    rulebook_doc_url: fallback.rulebook_url || cfg.RULEBOOK_URL || ""
  };
}

function updateTournamentLinks(root = document, slug = getSelectedTournamentSlug()) {
  qsa("[data-tournament-link]", root).forEach(link => {
    const target = link.getAttribute("data-tournament-link");
    if (!target) return;
    link.href = tournamentUrl(target, slug);
  });
}

function appBaseUrl() {
  const path = window.location.pathname;
  const basePath = path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
  return `${window.location.origin}${basePath}`;
}

function authCallbackUrl() {
  return `${appBaseUrl()}auth-callback.html`;
}

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

async function waitForSession(retries = 8, delayMs = 180) {
  for (let i = 0; i < retries; i += 1) {
    const session = await getSession();
    if (session?.user) return session;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
}

async function signOut(redirectTo = "index.html") {
  await sb.auth.signOut();
  const next = typeof redirectTo === "string" ? redirectTo : "index.html";
  location.href = next;
}

async function sendMagicLink(email, nextPath = "dashboard.html") {
  const callback = new URL(authCallbackUrl());
  callback.searchParams.set("next", nextPath || "dashboard.html");

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString() }
  });

  if (error) throw error;
}

async function signInWithPassword(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

async function getActiveTournament(slug = null) {
  return getTournamentBySlug(slug || getSelectedTournamentSlug());
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
window.portal = { getTournamentSlugFromUrl, getSelectedTournamentSlug, setSelectedTournamentSlug, tournamentUrl, listTournaments, getTournamentBySlug, tournamentFallback, updateTournamentLinks, appBaseUrl, authCallbackUrl, qs, qsa, text, esc, toast, getSession, waitForSession, signOut, sendMagicLink, signInWithPassword, currentUserAccess, getActiveTournament, requireConfig };
