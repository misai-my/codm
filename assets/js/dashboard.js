let accessRows = [];
let selectedAccess = null;
let tournament = null;

function accessLabel(row) {
  return [row.team_name, row.mode].filter(Boolean).join(" · ") || row.email;
}

async function loadTournament(slug) {
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("slug", slug || cfg.DEFAULT_TOURNAMENT_SLUG)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function loadAnnouncements() {
  const { data, error } = await sb
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .or(`tournament_id.is.null,tournament_id.eq.${tournament.id}`)
    .order("priority_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadResults() {
  const modes = selectedAccess?.mode ? [selectedAccess.mode] : [];
  let query = sb
    .from("event_results")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("is_published", true)
    .order("result_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (modes.length) query = query.in("mode", modes);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function renderAccessSelector() {
  const wrap = portal.qs("#accessSelectorWrap");
  const select = portal.qs("#accessSelector");

  if (accessRows.length <= 1) {
    wrap.classList.add("hidden");
    return;
  }

  select.innerHTML = accessRows.map(row => `
    <option value="${portal.esc(row.id)}">${portal.esc(accessLabel(row))}</option>
  `).join("");

  select.value = selectedAccess.id;
  wrap.classList.remove("hidden");
  select.addEventListener("change", async () => {
    selectedAccess = accessRows.find(row => row.id === select.value) || accessRows[0];
    await renderDashboardData();
  });
}

function renderAnnouncements(items) {
  const wrap = portal.qs("#announcementList");
  if (!items.length) {
    wrap.innerHTML = `<div class="notice">No announcements posted yet.</div>`;
    return;
  }

  wrap.innerHTML = items.map(item => `
    <article class="announcement-card ${String(item.priority).toLowerCase() === "urgent" ? "is-urgent" : ""}">
      <div class="announcement-top">
        <div>
          <span class="pill ${String(item.priority).toLowerCase() === "urgent" ? "pill-red" : "pill-gold"}">${portal.esc(item.priority || "Info")}</span>
          <h3>${portal.esc(item.title)}</h3>
        </div>
        <span class="pill">${item.published_at ? new Date(item.published_at).toLocaleDateString() : "Posted"}</span>
      </div>
      <p>${portal.esc(item.body)}</p>
    </article>
  `).join("");
}

function renderResults(items) {
  const wrap = portal.qs("#resultsList");
  if (!items.length) {
    wrap.innerHTML = `<div class="notice">No published results for this registration yet.</div>`;
    return;
  }

  wrap.innerHTML = items.map(item => {
    const resultData = item.result_data || {};
    const entries = Array.isArray(resultData.entries) ? resultData.entries : [];

    if (entries.length) {
      return `
        <article class="result-card">
          <div class="result-top">
            <div>
              <span class="pill pill-gold">${portal.esc(item.mode || "Mode")}</span>
              <h3>${portal.esc(item.title)}</h3>
            </div>
            <span class="pill pill-green">${portal.esc(item.status || "Final")}</span>
          </div>
          <div class="grid">
            ${entries.map(entry => `
              <div class="result-score">
                <div class="result-team">
                  <strong>${portal.esc(entry.team || entry.name || "Team")}</strong>
                  <span>${portal.esc(entry.note || "")}</span>
                </div>
                <div class="score">${portal.esc(entry.points ?? entry.score ?? "")}</div>
              </div>
            `).join("")}
          </div>
        </article>
      `;
    }

    return `
      <article class="result-card">
        <div class="result-top">
          <div>
            <span class="pill pill-gold">${portal.esc(item.mode || "Mode")}</span>
            <h3>${portal.esc(item.title)}</h3>
          </div>
          <span class="pill pill-green">${portal.esc(item.status || "Final")}</span>
        </div>
        <div class="result-score">
          <div class="result-team">
            <strong>${portal.esc(item.team_a || "Team A")}</strong>
            <span>${portal.esc(item.team_a_note || "")}</span>
          </div>
          <div class="score">${portal.esc(item.team_a_score ?? "-")} - ${portal.esc(item.team_b_score ?? "-")}</div>
          <div class="result-team">
            <strong>${portal.esc(item.team_b || "Team B")}</strong>
            <span>${portal.esc(item.team_b_note || "")}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderRulebook() {
  const url = tournament?.rulebook_url || cfg.RULEBOOK_URL || "";
  const frame = portal.qs("#rulebookFrame");
  const fallback = portal.qs("#rulebookFallback");

  if (!url) {
    frame.classList.add("hidden");
    fallback.innerHTML = `<div class="notice notice-warning">No rulebook link has been configured yet.</div>`;
    return;
  }

  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const preview = docMatch ? `https://docs.google.com/document/d/${docMatch[1]}/preview?usp=sharing` : url;
  frame.src = preview;
  frame.classList.remove("hidden");
  fallback.innerHTML = `<a class="btn btn-primary btn-small" href="${portal.esc(url)}" target="_blank" rel="noopener">Open Rulebook</a>`;
}

async function renderDashboardData() {
  portal.qs("#portalMeta").textContent = `${selectedAccess.email} · ${accessLabel(selectedAccess)}`;
  renderRulebook();

  const [announcements, results] = await Promise.all([
    loadAnnouncements(),
    loadResults()
  ]);

  renderAnnouncements(announcements);
  renderResults(results);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  try {
    const { session, email, access } = await portal.currentUserAccess();

    if (!session?.user) {
      location.href = "index.html";
      return;
    }

    accessRows = access;

    if (!accessRows.length) {
      portal.qs("#accessDenied").classList.remove("hidden");
      portal.qs("#dashboardMain").classList.add("hidden");
      portal.qs("#deniedEmail").textContent = email;
      return;
    }

    selectedAccess = accessRows[0];
    tournament = await loadTournament(selectedAccess.tournament_slug || cfg.DEFAULT_TOURNAMENT_SLUG);

    portal.qs("#dashboardMain").classList.remove("hidden");
    portal.qs("#welcomeName").textContent = selectedAccess.full_name || selectedAccess.email;
    portal.qs("#tournamentName").textContent = tournament?.title || cfg.SITE_NAME;

    renderAccessSelector();
    await renderDashboardData();
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Failed to load dashboard.");
  }
});
