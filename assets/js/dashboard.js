let tournament = null;
let dashboardMatchDetails = null;
let dashboardFiltersWired = false;
let faqRows = [];
let publicInquiryRows = [];
let supportWired = false;

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
  const slug = tournament?.slug || cfg.DEFAULT_TOURNAMENT_SLUG || "main-event";

  try {
    let query = sb
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

    const { data, error } = await query;

    if (error) {
      return { rows: [], error, slug };
    }

    if (data && data.length) {
      return { rows: data, error: null, slug };
    }

    // Fallback: if tournament_slug in the rows is different, still show published rows.
    const fallback = await sb
      .from("match_details")
      .select("*")
      .eq("is_published", true)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("mode", { ascending: true })
      .order("day_no", { ascending: true, nullsFirst: false })
      .order("round_no", { ascending: true, nullsFirst: false })
      .order("series_no", { ascending: true, nullsFirst: false })
      .order("map_order", { ascending: true, nullsFirst: false })
      .order("placement", { ascending: true, nullsFirst: false })
      .limit(1000);

    return {
      rows: fallback.data || [],
      error: fallback.error || null,
      slug,
      usedFallback: true
    };
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
        ${winner ? `<p><strong>Winner:</strong> ${portal.esc(winner.participant_name || "")}</p>` : ""}
      </article>
    `;
  });
}

function brResultCards(rows) {
  const brRows = rows.filter(row => String(row.mode).startsWith("BR_") && hasFinalData(row));

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


async function loadFaqItems() {
  const slug = tournament?.slug || cfg.DEFAULT_TOURNAMENT_SLUG || "main-event";

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
  const slug = tournament?.slug || cfg.DEFAULT_TOURNAMENT_SLUG || "main-event";

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

    if (now - lastSubmit < 60000) {
      status.textContent = "Please wait at least 60 seconds before submitting another inquiry.";
      status.classList.remove("hidden");
      return;
    }

    const gate = portal.text(portal.qs("#supportGatekeeper")?.value).toUpperCase();
    const hp = portal.text(portal.qs("#supportWebsite")?.value);

    if (hp) return;

    if (gate !== "CODM") {
      status.textContent = "Gatekeeper failed. Type CODM exactly.";
      status.classList.remove("hidden");
      return;
    }

    const payload = {
      tournament_slug: tournament?.slug || cfg.DEFAULT_TOURNAMENT_SLUG || "main-event",
      tournament_id: tournament?.id || null,
      name: portal.text(portal.qs("#supportName")?.value),
      email: portal.text(portal.qs("#supportEmail")?.value),
      discord: portal.text(portal.qs("#supportDiscord")?.value),
      category: portal.text(portal.qs("#supportCategory")?.value) || "General",
      subject: portal.text(portal.qs("#supportSubject")?.value),
      message: portal.text(portal.qs("#supportMessage")?.value),
      gatekeeper_code: gate,
      honeypot: hp,
      status: "New",
      is_published: false
    };

    if (payload.message.length < 20) {
      status.textContent = "Please include more details. Minimum 20 characters.";
      status.classList.remove("hidden");
      return;
    }

    try {
      status.textContent = "Submitting inquiry...";
      status.classList.remove("hidden");

      const { error } = await sb.from("support_inquiries").insert(payload);
      if (error) throw error;

      localStorage.setItem("codm_support_last_submit", String(now));
      event.target.reset();
      status.textContent = "Inquiry submitted. The admin team will review it.";
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Could not submit inquiry.";
    }
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
    tournament = await loadTournament(cfg.DEFAULT_TOURNAMENT_SLUG);
    await renderDashboardData();
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Failed to load event hub.");
  }
});
