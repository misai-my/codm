function googleDocPreviewUrl(url) {
  const text = portal.text(url);
  const match = text.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://docs.google.com/document/d/${match[1]}/preview?usp=sharing` : text;
}

let rulebookTournaments = [];
let selectedRulebookTournament = null;

function tournamentRulebookUrl(row) {
  return row?.rulebook_url || row?.rulebook_doc_url || cfg.TOURNAMENT_FALLBACKS?.[row?.slug]?.rulebook_url || cfg.RULEBOOK_URL || "";
}

function renderRulebookTournamentSelector() {
  const select = portal.qs("#rulebookTournamentSelect");
  if (!select) return;

  const slug = selectedRulebookTournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
  select.innerHTML = rulebookTournaments.length
    ? rulebookTournaments.map(row => `<option value="${portal.esc(row.slug)}">${portal.esc(row.title || row.slug)}</option>`).join("")
    : `<option value="${portal.esc(slug)}">${portal.esc(selectedRulebookTournament?.title || slug)}</option>`;
  select.value = slug;
}

async function loadRulebookTournament(slug) {
  selectedRulebookTournament = rulebookTournaments.find(row => row.slug === slug) || await portal.getTournamentBySlug(slug);
  if (!selectedRulebookTournament) selectedRulebookTournament = portal.tournamentFallback(slug);
  return selectedRulebookTournament;
}

async function renderRulebookTournament() {
  const frame = portal.qs("#rulebookFrame");
  const openBtn = portal.qs("#openRulebookBtn");
  const status = portal.qs("#rulebookStatus");
  const rulebookUrl = tournamentRulebookUrl(selectedRulebookTournament);

  renderRulebookTournamentSelector();
  portal.updateTournamentLinks(document, selectedRulebookTournament.slug);
  document.title = `${selectedRulebookTournament.title || "Rulebook"} · CODM Tournament OS`;

  if (!rulebookUrl) {
    frame?.classList.add("hidden");
    if (openBtn) openBtn.classList.add("hidden");
    if (status) status.textContent = `The ${selectedRulebookTournament.title || "selected"} rulebook will be published soon.`;
    return;
  }

  frame.src = googleDocPreviewUrl(rulebookUrl);
  frame.classList.remove("hidden");
  openBtn.href = rulebookUrl;
  openBtn.classList.remove("hidden");
  status.textContent = selectedRulebookTournament.title || "Official Rulebook";
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  const select = portal.qs("#rulebookTournamentSelect");

  try {
    rulebookTournaments = await portal.listTournaments({ publicOnly: true });
    const requestedSlug = portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
    const selectedSlug = rulebookTournaments.some(row => row.slug === requestedSlug)
      ? requestedSlug
      : (rulebookTournaments[0]?.slug || cfg.DEFAULT_TOURNAMENT_SLUG);

    if (selectedSlug !== requestedSlug) {
      portal.setSelectedTournamentSlug(selectedSlug, true);
    }

    await loadRulebookTournament(selectedSlug);
    await renderRulebookTournament();

    select?.addEventListener("change", async () => {
      portal.setSelectedTournamentSlug(select.value, true);
      await loadRulebookTournament(select.value);
      await renderRulebookTournament();
    });
  } catch (err) {
    console.error(err);
    const status = portal.qs("#rulebookStatus");
    if (status) status.textContent = err.message || "Could not load rulebook.";
  }
});
