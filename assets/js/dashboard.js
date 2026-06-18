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

async function loadMatchDetails() {
  const slug = tournament?.slug || cfg.DEFAULT_TOURNAMENT_SLUG || "main-event";

  const { data, error } = await sb
    .from("match_details")
    .select("*")
    .eq("tournament_slug", slug)
    .eq("is_published", true)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("day_no", { ascending: true, nullsFirst: false })
    .order("round_no", { ascending: true, nullsFirst: false })
    .order("series_no", { ascending: true, nullsFirst: false })
    .order("map_order", { ascending: true, nullsFirst: false })
    .order("placement", { ascending: true, nullsFirst: false });

  if (error) {
    if (error.code === "42P01") {
      return { missingTable: true, rows: [] };
    }
    throw error;
  }

  return { missingTable: false, rows: data || [] };
}

function modeLabel(value) {
  return ({
    MP_1V1: "MP 1v1",
    MP_TEAM_5V5: "MP Team",
    BR_SOLO: "BR Solo",
    BR_SQUAD: "BR Squad",
    multiplayer_1v1: "MP 1v1",
    multiplayer_5v5: "MP 5v5",
    battle_royale_solo: "BR Solo",
    battle_royale_squads: "BR Squads"
  })[value] || value || "Mode";
}

function groupRows(rows, getKey) {
  const groups = new Map();
  rows.forEach(row => {
    const key = getKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return Array.from(groups.values());
}

function firstFilled(rows, fields) {
  for (const row of rows) {
    for (const field of fields) {
      if (row[field] !== null && row[field] !== undefined && String(row[field]).trim() !== "") return row[field];
    }
  }
  return "";
}

function dateLabel(value) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

function timeLabel(value) {
  if (!value) return "Time TBD";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

function renderSchedule(matchResult) {
  const wrap = portal.qs("#scheduleList");

  if (matchResult.missingTable) {
    wrap.innerHTML = `<div class="notice notice-warning">match_details table is not created yet. Run supabase_match_details_schema.sql in Supabase.</div>`;
    return;
  }

  const rows = matchResult.rows || [];
  if (!rows.length) {
    wrap.innerHTML = `<div class="notice">No published match schedule yet.</div>`;
    return;
  }

  const groups = groupRows(rows, row => {
    if (String(row.mode).startsWith("BR_")) {
      return [row.mode, row.stage, row.day_no, row.bracket, row.round_no, row.match_title, row.scheduled_at].join("|");
    }
    return [row.mode, row.stage, row.day_no, row.bracket, row.series_no, row.match_no, row.match_title, row.scheduled_at].join("|");
  });

  wrap.innerHTML = groups.map(group => {
    const row = group[0];
    const title = row.match_title || `${modeLabel(row.mode)} ${row.series_no ? "Series " + row.series_no : row.round_no ? "Round " + row.round_no : ""}`;
    const scheduledAt = row.scheduled_at;
    const maps = [...new Set(group.map(r => r.map_name).filter(Boolean))];
    const status = firstFilled(group, ["status"]) || "Scheduled";
    const teamA = firstFilled(group, ["team_a"]);
    const teamB = firstFilled(group, ["team_b"]);
    const participantCount = new Set(group.map(r => r.participant_name).filter(Boolean)).size;

    const matchup = String(row.mode).startsWith("BR_")
      ? `${participantCount || group.length} entries${maps.length ? " · " + maps.join(", ") : ""}`
      : `${teamA || "TBD"} vs ${teamB || "TBD"}${maps.length ? " · " + maps.length + " map(s)" : ""}`;

    return `
      <article class="schedule-card">
        <div class="schedule-time">
          <strong>${portal.esc(dateLabel(scheduledAt))}</strong>
          <span>${portal.esc(timeLabel(scheduledAt))}</span>
        </div>
        <div class="schedule-main">
          <div class="schedule-topline">
            <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
            <span class="pill">${portal.esc(row.stage || "Stage")}</span>
            <span class="pill">${portal.esc(status)}</span>
          </div>
          <h3>${portal.esc(title)}</h3>
          <p>${portal.esc(row.notes || "")}</p>
          <div class="schedule-teams">
            <strong>${portal.esc(matchup)}</strong>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function mpResultCards(rows) {
  const mpRows = rows.filter(row =>
    String(row.mode).startsWith("MP_") &&
    (row.result || row.score !== null || row.opponent_score !== null)
  );

  const mapGroups = groupRows(mpRows, row =>
    [row.mode, row.stage, row.day_no, row.bracket, row.series_no, row.match_no, row.match_title, row.map_order, row.game_mode, row.map_name, row.team_a, row.team_b].join("|")
  );

  return mapGroups.map(group => {
    const row = group.find(r => String(r.side).toUpperCase() === "A") || group[0];
    const title = row.match_title || `${modeLabel(row.mode)} Series ${row.series_no || ""}`;
    const teamA = row.team_a || firstFilled(group, ["team_a", "participant_name"]) || "Team A";
    const teamB = row.team_b || firstFilled(group, ["team_b"]) || "Team B";

    let scoreA = row.score;
    let scoreB = row.opponent_score;

    if (String(row.side).toUpperCase() === "B") {
      scoreA = row.opponent_score;
      scoreB = row.score;
    }

    return `
      <article class="result-card">
        <div class="result-top">
          <div>
            <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
            <span class="pill">${portal.esc(row.game_mode || "Map")}</span>
            <h3>${portal.esc(title)}</h3>
            <p>${portal.esc(row.map_name || "")}</p>
          </div>
          <span class="pill pill-green">${portal.esc(row.status || "Final")}</span>
        </div>
        <div class="result-score">
          <div class="result-team"><strong>${portal.esc(teamA)}</strong></div>
          <div class="score">${portal.esc(scoreA ?? "-")} - ${portal.esc(scoreB ?? "-")}</div>
          <div class="result-team"><strong>${portal.esc(teamB)}</strong></div>
        </div>
      </article>
    `;
  });
}

function brResultCards(rows) {
  const brRows = rows.filter(row =>
    String(row.mode).startsWith("BR_") &&
    (row.placement !== null || row.total_points !== null || row.eliminations !== null)
  );

  const brGroups = groupRows(brRows, row =>
    [row.mode, row.stage, row.day_no, row.bracket, row.round_no, row.match_title, row.map_name].join("|")
  );

  return brGroups.map(group => {
    const row = group[0];
    const sorted = [...group].sort((a, b) => {
      const ap = a.placement ?? 9999;
      const bp = b.placement ?? 9999;
      if (ap !== bp) return ap - bp;
      return (b.total_points ?? 0) - (a.total_points ?? 0);
    }).slice(0, 12);

    const title = row.match_title || `${modeLabel(row.mode)} Round ${row.round_no || ""}`;

    return `
      <article class="result-card">
        <div class="result-top">
          <div>
            <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
            <span class="pill">${portal.esc(row.map_name || "Map")}</span>
            <h3>${portal.esc(title)}</h3>
          </div>
          <span class="pill pill-green">${portal.esc(row.status || "Final")}</span>
        </div>
        <div class="br-leaderboard">
          ${sorted.map(entry => `
            <div class="br-row">
              <span class="rank">#${portal.esc(entry.placement ?? "-")}</span>
              <strong>${portal.esc(entry.participant_name || "Entry")}</strong>
              <span>${portal.esc(entry.eliminations ?? 0)} elims</span>
              <span>${portal.esc(entry.total_points ?? 0)} pts</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  });
}

function renderResults(matchResult) {
  const wrap = portal.qs("#resultsList");

  if (matchResult.missingTable) {
    wrap.innerHTML = `<div class="notice notice-warning">match_details table is not created yet. Run supabase_match_details_schema.sql in Supabase.</div>`;
    return;
  }

  const rows = matchResult.rows || [];
  if (!rows.length) {
    wrap.innerHTML = `<div class="notice">No published results yet.</div>`;
    return;
  }

  const cards = [...mpResultCards(rows), ...brResultCards(rows)];
  wrap.innerHTML = cards.length ? cards.join("") : `<div class="notice">No finalized results yet.</div>`;
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

  const [announcements, matchDetails] = await Promise.all([
    loadAnnouncements(),
    loadMatchDetails()
  ]);

  renderAnnouncements(announcements);
  renderSchedule(matchDetails);
  renderResults(matchDetails);
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
