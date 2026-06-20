function safeNextPath() {
 const query = new URLSearchParams(window.location.search);
 const next = query.get("next") || "dashboard.html";
 if (/^[a-z0-9_-]+\.html(?:[?#].*)?$/i.test(next)) return next;
 return "dashboard.html";
}

async function completeAuthCallback() {
 const status = portal.qs("#callbackStatus");
 const detail = portal.qs("#callbackDetail");

 function setStatus(title, message) {
  if (status) status.textContent = title;
  if (detail) detail.textContent = message || "";
 }

 try {
  if (!portal.requireConfig()) {
   setStatus("Setup needed", "Paste the Supabase anon key in assets/js/config.js.");
   return;
  }

  setStatus("Completing login", "Please wait while we secure your session...");

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const errorDescription =
   query.get("error_description") ||
   hash.get("error_description") ||
   query.get("error") ||
   hash.get("error");

  if (errorDescription) {
   throw new Error(errorDescription);
  }

  const code = query.get("code");

  if (code) {
   const { error } = await sb.auth.exchangeCodeForSession(code);
   if (error) throw error;
  } else if (hash.get("access_token") && hash.get("refresh_token")) {
   const { error } = await sb.auth.setSession({
    access_token: hash.get("access_token"),
    refresh_token: hash.get("refresh_token")
   });
   if (error) throw error;
  } else {
   const { data, error } = await sb.auth.getSession();
   if (error) throw error;
   if (!data?.session) {
    throw new Error("No auth token was found in the callback URL. The login link may be expired or the redirect URL is not allowed in Supabase.");
   }
  }

  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  if (!data?.session) {
   throw new Error("Supabase did not store the session. Please try the login link again.");
  }

  window.history.replaceState({}, document.title, window.location.pathname);
  setStatus("Login confirmed", "Redirecting to your dashboard...");
  setTimeout(() => window.location.replace(safeNextPath()), 500);
 } catch (err) {
  console.error(err);
  setStatus("Login could not be completed", err.message || "Please request a new login link.");
  portal.qs("#callbackActions")?.classList.remove("hidden");
 }
}

document.addEventListener("DOMContentLoaded", completeAuthCallback);
