document.addEventListener("DOMContentLoaded", async () => {
 portal.updateTournamentLinks(document, portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG));
 const loginForm = portal.qs("#loginForm");
 const emailInput = portal.qs("#loginEmail");
 const status = portal.qs("#loginStatus");

 if (!portal.requireConfig()) {
  status.textContent = "Setup needed: paste the Supabase anon key in assets/js/config.js.";
  status.classList.remove("hidden");
  return;
 }

 const session = await portal.getSession();
 if (session?.user) {
  portal.qs("#loggedInBox").classList.remove("hidden");
  portal.qs("#loggedInEmail").textContent = session.user.email;
 }

 loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = portal.text(emailInput.value).toLowerCase();
  if (!email) return;

  try {
   status.textContent = "Sending secure login link...";
   status.classList.remove("hidden");
   await portal.sendMagicLink(email);
   status.textContent = "Login link sent. Open it on the same browser/device. It will complete login through auth-callback.html.";
  } catch (err) {
   console.error(err);
   status.textContent = err.message || "Could not send login link.";
  }
 });
});
