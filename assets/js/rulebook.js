function googleDocPreviewUrl(url) {
  const text = portal.text(url);
  const match = text.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://docs.google.com/document/d/${match[1]}/preview?usp=sharing` : text;
}

async function getActiveTournament() {
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("slug", cfg.DEFAULT_TOURNAMENT_SLUG)
    .maybeSingle();

  if (error) {
    console.warn("Could not load tournament rulebook row:", error);
    return null;
  }

  return data || null;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  const frame = portal.qs("#rulebookFrame");
  const openBtn = portal.qs("#openRulebookBtn");
  const status = portal.qs("#rulebookStatus");

  try {
    const tournament = await getActiveTournament();
    const rulebookUrl = tournament?.rulebook_url || cfg.RULEBOOK_URL;

    if (!rulebookUrl) {
      status.textContent = "No rulebook link has been configured yet.";
      return;
    }

    const previewUrl = googleDocPreviewUrl(rulebookUrl);
    frame.src = previewUrl;
    frame.classList.remove("hidden");
    openBtn.href = rulebookUrl;
    openBtn.classList.remove("hidden");
    status.textContent = tournament?.title || "Official Rulebook";
  } catch (err) {
    console.error(err);
    status.textContent = err.message || "Could not load rulebook.";
  }
});
