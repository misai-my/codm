let tournament = null;
let dashboardMatchDetails = null;
let dashboardFiltersWired = false;
let faqRows = [];
let publicInquiryRows = [];
let supportWired = false;
let pendingSupportPayload = null;
let pendingSupportForm = null;
let dashboardTournaments = [];


function tournamentRulebookUrl(row) {
  return row?.rulebook_url || row?.rulebook_doc_url || cfg.TOURNAMENT_FALLBACKS?.[row?.slug]?.rulebook_url || cfg.RULEBOOK_URL || "";
}

function tournamentRegistrationUrl(row) {
  return row?.registration_form_url || cfg.TOURNAMENT_FALLBACKS?.[row?.slug]?.registration_form_url || "";
}

function formatTournamentOption(row) {
  return row?.title || row?.slug || "Tournament";
}

function renderDashboardTournamentSelector() {
  const select = portal.qs("#dashboardTournamentSelect");
  if (!select) return;

  const selectedSlug = tournament?.slug || portal.getSelectedTournamentSlug();
  select.innerHTML = dashboardTournaments.length
    ? dashboardTournaments.map(row => `<option value="${portal.esc(row.slug)}">${portal.esc(formatTournamentOption(row))}</option>`).join("")
    : `<option value="${portal.esc(selectedSlug)}">${portal.esc(tournament?.title || selectedSlug)}</option>`;

  select.value = selectedSlug;
}

function syncDashboardTournamentUi() {
  const selectedSlug = tournament?.slug || portal.getSelectedTournamentSlug();
  portal.updateTournamentLinks(document, selectedSlug);
  renderDashboardTournamentSelector();

  document.title = `${tournament?.title || "Event Hub"} · CODM Tournament OS`;

  const regSection = portal.qs("#registration");
  const regLink = portal.qs("#registrationLink");
  const regNote = portal.qs("#registrationCtaNote");
  const registrationUrl = tournamentRegistrationUrl(tournament);

  if (regLink) {
    if (registrationUrl && tournament?.registration_open !== false) {
      regLink.href = registrationUrl;
      regLink.target = "_blank";
      regLink.rel = "noopener noreferrer";
      regLink.classList.remove("hidden");
      if (regNote) regNote.textContent = "Opens the official Google Form in a new tab.";
      regSection?.classList.remove("registration-closed");
    } else {
      regLink.removeAttribute("href");
      regLink.removeAttribute("target");
      regLink.classList.add("hidden");
      if (regNote) regNote.textContent = "Registration information will be announced soon.";
      regSection?.classList.add("registration-closed");
    }
  }
}

async function selectDashboardTournament(slug) {
  const selected = dashboardTournaments.find(row => row.slug === slug);
  portal.setSelectedTournamentSlug(slug, true);
  tournament = selected || await loadTournament(slug);
  await renderDashboardData();
}

function wireDashboardTournamentSelector() {
  const select = portal.qs("#dashboardTournamentSelect");
  if (!select || select.dataset.bound === "true") return;

  select.dataset.bound = "true";
  select.addEventListener("change", async () => {
    try {
      await selectDashboardTournament(select.value);
    } catch (err) {
      console.error(err);
      portal.toast(err.message || "Could not change tournament.");
    }
  });
}

async function loadTournament(slug) {
  const targetSlug = slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
  const row = await portal.getTournamentBySlug(targetSlug);
  if (row) return row;
  return portal.tournamentFallback(targetSlug);
}

async function safeLoadAnnouncements() {
  try {
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
    return { rows: data || [], error: null };
  } catch (err) {
    console.error("Announcements load failed:", err);
    return { rows: [], error: err };
  }
}

async function loadMatchDetails() {
  const slug = tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);

  try {
    const { data, error } = await sb
      .from("match_details")
      .select("*")
      .eq("tournament_slug", slug)
      .eq("is_published", true)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("day_no", { ascending: true, nullsFirst: false })
      .order("round_no", { ascending: true, nullsFirst: false })
      .order("series_no", { ascending: true, nullsFirst: false })
      .order("match_no", { ascending: true, nullsFirst: false })
      .order("map_order", { ascending: true, nullsFirst: false })
      .order("placement", { ascending: true, nullsFirst: false });

    return { rows: data || [], error: error || null, slug };
  } catch (err) {
    console.error("Match details load failed:", err);
    return { rows: [], error: err, slug };
  }
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
    battle_royale_squads: "BR Squad"
  })[value] || value || "Mode";
}

function modeOrder(value) {
  return ({
    MP_1V1: 1,
    MP_TEAM_5V5: 2,
    BR_SOLO: 3,
    BR_SQUAD: 4
  })[value] || 99;
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

function hasFinalData(row) {
  return row.score !== null ||
    row.opponent_score !== null ||
    row.placement !== null ||
    row.total_points !== null ||
    row.eliminations !== null ||
    String(row.status || "").toLowerCase() === "final";
}

function renderAnnouncements(result) {
  const wrap = portal.qs("#announcementList");

  if (result.error) {
    wrap.innerHTML = `<div class="notice notice-warning">Announcements could not load: ${portal.esc(result.error.message || result.error.code || "Unknown error")}</div>`;
    return;
  }

  const items = result.rows || [];
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

function matchErrorNotice(matchResult) {
  if (!matchResult?.error) return "";

  const error = matchResult.error;
  const code = error.code || "";
  const message = error.message || String(error);

  if (code === "42P01" || /does not exist/i.test(message)) {
    return `<div class="notice notice-warning">match_details table is missing. Run <strong>supabase_match_details_schema.sql</strong>.</div>`;
  }

  if (code === "42501" || /permission denied|rls|row-level/i.test(message)) {
    return `<div class="notice notice-warning">match_details exists but public read is blocked. Run the public read policy SQL included in this package.</div>`;
  }

  return `<div class="notice notice-warning">Could not load match details: ${portal.esc(message)}</div>`;
}

function renderSchedule(matchResult) {
  const wrap = portal.qs("#scheduleList");
  const errorNotice = matchErrorNotice(matchResult);
  if (errorNotice) {
    wrap.innerHTML = errorNotice;
    return;
  }

  const rows = (matchResult.rows || []).filter(row => row.is_published !== false)
    .sort((a, b) => modeOrder(a.mode) - modeOrder(b.mode));

  if (!rows.length) {
    wrap.innerHTML = `<div class="notice">No matches found for the selected filters.</div>`;
    return;
  }

  const groups = groupRows(rows, row => {
    if (String(row.mode).startsWith("BR_")) {
      return [row.mode, row.stage, row.day_no, row.bracket, row.round_no, row.match_title, row.scheduled_at].join("|");
    }
    return [row.mode, row.stage, row.day_no, row.bracket, row.series_no, row.match_no, row.match_title, row.scheduled_at].join("|");
  });

  const groupedByMode = groupRows(groups, group => group[0]?.mode || "UNKNOWN");

  wrap.innerHTML = groupedByMode.map(modeGroups => {
    const mode = modeGroups[0][0]?.mode || "UNKNOWN";

    return `
      <div class="match-mode-group">
        <div class="match-mode-title">
          <h3>${portal.esc(modeLabel(mode))}</h3>
          <span class="pill">${modeGroups.length} match group${modeGroups.length === 1 ? "" : "s"}</span>
        </div>
        ${modeGroups.map(group => {
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
        }).join("")}
      </div>
    `;
  }).join("");
}

function mpResultCards(rows) {
  const mpRows = rows.filter(row => String(row.mode).startsWith("MP_") && hasFinalData(row));

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

    const winner = group.find(r => String(r.result).toUpperCase() === "W");

    return `
      <article class="result-card mp-result-card">
        <div class="result-top">
          <div class="result-heading">
            <div class="result-pills">
              <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
              <span class="pill">${portal.esc(row.game_mode || "Map")}</span>
            </div>
            <h3>${portal.esc(title)}</h3>
            <p>${portal.esc(row.map_name || "")}</p>
          </div>
          <span class="pill pill-green">${portal.esc(row.status || "Final")}</span>
        </div>

        <div class="mp-scoreboard">
          <div class="mp-team mp-team-a">
            <span class="mp-team-label">Team / Player A</span>
            <strong>${portal.esc(teamA)}</strong>
          </div>

          <div class="mp-score-box">
            <span class="mp-score-label">Final Score</span>
            <span class="score">${portal.esc(scoreA ?? "-")} <i>:</i> ${portal.esc(scoreB ?? "-")}</span>
          </div>

          <div class="mp-team mp-team-b">
            <span class="mp-team-label">Team / Player B</span>
            <strong>${portal.esc(teamB)}</strong>
          </div>
        </div>

        ${winner ? `<div class="mp-winner"><span>Winner</span><strong>${portal.esc(winner.participant_name || "")}</strong></div>` : ""}
      </article>
    `;
  });
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function brRoundKey(row) {
  return [
    row.day_no ?? "",
    row.bracket ?? "",
    row.round_no ?? "",
    row.match_title ?? "",
    row.map_name ?? "",
    row.scheduled_at ?? ""
  ].join("|");
}

function brRoundOrder(row) {
  const parsedDate = row.scheduled_at ? Date.parse(row.scheduled_at) : NaN;
  if (Number.isFinite(parsedDate)) return parsedDate;

  return (
    numericValue(row.day_no) * 1000000 +
    numericValue(row.round_no) * 1000 +
    numericValue(row.slot)
  );
}

function lastMutualSurvivalDifference(a, b) {
  const commonRounds = [...a.rounds.keys()]
    .filter(key => b.rounds.has(key))
    .map(key => ({
      key,
      order: Math.max(a.rounds.get(key).order, b.rounds.get(key).order)
    }))
    .sort((x, y) => y.order - x.order);

  if (!commonRounds.length) return 0;

  const latest = commonRounds[0].key;
  const aPlacement = numericValue(a.rounds.get(latest).placement) || 9999;
  const bPlacement = numericValue(b.rounds.get(latest).placement) || 9999;

  // Lower placement is the better survival rank.
  return aPlacement - bPlacement;
}

function compareBrStandings(a, b) {
  // Official tie-break order:
  // 1. Total Points
  // 2. Total Victory
  // 3. Total Elimination Points
  // 4. Last Round Survival Rank in the latest common round
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.victories !== a.victories) return b.victories - a.victories;
  if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;

  const survivalDifference = lastMutualSurvivalDifference(a, b);
  if (survivalDifference !== 0) return survivalDifference;

  return a.name.localeCompare(b.name);
}

function buildBrStandings(rows) {
  const entries = new Map();

  rows.forEach(row => {
    const key = String(row.participant_tag || row.participant_name || row.slot || row.id || "").trim();
    if (!key) return;

    if (!entries.has(key)) {
      entries.set(key, {
        key,
        name: row.participant_name || "Entry",
        tag: row.participant_tag || "",
        victories: 0,
        placementPoints: 0,
        eliminationPoints: 0,
        totalPoints: 0,
        rounds: new Map()
      });
    }

    const entry = entries.get(key);
    entry.victories += numericValue(row.victory);
    entry.placementPoints += numericValue(row.placement_points);
    entry.eliminationPoints += numericValue(row.elimination_points);

    const rowTotal = row.total_points === null || row.total_points === undefined || row.total_points === ""
      ? numericValue(row.placement_points) + numericValue(row.elimination_points)
      : numericValue(row.total_points);

    entry.totalPoints += rowTotal;

    const roundKey = brRoundKey(row);
    const currentRound = entry.rounds.get(roundKey);

    // Keep the best available placement for duplicate source rows in the same round.
    const placement = row.placement === null || row.placement === undefined || row.placement === ""
      ? 9999
      : numericValue(row.placement);

    if (!currentRound || placement < currentRound.placement) {
      entry.rounds.set(roundKey, {
        placement,
        order: brRoundOrder(row)
      });
    }
  });

  return [...entries.values()].sort(compareBrStandings);
}

function brResultCards(rows) {
  const brRows = rows.filter(row => String(row.mode).startsWith("BR_") && hasFinalData(row));

  // Aggregate each mode/stage/bracket into standings.
  // When a Day filter is used, the filtered rows naturally become that matchday's standings.
  const brGroups = groupRows(brRows, row =>
    [row.mode, row.stage || "Stage", row.bracket || ""].join("|")
  );

  return brGroups.map(group => {
    const row = group[0];
    const standings = buildBrStandings(group);
    const stage = row.stage || "Stage";
    const bracket = row.bracket ? ` · ${row.bracket}` : "";
    const days = [...new Set(group.map(item => item.day_no).filter(value => value !== null && value !== undefined && value !== ""))];
    const dayLabel = days.length === 1 ? ` · Day ${days[0]}` : "";
    const maps = [...new Set(group.map(item => item.map_name).filter(Boolean))];
    const rounds = [...new Set(group.map(item => item.round_no).filter(value => value !== null && value !== undefined && value !== ""))];

    const title = `${modeLabel(row.mode)} · ${stage}${bracket}${dayLabel}`;
    const subLabel = [
      rounds.length ? `${rounds.length} round${rounds.length === 1 ? "" : "s"}` : "",
      maps.length ? maps.join(", ") : ""
    ].filter(Boolean).join(" · ");

    return `
      <article class="result-card br-standings-card">
        <div class="result-top">
          <div>
            <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
            <span class="pill">${portal.esc(stage)}</span>
            <h3>${portal.esc(title)}</h3>
            <p>${portal.esc(subLabel)}</p>
          </div>
          <span class="pill pill-green">Standings</span>
        </div>

        <div class="br-standings-header" aria-hidden="true">
          <span>Rank</span>
          <span>Team / Player</span>
          <div class="br-header-metrics">
            <span>Victory</span>
            <span>Placement Pts</span>
            <span>Elimination Pts</span>
            <span>Total Pts</span>
          </div>
        </div>

        <div class="br-leaderboard">
          ${standings.map((entry, index) => `
            <div class="br-row br-standings-row">
              <span class="rank">#${index + 1}</span>
              <strong>${portal.esc(entry.name)}${entry.tag ? ` <small>${portal.esc(entry.tag)}</small>` : ""}</strong>
              <div class="br-metrics">
                <span data-label="Victory"><small>Victory</small><b>${portal.esc(entry.victories)}</b></span>
                <span data-label="Placement Pts"><small>Placement Pts</small><b>${portal.esc(entry.placementPoints)}</b></span>
                <span data-label="Elimination Pts"><small>Elimination Pts</small><b>${portal.esc(entry.eliminationPoints)}</b></span>
                <span data-label="Total Pts"><small>Total Pts</small><b>${portal.esc(entry.totalPoints)}</b></span>
              </div>
            </div>
          `).join("")}
        </div>

        <p class="br-tiebreak-note">
          Tiebreak order: Total Victory → Total Elimination Points → Last Round Survival Rank.
        </p>
      </article>
    `;
  });
}

function renderResults(matchResult) {
  const wrap = portal.qs("#resultsList");
  const errorNotice = matchErrorNotice(matchResult);
  if (errorNotice) {
    wrap.innerHTML = errorNotice;
    return;
  }

  const rows = (matchResult.rows || []).filter(row => row.is_published !== false)
    .sort((a, b) => modeOrder(a.mode) - modeOrder(b.mode));

  if (!rows.length) {
    wrap.innerHTML = `<div class="notice">No published results yet.</div>`;
    return;
  }

  const modes = [...new Set(rows.map(row => row.mode).filter(Boolean))].sort((a, b) => modeOrder(a) - modeOrder(b));

  wrap.innerHTML = modes.map(mode => {
    const modeRows = rows.filter(row => row.mode === mode);
    const cards = [...mpResultCards(modeRows), ...brResultCards(modeRows)];

    return `
      <div class="match-mode-group">
        <div class="match-mode-title">
          <h3>${portal.esc(modeLabel(mode))}</h3>
          <span class="pill">${modeRows.length} row${modeRows.length === 1 ? "" : "s"}</span>
        </div>
        ${cards.length ? cards.join("") : `<div class="notice">No finalized ${portal.esc(modeLabel(mode))} results yet.</div>`}
      </div>
    `;
  }).join("");
}


function uniqueSorted(rows, field) {
  return [...new Set(rows.map(row => row[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function setSelectOptions(selectId, values, allLabel, labeler = value => value) {
  const select = portal.qs(`#${selectId}`);
  if (!select) return;

  const current = select.value;
  const optionHtml = [`<option value="">${portal.esc(allLabel)}</option>`]
    .concat(values.map(value => `<option value="${portal.esc(value)}">${portal.esc(labeler(value))}</option>`))
    .join("");

  select.innerHTML = optionHtml;

  if (values.map(String).includes(String(current))) {
    select.value = current;
  }
}

function rowSearchText(row) {
  return [
    modeLabel(row.mode),
    row.mode,
    row.stage,
    row.status,
    row.bracket,
    row.match_title,
    row.game_mode,
    row.map_name,
    row.team_a,
    row.tag_a,
    row.team_b,
    row.tag_b,
    row.participant_name,
    row.participant_tag,
    row.notes
  ].filter(Boolean).join(" ").toLowerCase();
}

function populateDashboardFilters(rows) {
  const modes = uniqueSorted(rows, "mode").sort((a, b) => modeOrder(a) - modeOrder(b));
  const stages = uniqueSorted(rows, "stage");
  const statuses = uniqueSorted(rows, "status");
  const days = uniqueSorted(rows, "day_no");

  ["schedule", "results"].forEach(prefix => {
    setSelectOptions(`${prefix}ModeFilter`, modes, "All Modes", modeLabel);
    setSelectOptions(`${prefix}StageFilter`, stages, "All Stages");
    setSelectOptions(`${prefix}StatusFilter`, statuses, "All Status");
    setSelectOptions(`${prefix}DayFilter`, days, "All Days", value => `Day ${value}`);
  });
}

function currentDashboardFilter(prefix) {
  return {
    mode: portal.qs(`#${prefix}ModeFilter`)?.value || "",
    stage: portal.qs(`#${prefix}StageFilter`)?.value || "",
    status: portal.qs(`#${prefix}StatusFilter`)?.value || "",
    day: portal.qs(`#${prefix}DayFilter`)?.value || "",
    search: (portal.qs(`#${prefix}SearchFilter`)?.value || "").trim().toLowerCase()
  };
}

function applyDashboardFilter(rows, prefix) {
  const filter = currentDashboardFilter(prefix);

  return rows.filter(row => {
    if (filter.mode && String(row.mode) !== filter.mode) return false;
    if (filter.stage && String(row.stage || "") !== filter.stage) return false;
    if (filter.status && String(row.status || "") !== filter.status) return false;
    if (filter.day && String(row.day_no ?? "") !== filter.day) return false;
    if (filter.search && !rowSearchText(row).includes(filter.search)) return false;
    return true;
  });
}

function renderDashboardMatchViews() {
  if (!dashboardMatchDetails) return;

  const baseRows = dashboardMatchDetails.rows || [];
  const scheduleRows = applyDashboardFilter(baseRows, "schedule");
  const resultRows = applyDashboardFilter(baseRows, "results");

  renderSchedule({ ...dashboardMatchDetails, rows: scheduleRows });
  renderResults({ ...dashboardMatchDetails, rows: resultRows });
}

function resetDashboardFilter(prefix) {
  [`${prefix}ModeFilter`, `${prefix}StageFilter`, `${prefix}StatusFilter`, `${prefix}DayFilter`].forEach(id => {
    const el = portal.qs(`#${id}`);
    if (el) el.value = "";
  });

  const search = portal.qs(`#${prefix}SearchFilter`);
  if (search) search.value = "";

  renderDashboardMatchViews();
}

function wireDashboardFilters() {
  if (dashboardFiltersWired) return;
  dashboardFiltersWired = true;

  ["schedule", "results"].forEach(prefix => {
    [`${prefix}ModeFilter`, `${prefix}StageFilter`, `${prefix}StatusFilter`, `${prefix}DayFilter`, `${prefix}SearchFilter`].forEach(id => {
      const el = portal.qs(`#${id}`);
      if (!el) return;
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", renderDashboardMatchViews);
    });

    portal.qs(`#${prefix}FilterReset`)?.addEventListener("click", () => resetDashboardFilter(prefix));
  });
}

function renderRulebook() {
  const url = tournamentRulebookUrl(tournament);
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


async function loadFaqItems() {
  const slug = tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);

  const { data, error } = await sb
    .from("faq_items")
    .select("*")
    .eq("tournament_slug", slug)
    .eq("is_published", true)
    .order("priority_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return { rows: [], missingTable: true };
    throw error;
  }

  return { rows: data || [], missingTable: false };
}

async function loadPublicInquiries() {
  const slug = tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);

  const { data, error } = await sb
    .from("support_inquiries")
    .select("*")
    .eq("tournament_slug", slug)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (error.code === "42P01") return { rows: [], missingTable: true };
    throw error;
  }

  return { rows: data || [], missingTable: false };
}

function populateFaqFilters() {
  const categories = uniqueSorted(faqRows, "category");
  setSelectOptions("faqCategoryFilter", categories, "All Categories");
}

function faqSearchText(row) {
  return [row.question, row.answer, row.category].filter(Boolean).join(" ").toLowerCase();
}

function renderFaqList() {
  const wrap = portal.qs("#faqList");
  if (!wrap) return;

  const category = portal.qs("#faqCategoryFilter")?.value || "";
  const search = (portal.qs("#faqSearchFilter")?.value || "").trim().toLowerCase();

  const rows = faqRows.filter(row => {
    if (category && String(row.category || "") !== category) return false;
    if (search && !faqSearchText(row).includes(search)) return false;
    return true;
  });

  if (!rows.length) {
    wrap.innerHTML = `<div class="notice">No FAQ items found.</div>`;
    return;
  }

  wrap.innerHTML = rows.map(row => `
    <details class="faq-item">
      <summary>
        <span>${portal.esc(row.question)}</span>
        <span class="pill">${portal.esc(row.category || "General")}</span>
      </summary>
      <p>${portal.esc(row.answer)}</p>
    </details>
  `).join("");
}

function renderPublicInquiries() {
  const wrap = portal.qs("#publicInquiryList");
  if (!wrap) return;

  if (!publicInquiryRows.length) {
    wrap.innerHTML = `<div class="notice">No public support answers yet.</div>`;
    return;
  }

  wrap.innerHTML = publicInquiryRows.map(row => `
    <details class="faq-item inquiry-public-item">
      <summary>
        <span>${portal.esc(row.subject)}</span>
        <span class="pill">${portal.esc(row.category || "Support")}</span>
      </summary>
      <p><strong>Question:</strong> ${portal.esc(row.message)}</p>
      <p><strong>Answer:</strong> ${portal.esc(row.published_answer || row.admin_note || "Answered by admin.")}</p>
    </details>
  `).join("");
}

function resetFaqFilters() {
  const cat = portal.qs("#faqCategoryFilter");
  const search = portal.qs("#faqSearchFilter");
  if (cat) cat.value = "";
  if (search) search.value = "";
  renderFaqList();
}

function openSupportGateModal() {
  const modal = portal.qs("#supportGateModal");
  const input = portal.qs("#supportGateInput");
  const status = portal.qs("#supportGateStatus");

  if (!modal) return;
  if (status) {
    status.textContent = "";
    status.classList.add("hidden");
  }
  if (input) input.value = "";

  modal.classList.remove("hidden");
  document.body.classList.add("support-modal-open");
  setTimeout(() => input?.focus(), 50);
}

function closeSupportGateModal() {
  const modal = portal.qs("#supportGateModal");
  modal?.classList.add("hidden");
  document.body.classList.remove("support-modal-open");
}

async function submitPendingSupportInquiry() {
  const status = portal.qs("#supportGateStatus");
  const mainStatus = portal.qs("#supportFormStatus");
  const gate = portal.text(portal.qs("#supportGateInput")?.value).toUpperCase();

  if (!pendingSupportPayload || !pendingSupportForm) return;

  if (gate !== "CODM") {
    status.textContent = "Verification failed. Type CODM exactly.";
    status.classList.remove("hidden");
    return;
  }

  try {
    status.textContent = "Submitting inquiry...";
    status.classList.remove("hidden");

    const { error } = await sb.from("support_inquiries").insert({
      ...pendingSupportPayload,
      gatekeeper_code: gate
    });

    if (error) throw error;

    localStorage.setItem("codm_support_last_submit", String(Date.now()));
    pendingSupportForm.reset();
    pendingSupportPayload = null;
    pendingSupportForm = null;
    closeSupportGateModal();

    if (mainStatus) {
      mainStatus.textContent = "Inquiry submitted. The admin team will review it.";
      mainStatus.classList.remove("hidden");
    }
  } catch (err) {
    console.error(err);
    status.textContent = err.message || "Could not submit inquiry.";
    status.classList.remove("hidden");
  }
}

function wireSupportSection() {
  if (supportWired) return;
  supportWired = true;

  portal.qs("#faqCategoryFilter")?.addEventListener("change", renderFaqList);
  portal.qs("#faqSearchFilter")?.addEventListener("input", renderFaqList);
  portal.qs("#faqFilterReset")?.addEventListener("click", resetFaqFilters);

  portal.qs("#supportForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = portal.qs("#supportFormStatus");
    const lastSubmit = Number(localStorage.getItem("codm_support_last_submit") || 0);
    const now = Date.now();
    const hp = portal.text(portal.qs("#supportWebsite")?.value);

    if (now - lastSubmit < 60000) {
      status.textContent = "Please wait at least 60 seconds before submitting another inquiry.";
      status.classList.remove("hidden");
      return;
    }

    if (hp) return;

    const payload = {
      tournament_slug: tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG),
      tournament_id: tournament?.id || null,
      name: portal.text(portal.qs("#supportName")?.value),
      email: portal.text(portal.qs("#supportEmail")?.value),
      discord: portal.text(portal.qs("#supportDiscord")?.value),
      category: portal.text(portal.qs("#supportCategory")?.value) || "General",
      subject: portal.text(portal.qs("#supportSubject")?.value),
      message: portal.text(portal.qs("#supportMessage")?.value),
      honeypot: hp,
      status: "New",
      is_published: false
    };

    if (payload.message.length < 20) {
      status.textContent = "Please include more details. Minimum 20 characters.";
      status.classList.remove("hidden");
      return;
    }

    pendingSupportPayload = payload;
    pendingSupportForm = event.target;
    openSupportGateModal();
  });

  portal.qs("#supportGateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitPendingSupportInquiry();
  });

  portal.qsa?.("[data-support-gate-close]")?.forEach(button => {
    button.addEventListener("click", closeSupportGateModal);
  });

  // Fallback in case portal does not expose qsa.
  document.querySelectorAll("[data-support-gate-close]").forEach(button => {
    button.addEventListener("click", closeSupportGateModal);
  });
}

async function renderSupportSection() {
  const faqResult = await loadFaqItems();
  const inquiryResult = await loadPublicInquiries();

  faqRows = faqResult.rows || [];
  publicInquiryRows = inquiryResult.rows || [];

  if (faqResult.missingTable || inquiryResult.missingTable) {
    const wrap = portal.qs("#faqList");
    if (wrap) wrap.innerHTML = `<div class="notice notice-warning">FAQ/support tables are not created yet. Run supabase_faq_support_schema.sql.</div>`;
    return;
  }

  populateFaqFilters();
  wireSupportSection();
  renderFaqList();
  renderPublicInquiries();
}

async function renderDashboardData() {
  portal.qs("#portalMeta").textContent = `${tournament?.title || "CODM Tournament OS"} · Public event information hub`;
  syncDashboardTournamentUi();

  renderRulebook();

  const [announcements, matchDetails] = await Promise.all([
    safeLoadAnnouncements(),
    loadMatchDetails()
  ]);

  dashboardMatchDetails = matchDetails;

  renderAnnouncements(announcements);
  populateDashboardFilters(matchDetails.rows || []);
  wireDashboardFilters();
  renderDashboardMatchViews();
  await renderSupportSection();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  try {
    dashboardTournaments = await portal.listTournaments();
    const selectedSlug = portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
    tournament = dashboardTournaments.find(row => row.slug === selectedSlug) || await loadTournament(selectedSlug);

    renderDashboardTournamentSelector();
    wireDashboardTournamentSelector();
    await renderDashboardData();
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Failed to load event hub.");
  }
});