let tournament = null;

async function loadTournament(slug) {
  const row = await portal.getActiveTournament(slug || cfg.DEFAULT_TOURNAMENT_SLUG);
  if (row) return row;

  return {
    id: null,
    slug: cfg.DEFAULT_TOURNAMENT_SLUG || "main-event",
    title: cfg.SITE_NAME || "CODM Tournament OS",
    rulebook_url: cfg.RULEBOOK_URL || ""
  };
}

async function loadAnnouncements() {
  let query = sb
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("priority_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (tournament?.id) {
    query = query.or(`tournament_id.is.null,tournament_id.eq.${tournament.id}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadSchedule() {
  if (!tournament?.id) return [];

  const { data, error } = await sb
    .from("match_schedules")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("is_published", true)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("schedule_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadResults() {
  if (!tournament?.id) return [];

  const { data, error } = await sb
    .from("event_results")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("is_published", true)
    .order("result_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function modeLabel(value) {
  return ({
    multiplayer_1v1: "MP 1v1",
    multiplayer_5v5: "MP 5v5",
    battle_royale_solo: "BR Solo",
    battle_royale_squads: "BR Squads"
  })[value] || value || "Mode";
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
        <span class="pill">${item.published_at ? new Date(item.published_at).toLocaleString() : "Posted"}</span>
      </div>
      <p>${portal.esc(item.body)}</p>
    </article>
  `).join("");
}

function renderSchedule(items) {
  const wrap = portal.qs("#scheduleList");
  if (!items.length) {
    wrap.innerHTML = `<div class="notice">No published match schedule yet.</div>`;
    return;
  }

  wrap.innerHTML = items.map(item => `
    <article class="schedule-card">
      <div class="schedule-time">
        <strong>${item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "TBD"}</strong>
        <span>${item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Time TBD"}</span>
      </div>
      <div class="schedule-main">
        <div class="schedule-topline">
          <span class="pill pill-gold">${portal.esc(modeLabel(item.mode))}</span>
          <span class="pill">${portal.esc(item.stage || "Stage")}</span>
          <span class="pill">${portal.esc(item.status || "Scheduled")}</span>
        </div>
        <h3>${portal.esc(item.title || "Match")}</h3>
        <p>${portal.esc(item.description || "")}</p>
        <div class="schedule-teams">
          <strong>${portal.esc(item.team_a || "TBD")}</strong>
          <span>vs</span>
          <strong>${portal.esc(item.team_b || "TBD")}</strong>
        </div>
      </div>
    </article>
  `).join("");
}

function renderResults(items) {
  const wrap = portal.qs("#resultsList");
  if (!items.length) {
    wrap.innerHTML = `<div class="notice">No published results yet.</div>`;
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
              <span class="pill pill-gold">${portal.esc(modeLabel(item.mode))}</span>
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
            <span class="pill pill-gold">${portal.esc(modeLabel(item.mode))}</span>
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
  fallback.innerHTML = `<a class="btn btn-primary btn-small" href="${portal.esc(url)}" target="_blank" rel="noopener">Open in Google Docs</a>`;
}

async function renderDashboardData() {
  portal.qs("#portalMeta").textContent = `${tournament?.title || "CODM Tournament OS"} · Public event information hub`;

  renderRulebook();

  const [announcements, schedule, results] = await Promise.all([
    loadAnnouncements(),
    loadSchedule(),
    loadResults()
  ]);

  renderAnnouncements(announcements);
  renderSchedule(schedule);
  renderResults(results);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  try {
    tournament = await loadTournament(cfg.DEFAULT_TOURNAMENT_SLUG);
    await renderDashboardData();
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Failed to load event hub.");
  }
});
