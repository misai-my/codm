let tournament = null;
let dashboardMatchDetails = null;
let dashboardFiltersWired = false;
let faqRows = [];
let publicInquiryRows = [];
let supportWired = false;
let pendingSupportPayload = null;
let pendingSupportForm = null;
let dashboardTournaments = [];
let dashboardParticipatingTeams = [];
let dashboardTimelineRows = [];
let teamDirectoryFiltersWired = false;


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


function splitPrizeBreakdownLine(line) {
 const raw = portal.text(line);
 if (!raw) return null;
 const match = raw.match(/^(.+?)\s*(?:\||—|–|-|:)\s*(.+)$/);
 if (!match) return { label: raw, value: "" };
 return { label: portal.text(match[1]), value: portal.text(match[2]) };
}

function renderPrizePool() {
 const wrap = portal.qs("#prizePoolDisplay");
 if (!wrap) return;

 const published = tournament?.prize_pool_published !== false;
 const total = portal.text(tournament?.prize_pool_total);
 const breakdownText = String(tournament?.prize_pool_breakdown || "").trim();
 const hasPrize = Boolean(total || breakdownText);

 if (!published || !hasPrize) {
  wrap.innerHTML = `<div class="notice notice-info">Prize pool details are not available yet.</div>`;
  return;
 }

 const title = portal.text(tournament?.prize_pool_title) || "Tournament Prize Pool";
 const subtitle = portal.text(tournament?.prize_pool_subtitle);
 const note = portal.text(tournament?.prize_pool_note);
 const placementHeader = portal.text(tournament?.prize_pool_placement_header) || "Placement / Award";
 const prizeHeader = portal.text(tournament?.prize_pool_prize_header) || "Prize";
 const rows = breakdownText
  .split(/\r?\n/)
  .map(splitPrizeBreakdownLine)
  .filter(Boolean);

 const table = rows.length ? `
  <div class="prize-breakdown-table-wrap">
   <table class="prize-breakdown-table">
    <thead><tr><th>${portal.esc(placementHeader)}</th><th>${portal.esc(prizeHeader)}</th></tr></thead>
    <tbody>
     ${rows.map(row => `
      <tr>
       <td>${portal.esc(row.label)}</td>
       <td>${row.value ? portal.esc(row.value) : "—"}</td>
      </tr>
     `).join("")}
    </tbody>
   </table>
  </div>
 ` : "";

 wrap.innerHTML = `
  <div class="prize-pool-hero-card">
   <div>
    <div class="eyebrow">Prize Pool</div>
    <h3>${portal.esc(title)}</h3>
    ${subtitle ? `<p>${portal.esc(subtitle)}</p>` : ""}
   </div>
   ${total ? `<div class="prize-pool-total"><span>Total</span><strong>${portal.esc(total)}</strong></div>` : ""}
  </div>
  ${table}
  ${note ? `<div class="notice section-tight">${portal.esc(note).replace(/\r\n|\r|\n/g, "<br>")}</div>` : ""}
 `;
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



function setDashboardSectionCollapsed(section, collapsed) {
 if (!section || !section.matches("[data-collapsible-section]")) return;

 const body = section.querySelector(".dashboard-collapsible-body");
 const toggle = section.querySelector(".section-collapse-toggle");
 const toggleText = section.querySelector(".section-collapse-toggle-text");

 section.classList.toggle("is-collapsed", collapsed);

 if (body) body.hidden = collapsed;
 if (toggle) toggle.setAttribute("aria-expanded", String(!collapsed));
 if (toggleText) toggleText.textContent = collapsed ? "Show" : "Hide";
}

function expandDashboardSectionById(sectionId) {
 const section = document.getElementById(sectionId);
 if (!section || !section.matches("[data-collapsible-section]")) return false;

 setDashboardSectionCollapsed(section, false);
 return true;
}

function scrollToDashboardSection(sectionId, smooth) {
 const section = document.getElementById(sectionId);
 if (!section) return;

 expandDashboardSectionById(sectionId);

 requestAnimationFrame(() => {
  section.scrollIntoView({
   behavior: smooth ? "smooth" : "auto",
   block: "start"
  });
 });
}

function initializeDashboardCollapsibles() {
 document.querySelectorAll("[data-collapsible-section]").forEach(section => {
  const toggle = section.querySelector(".section-collapse-toggle");
  const shouldStartCollapsed = section.classList.contains("is-collapsed");

  setDashboardSectionCollapsed(section, shouldStartCollapsed);

  toggle?.addEventListener("click", () => {
   setDashboardSectionCollapsed(section, !section.classList.contains("is-collapsed"));
  });
 });

 document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
   const sectionId = (link.getAttribute("href") || "").slice(1);
   if (!expandDashboardSectionById(sectionId)) return;

   event.preventDefault();
   window.history.pushState({}, "", `#${sectionId}`);
   scrollToDashboardSection(sectionId, true);
  });
 });

 window.addEventListener("hashchange", () => {
  const sectionId = window.location.hash.replace(/^#/, "");
  if (sectionId) scrollToDashboardSection(sectionId, false);
 });

 const initialSectionId = window.location.hash.replace(/^#/, "");
 if (initialSectionId) {
  setTimeout(() => scrollToDashboardSection(initialSectionId, false), 0);
 }
}



async function loadTournamentTimeline() {
 const slug = tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);

 try {
  const { data, error } = await sb
   .from("v_public_tournament_schedule")
   .select("*")
   .eq("tournament_slug", slug)
   .order("sort_order", { ascending: true })
   .order("start_at", { ascending: true, nullsFirst: false });

  return { rows: data || [], error: error || null };
 } catch (err) {
  console.error("Tournament timeline load failed:", err);
  return { rows: [], error: err };
 }
}

function timelineDateText(row) {
 if (row?.display_date_text) return row.display_date_text;

 if (row?.start_at && row?.end_at) {
  return `${dateLabel(row.start_at)} · ${timeLabel(row.start_at)}–${timeLabel(row.end_at)}`;
 }

 if (row?.start_at) {
  return `${dateLabel(row.start_at)} · ${timeLabel(row.start_at)}`;
 }

 return "Date TBA";
}

function timelineStatusClass(value) {
 const normalized = portal.text(value || "Upcoming").toLowerCase();
 if (normalized === "live") return "is-live";
 if (normalized === "completed") return "is-completed";
 if (normalized === "postponed" || normalized === "cancelled") return "is-muted";
 return "is-upcoming";
}

function renderTournamentTimeline(result) {
 const wrap = portal.qs("#tournamentTimelineList");
 if (!wrap) return;

 if (result?.error) {
  const errorText = portal.text(result.error?.message || "");

  if (/v_public_tournament_schedule|relation .* does not exist|schema cache/i.test(errorText)) {
   wrap.innerHTML = `<div class="notice notice-warning">Tournament timeline is not configured yet. Run <strong>supabase_tournament_timeline_registration_admin.sql</strong> in Supabase first.</div>`;
   return;
  }

  wrap.innerHTML = `<div class="notice notice-warning">Could not load the tournament timeline.</div>`;
  return;
 }

 const rows = result?.rows || [];

 if (!rows.length) {
  wrap.innerHTML = `<div class="notice notice-info">No published timeline items are available for this tournament yet.</div>`;
  return;
 }

 wrap.innerHTML = rows.map(row => `
  <article class="timeline-item ${portal.esc(timelineStatusClass(row.event_status))}">
   <div class="timeline-pin" aria-hidden="true"></div>
   <div class="timeline-card">
    <div class="timeline-meta">
     <span>${portal.esc(row.event_type || "Milestone")}</span>
     <strong>${portal.esc(row.event_status || "Upcoming")}</strong>
    </div>
    <h3>${portal.esc(row.title || "Timeline Item")}</h3>
    <div class="timeline-date">${portal.esc(timelineDateText(row))}</div>
    ${row.location ? `<div class="timeline-location">${portal.esc(row.location)}</div>` : ""}
    ${row.description ? `<p>${portal.esc(row.description)}</p>` : ""}
   </div>
  </article>
 `).join("");
}


async function loadParticipatingTeams() {
 const slug = tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);

 try {
  const { data, error } = await sb
   .from("v_public_participating_teams")
   .select("*")
   .eq("tournament_slug", slug)
   .order("mode", { ascending: true })
   .order("team_name", { ascending: true });

  return { rows: data || [], error: error || null, slug };
 } catch (err) {
  console.error("Participating teams load failed:", err);
  return { rows: [], error: err, slug };
 }
}

function safeTeamRoster(row) {
 const value = row?.players;

 if (Array.isArray(value)) return value;

 if (typeof value === "string") {
  try {
   const parsed = JSON.parse(value);
   return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
   return [];
  }
 }

 return [];
}

function teamSearchText(row) {
 return [
  row?.team_name,
  row?.team_tag,
  row?.mode,
  ...safeTeamRoster(row).map(player => player?.name)
 ].filter(Boolean).join(" ").toLowerCase();
}

function populateTeamDirectoryFilters(rows) {
 const modeSelect = portal.qs("#teamsModeFilter");
 if (!modeSelect) return;

 const currentValue = modeSelect.value;
 const modes = [...new Set(rows.map(row => row.mode).filter(Boolean))]
  .sort((a, b) => modeOrder(a) - modeOrder(b));

 modeSelect.innerHTML =
  '<option value="">All Modes</option>' +
  modes.map(mode => `<option value="${portal.esc(mode)}">${portal.esc(modeLabel(mode))}</option>`).join("");

 modeSelect.value = modes.includes(currentValue) ? currentValue : "";
}

function currentTeamDirectoryFilter() {
 return {
  mode: portal.qs("#teamsModeFilter")?.value || "",
  search: portal.text(portal.qs("#teamsSearchFilter")?.value || "").toLowerCase()
 };
}

function filteredParticipatingTeams(rows) {
 const filter = currentTeamDirectoryFilter();

 return rows.filter(row => {
  if (filter.mode && row.mode !== filter.mode) return false;
  if (filter.search && !teamSearchText(row).includes(filter.search)) return false;
  return true;
 });
}

function teamMonogram(value) {
 const words = portal.text(value).split(/\s+/).filter(Boolean);
 return (words.slice(0, 2).map(word => word[0]).join("") || "TM").toUpperCase();
}

function googleDriveImageUrl(value) {
 const raw = portal.text(value).trim();
 if (!raw) return "";

 let decoded = raw;
 try {
  decoded = decodeURIComponent(raw);
 } catch (error) {
  decoded = raw;
 }

 const fileMatch = decoded.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
 const idMatch = decoded.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
 const foldersMatch = decoded.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/i);
 const fileId = fileMatch?.[1] || idMatch?.[1];

 if (fileId && /(?:drive|docs)\.google\.com/i.test(decoded)) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400`;
 }

 if (foldersMatch) {
  return "";
 }

 return raw;
}

function teamLogoMarkup(row) {
 const label = portal.text(row?.team_name || row?.team_tag || "Team");
 const rawUrl = portal.text(row?.team_logo_url);
 const url = googleDriveImageUrl(rawUrl);

 if (!url) {
  return `<div class="team-directory-logo team-directory-monogram" aria-hidden="true">${portal.esc(teamMonogram(label))}</div>`;
 }

 return `
  <div class="team-directory-logo">
   <img
    src="${portal.esc(url)}"
    alt="${portal.esc(label)} logo"
    title="${portal.esc(label)}"
    loading="lazy"
    referrerpolicy="no-referrer"
    onerror="this.style.display='none';this.parentElement.classList.add('team-directory-monogram');this.parentElement.textContent='${portal.esc(teamMonogram(label))}'"
   />
  </div>
 `;
}

function renderParticipatingTeams(result) {
 const wrap = portal.qs("#participatingTeamsList");
 if (!wrap) return;

 if (result?.error) {
  const errorText = portal.text(result.error?.message || "");

  if (/v_public_participating_teams|relation .* does not exist|schema cache/i.test(errorText)) {
   wrap.innerHTML = `<div class="notice notice-warning">Participating teams are not configured yet. Run <strong>supabase_participating_teams_schema.sql</strong> in Supabase first.</div>`;
   return;
  }

  wrap.innerHTML = `<div class="notice notice-warning">Could not load participating teams for this tournament.</div>`;
  return;
 }

 const rows = filteredParticipatingTeams(result?.rows || []);

 if (!rows.length) {
  wrap.innerHTML = `<div class="notice notice-info">No published participating teams are available for the selected tournament yet.</div>`;
  return;
 }

 const groups = groupRows(
  [...rows].sort((a, b) => {
   const modeDiff = modeOrder(a.mode) - modeOrder(b.mode);
   if (modeDiff !== 0) return modeDiff;
   return portal.text(a.team_name).localeCompare(portal.text(b.team_name));
  }),
  row => row.mode || "Other"
 );

 wrap.innerHTML = groups.map(group => {
  const mode = group[0]?.mode || "Other";

  return `
   <div class="team-mode-group">
    <div class="team-mode-title">
     <span>${portal.esc(modeLabel(mode))}</span>
     <small>${group.length} ${group.length === 1 ? "entry" : "entries"}</small>
    </div>

    <div class="team-mode-grid">
     ${group.map(row => {
      const roster = safeTeamRoster(row)
       .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
       .filter(player => portal.text(player?.name));

      return `
       <article class="team-directory-card">
        <div class="team-directory-card-head">
         ${teamLogoMarkup(row)}
         <div class="team-directory-name">
          <strong>${portal.esc(row.team_name || row.team_tag || "Team")}</strong>
          ${row.team_tag ? `<span>${portal.esc(row.team_tag)}</span>` : ""}
         </div>
        </div>

        <div class="team-roster-label">Roster</div>
        <div class="team-roster">
         ${roster.length
          ? roster.map(player => `<span>${portal.esc(player.name)}</span>`).join("")
          : `<span class="team-roster-empty">Roster pending</span>`
         }
        </div>
       </article>
      `;
     }).join("")}
    </div>
   </div>
  `;
 }).join("");
}

function renderTeamDirectory() {
 renderParticipatingTeams({
  rows: dashboardParticipatingTeams,
  error: dashboardParticipatingTeams?.error || null
 });
}

function resetTeamDirectoryFilters() {
 const mode = portal.qs("#teamsModeFilter");
 const search = portal.qs("#teamsSearchFilter");
 if (mode) mode.value = "";
 if (search) search.value = "";
 renderTeamDirectory();
}

function wireTeamDirectoryFilters() {
 if (teamDirectoryFiltersWired) return;

 const mode = portal.qs("#teamsModeFilter");
 const search = portal.qs("#teamsSearchFilter");
 const reset = portal.qs("#teamsFilterReset");

 mode?.addEventListener("change", renderTeamDirectory);
 search?.addEventListener("input", renderTeamDirectory);
 reset?.addEventListener("click", resetTeamDirectoryFilters);

 teamDirectoryFiltersWired = true;
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

function storedDateTimeParts(value) {
 if (!value) return null;
 const raw = String(value).trim();
 if (!raw) return null;

 // Sheet exports are treated as GMT+8 display times. Do not shift them based on
 // the viewer browser timezone. This accepts both Supabase ISO-looking output
 // and Google Sheets text such as 6/25/2026 6:00 PM.
 const cleaned = raw
  .replace("T", " ")
  .replace(/\.\d+/, "")
  .replace(/Z$/i, "")
  .replace(/[+-]\d{2}:?\d{2}$/, "")
  .trim();

 let match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
 if (match) {
  let hour = match[4] !== undefined ? Number(match[4]) : null;
  const meridiem = match[7] ? String(match[7]).toUpperCase() : "";
  if (hour !== null && meridiem === "PM" && hour < 12) hour += 12;
  if (hour !== null && meridiem === "AM" && hour === 12) hour = 0;
  return {
   date: `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`,
   time: hour !== null && match[5] !== undefined ? `${String(hour).padStart(2, "0")}:${String(match[5]).padStart(2, "0")}` : ""
  };
 }

 match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
 if (!match) return null;

 let hour = match[4] !== undefined ? Number(match[4]) : null;
 const meridiem = match[7] ? String(match[7]).toUpperCase() : "";
 if (hour !== null && meridiem === "PM" && hour < 12) hour += 12;
 if (hour !== null && meridiem === "AM" && hour === 12) hour = 0;

 return {
  date: `${match[3]}-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`,
  time: hour !== null && match[5] !== undefined ? `${String(hour).padStart(2, "0")}:${String(match[5]).padStart(2, "0")}` : ""
 };
}

function dateLabel(value) {
 if (!value) return "TBD";
 const parts = storedDateTimeParts(value);
 if (parts?.date) return parts.date;
 return String(value);
}

function timeLabel(value) {
 if (!value) return "Time TBD";
 const parts = storedDateTimeParts(value);
 if (parts?.time) return `${parts.time} GMT+8`;
 return "GMT+8";
}

function hasFinalData(row) {
 return row.score !== null ||
  row.opponent_score !== null ||
  row.placement !== null ||
  row.total_points !== null ||
  row.eliminations !== null ||
  String(row.status || "").toLowerCase() === "final";
}


function formatMultilineText(value) {
 const text = String(value ?? "");
 return portal.esc(text).replace(/\r\n|\r|\n/g, "<br>");
}

function formatLinkedMultilineText(value) {
 const text = String(value ?? "");
 const urlPattern = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
 let output = "";
 let lastIndex = 0;

 text.replace(urlPattern, (match, _unused, offset) => {
  output += portal.esc(text.slice(lastIndex, offset));

  let urlText = match;
  let trailing = "";
  while (/[.,!?;:]$/.test(urlText)) {
   trailing = urlText.slice(-1) + trailing;
   urlText = urlText.slice(0, -1);
  }

  const href = /^https?:\/\//i.test(urlText) ? urlText : `https://${urlText}`;
  output += `<a href="${portal.esc(href)}" target="_blank" rel="noopener noreferrer">${portal.esc(urlText)}</a>${portal.esc(trailing)}`;
  lastIndex = offset + match.length;
  return match;
 });

 output += portal.esc(text.slice(lastIndex));
 return output.replace(/\r\n|\r|\n/g, "<br>");
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
   <p class="rich-text">${formatMultilineText(item.body)}</p>
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

function mpDisplayName(value, fallback) {
 const text = String(value || "").trim();
 return text || fallback || "Entry";
}

function mpSideName(group, side, fallback) {
 const target = String(side || "").toUpperCase();
 const sideRow = group.find(row => String(row.side || "").toUpperCase() === target);
 if (sideRow) return mpDisplayName(sideRow.participant_name || sideRow.participant_tag, fallback);
 return mpDisplayName(fallback);
}

function sideScoreFromGroup(group, side) {
 const target = String(side || "").toUpperCase();
 const sideRow = group.find(row => String(row.side || "").toUpperCase() === target);
 if (sideRow && sideRow.score !== null && sideRow.score !== undefined && sideRow.score !== "") return numericValue(sideRow.score);

 const reference = group.find(row => String(row.side || "").toUpperCase() === "A") || group[0];
 if (!reference) return 0;

 if (target === "A") return numericValue(reference.score);
 return numericValue(reference.opponent_score);
}

function addMpStandingEntry(entries, name, wins, losses, ties, pointDiff) {
 const key = String(name || "Entry").trim().toLowerCase();
 if (!entries.has(key)) {
  entries.set(key, {
   name: name || "Entry",
   wins: 0,
   losses: 0,
   ties: 0,
   pointDiff: 0
  });
 }

 const entry = entries.get(key);
 entry.wins += wins;
 entry.losses += losses;
 entry.ties += ties;
 entry.pointDiff += pointDiff;
}

function mpMapOutcome(group) {
 const row = group.find(item => String(item.side || "").toUpperCase() === "A") || group[0];
 if (!row) return null;

 const nameA = mpSideName(group, "A", row.team_a || "Player / Team A");
 const nameB = mpSideName(group, "B", row.team_b || "Player / Team B");
 const scoreA = sideScoreFromGroup(group, "A");
 const scoreB = sideScoreFromGroup(group, "B");

 let winA = 0;
 let winB = 0;
 let tie = 0;

 if (scoreA !== scoreB) {
  winA = scoreA > scoreB ? 1 : 0;
  winB = scoreB > scoreA ? 1 : 0;
 } else {
  const winner = group.find(item => String(item.result || "").toUpperCase() === "W");
  const winnerSide = String(winner?.side || "").toUpperCase();
  if (winnerSide === "A") winA = 1;
  if (winnerSide === "B") winB = 1;
  if (!winnerSide) tie = 1;
 }

 return { nameA, nameB, winA, winB, tie };
}

function buildMpStandings(rows) {
 const mpRows = rows.filter(row => String(row.mode).startsWith("MP_") && hasFinalData(row));

 // Result Summary is series-based, not round/map-based.
 // Each BO1/BO3/BO5 series counts as one Win/Loss/Tie in the summary.
 const seriesGroups = groupRows(mpRows, row =>
  [row.mode, row.stage, row.day_no, row.bracket, row.series_no, row.match_no, row.match_title, row.team_a, row.team_b].join("|")
 );
 const entries = new Map();

 seriesGroups.forEach(seriesGroup => {
  const row = seriesGroup.find(item => String(item.side || "").toUpperCase() === "A") || seriesGroup[0];
  if (!row) return;

  const nameA = mpSideName(seriesGroup, "A", row.team_a || "Player / Team A");
  const nameB = mpSideName(seriesGroup, "B", row.team_b || "Player / Team B");

  const mapGroups = groupRows(seriesGroup, item =>
   [item.map_order, item.game_mode, item.map_name, item.team_a, item.team_b].join("|")
  );

  let mapWinsA = 0;
  let mapWinsB = 0;
  let mapTies = 0;

  mapGroups.forEach(mapGroup => {
   const outcome = mpMapOutcome(mapGroup);
   if (!outcome) return;
   mapWinsA += outcome.winA;
   mapWinsB += outcome.winB;
   mapTies += outcome.tie;
  });

  let winA = 0;
  let winB = 0;
  let lossA = 0;
  let lossB = 0;
  let tieA = 0;
  let tieB = 0;

  if (mapWinsA > mapWinsB) {
   winA = 1;
   lossB = 1;
  } else if (mapWinsB > mapWinsA) {
   winB = 1;
   lossA = 1;
  } else {
   const explicitWinner = seriesGroup.find(item => numericValue(item.series_win) > 0 || String(item.result || "").toUpperCase() === "W");
   const winnerSide = String(explicitWinner?.side || "").toUpperCase();
   if (winnerSide === "A") {
    winA = 1;
    lossB = 1;
   } else if (winnerSide === "B") {
    winB = 1;
    lossA = 1;
   } else {
    tieA = 1;
    tieB = 1;
   }
  }

  addMpStandingEntry(entries, nameA, winA, lossA, tieA, 0);
  addMpStandingEntry(entries, nameB, winB, lossB, tieB, 0);
 });

 return [...entries.values()].sort((a, b) =>
  b.wins - a.wins ||
  a.losses - b.losses ||
  b.ties - a.ties ||
  a.name.localeCompare(b.name)
 );
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
  const mapBits = [row.game_mode, row.map_name].filter(Boolean).join(" · ");
  const metaBits = [row.stage, row.day_no ? `Day ${row.day_no}` : "", row.bracket].filter(Boolean).join(" · ");

  return `
   <article class="result-card mp-result-card mp-result-compact-card">
    <div class="mp-compact-result-row">
     <div class="mp-compact-main">
      <div class="mp-compact-tags">
       <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
       ${mapBits ? `<span class="pill">${portal.esc(mapBits)}</span>` : ""}
       <span class="pill pill-green">${portal.esc(row.status || "Final")}</span>
      </div>
      <h3>${portal.esc(title)}</h3>
      ${metaBits ? `<p>${portal.esc(metaBits)}</p>` : ""}
     </div>

     <div class="mp-compact-scoreline" aria-label="Final score">
      <strong class="mp-compact-team">${portal.esc(teamA)}</strong>
      <span class="mp-compact-score">${portal.esc(scoreA ?? "-")} <i>:</i> ${portal.esc(scoreB ?? "-")}</span>
      <strong class="mp-compact-team mp-compact-team-right">${portal.esc(teamB)}</strong>
     </div>

     ${winner ? `<div class="mp-compact-winner"><span>Winner</span><strong>${portal.esc(winner.participant_name || "")}</strong></div>` : ""}
    </div>
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

 // Aggregate each mode/stage/bracket into a true standings table.
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
   <article class="result-card br-standings-card br-table-card">
    <div class="result-top">
     <div>
      <span class="pill pill-gold">${portal.esc(modeLabel(row.mode))}</span>
      <span class="pill">${portal.esc(stage)}</span>
      <h3>${portal.esc(title)}</h3>
      <p>${portal.esc(subLabel)}</p>
     </div>
     <span class="pill pill-green">Standings Table</span>
    </div>

    <div class="br-results-table-wrap">
     <table class="br-results-table">
      <thead>
       <tr>
        <th>Rank</th>
        <th>Team / Player</th>
        <th>Victory</th>
        <th>Placement Pts</th>
        <th>Elimination Pts</th>
        <th>Total Pts</th>
       </tr>
      </thead>
      <tbody>
       ${standings.map((entry, index) => `
        <tr>
         <td class="br-rank">#${index + 1}</td>
         <td class="br-entry"><strong>${portal.esc(entry.name)}</strong>${entry.tag ? ` <small>${portal.esc(entry.tag)}</small>` : ""}</td>
         <td>${portal.esc(entry.victories)}</td>
         <td>${portal.esc(entry.placementPoints)}</td>
         <td>${portal.esc(entry.eliminationPoints)}</td>
         <td class="br-total"><strong>${portal.esc(entry.totalPoints)}</strong></td>
        </tr>
       `).join("")}
      </tbody>
     </table>
    </div>

    <p class="br-tiebreak-note">
     Tiebreak order: Total Points → Total Victory → Total Elimination Points → Last Round Survival Rank.
    </p>
   </article>
  `;
 });
}

function mpResultSummary(rows) {
 const mpRows = rows.filter(row => String(row.mode).startsWith("MP_") && hasFinalData(row));
 const mapGroups = groupRows(mpRows, row =>
  [row.mode, row.stage, row.day_no, row.bracket, row.series_no, row.match_no, row.match_title, row.map_order, row.game_mode, row.map_name, row.team_a, row.team_b].join("|")
 );
 const seriesGroups = groupRows(mpRows, row =>
  [row.mode, row.stage, row.day_no, row.bracket, row.series_no, row.match_no, row.match_title, row.team_a, row.team_b].join("|")
 );
 const winners = new Map();
 mapGroups.forEach(group => {
  const winner = group.find(r => String(r.result).toUpperCase() === "W");
  const name = winner?.participant_name || winner?.team_a || winner?.team_b || "";
  if (!name) return;
  winners.set(name, (winners.get(name) || 0) + 1);
 });
 const topWinner = [...winners.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

 return {
  rows: mpRows.length,
  maps: mapGroups.length,
  series: seriesGroups.length,
  topWinnerName: topWinner?.[0] || "",
  topWinnerMaps: topWinner?.[1] || 0
 };
}

function brResultSummary(rows) {
 const brRows = rows.filter(row => String(row.mode).startsWith("BR_") && hasFinalData(row));
 const brGroups = groupRows(brRows, row =>
  [row.mode, row.stage || "Stage", row.bracket || ""].join("|")
 );

 const leaders = brGroups.map(group => {
  const row = group[0];
  const standings = buildBrStandings(group);
  const leader = standings[0];
  if (!leader) return null;
  return {
   mode: modeLabel(row.mode),
   stage: row.stage || "Stage",
   name: leader.name,
   tag: leader.tag,
   totalPoints: leader.totalPoints
  };
 }).filter(Boolean);

 const entries = new Set(brRows.map(row => row.participant_tag || row.participant_name).filter(Boolean));
 const roundKeys = new Set(brRows.map(brRoundKey).filter(Boolean));

 return {
  rows: brRows.length,
  tables: brGroups.length,
  entries: entries.size,
  rounds: roundKeys.size,
  leaders
 };
}

function resultDiffClass(value) {
 return value > 0 ? "is-positive" : value < 0 ? "is-negative" : "";
}

function buildMpSummaryTable(modeRows) {
 const standings = buildMpStandings(modeRows);
 if (!standings.length) return "";
 const mode = modeRows[0]?.mode || "";
 return `
  <div class="result-summary-table-block">
   <div class="result-summary-table-title">
    <h4>${portal.esc(modeLabel(mode))}</h4>
    <span class="pill">${portal.esc(standings.length)} entries</span>
   </div>
   <div class="match-results-table-wrap result-summary-table-wrap">
    <table class="match-results-table result-summary-table">
     <thead>
      <tr>
       <th>Player / Team Name</th>
       <th>Wins</th>
       <th>Loss</th>
       <th>Tie</th>
      </tr>
     </thead>
     <tbody>
      ${standings.map(entry => `
       <tr>
        <td class="result-entry"><strong>${portal.esc(entry.name)}</strong></td>
        <td>${portal.esc(entry.wins)}</td>
        <td>${portal.esc(entry.losses)}</td>
        <td>${portal.esc(entry.ties || 0)}</td>
       </tr>
      `).join("")}
     </tbody>
    </table>
   </div>
  </div>
 `;
}

function buildBrSummaryTable(modeRows) {
 const standings = buildBrStandings(modeRows);
 if (!standings.length) return "";
 const mode = modeRows[0]?.mode || "";
 return `
  <div class="result-summary-table-block">
   <div class="result-summary-table-title">
    <h4>${portal.esc(modeLabel(mode))}</h4>
    <span class="pill">${portal.esc(standings.length)} entries</span>
   </div>
   <div class="match-results-table-wrap result-summary-table-wrap">
    <table class="match-results-table result-summary-table br-summary-table">
     <thead>
      <tr>
       <th>Rank</th>
       <th>Team / Player</th>
       <th>Victory</th>
       <th>Placement Pts</th>
       <th>Elimination Pts</th>
       <th>Total Pts</th>
      </tr>
     </thead>
     <tbody>
      ${standings.map((entry, index) => `
       <tr>
        <td class="br-rank">#${index + 1}</td>
        <td class="result-entry"><strong>${portal.esc(entry.name)}</strong>${entry.tag ? ` <small>${portal.esc(entry.tag)}</small>` : ""}</td>
        <td>${portal.esc(entry.victories)}</td>
        <td>${portal.esc(entry.placementPoints)}</td>
        <td>${portal.esc(entry.eliminationPoints)}</td>
        <td class="br-total"><strong>${portal.esc(entry.totalPoints)}</strong></td>
       </tr>
      `).join("")}
     </tbody>
    </table>
   </div>
  </div>
 `;
}

function buildResultSummaryHtml(rows) {
 const finalRows = rows.filter(row => hasFinalData(row));
 if (!finalRows.length) return "";

 const modes = [...new Set(finalRows.map(row => row.mode).filter(Boolean))].sort((a, b) => modeOrder(a) - modeOrder(b));
 const summaryTables = modes.map(mode => {
  const modeRows = finalRows.filter(row => row.mode === mode);
  return String(mode).startsWith("BR_") ? buildBrSummaryTable(modeRows) : buildMpSummaryTable(modeRows);
 }).filter(Boolean).join("");

 if (!summaryTables) return "";

 return `
  <section class="result-summary-card" aria-label="Match result summary">
   <div class="result-summary-head">
    <div>
     <span class="eyebrow">Overview</span>
     <h3>Match Result Summary</h3>
     <p>Aggregated table based on the selected Match Results filters.</p>
    </div>
    <span class="pill pill-green">${portal.esc(finalRows.length)} final row${finalRows.length === 1 ? "" : "s"}</span>
   </div>
   <div class="result-summary-table-stack">
    ${summaryTables}
   </div>
   <p class="result-summary-footnote">Result summary is for reference only. It may or may not be used for player/team ranking.</p>
  </section>
 `;
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
 const summaryHtml = buildResultSummaryHtml(rows);

 wrap.innerHTML = summaryHtml + modes.map(mode => {
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

function uniqueSortedMapped(rows, getter) {
 return [...new Set(rows.map(getter).filter(value => value !== null && value !== undefined && String(value).trim() !== ""))]
  .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function isMpMatchMode(mode) {
 return String(mode || "").startsWith("MP_");
}

function roundFilterValue(row) {
 // Sheet-aligned mapping:
 // MP_1V1 / MP_TEAM_5V5 use Series No as the main grouped filter.
 // BR modes keep Round No as the grouped filter.
 if (isMpMatchMode(row.mode)) return row.series_no ?? row.round_no ?? "";
 return row.round_no ?? row.series_no ?? "";
}

function matchFilterValue(row) {
 return row.match_no ?? row.match_title ?? "";
}

function roundFilterLabel(value) {
 return String(value).match(/^\d+$/) ? `Series / Round ${value}` : value;
}

function matchFilterLabel(value) {
 return String(value).match(/^\d+$/) ? `Match ${value}` : value;
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
  row.round_no ? `Round ${row.round_no}` : "",
  row.match_no ? `Match ${row.match_no}` : "",
  row.series_no ? `Series ${row.series_no}` : "",
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
 const rounds = uniqueSortedMapped(rows, roundFilterValue);
 const matches = uniqueSortedMapped(rows, matchFilterValue);

 ["schedule", "results"].forEach(prefix => {
  setSelectOptions(`${prefix}ModeFilter`, modes, "All Modes", modeLabel);
  setSelectOptions(`${prefix}StageFilter`, stages, "All Stages");
  setSelectOptions(`${prefix}StatusFilter`, statuses, "All Status");
  setSelectOptions(`${prefix}DayFilter`, days, "All Days", value => `Day ${value}`);
  setSelectOptions(`${prefix}RoundFilter`, rounds, "All Series / Rounds", roundFilterLabel);
  setSelectOptions(`${prefix}MatchFilter`, matches, "All Matches", matchFilterLabel);
 });
}

function currentDashboardFilter(prefix) {
 return {
  mode: portal.qs(`#${prefix}ModeFilter`)?.value || "",
  stage: portal.qs(`#${prefix}StageFilter`)?.value || "",
  status: portal.qs(`#${prefix}StatusFilter`)?.value || "",
  day: portal.qs(`#${prefix}DayFilter`)?.value || "",
  round: portal.qs(`#${prefix}RoundFilter`)?.value || "",
  match: portal.qs(`#${prefix}MatchFilter`)?.value || "",
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
  if (filter.round && String(roundFilterValue(row)) !== filter.round) return false;
  if (filter.match && String(matchFilterValue(row)) !== filter.match) return false;
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
 [`${prefix}ModeFilter`, `${prefix}StageFilter`, `${prefix}StatusFilter`, `${prefix}DayFilter`, `${prefix}RoundFilter`, `${prefix}MatchFilter`].forEach(id => {
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
  [`${prefix}ModeFilter`, `${prefix}StageFilter`, `${prefix}StatusFilter`, `${prefix}DayFilter`, `${prefix}RoundFilter`, `${prefix}MatchFilter`, `${prefix}SearchFilter`].forEach(id => {
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


function faqCandidateSlugs() {
 const selected = tournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
 return [...new Set([
  selected,
  cfg.DEFAULT_TOURNAMENT_SLUG,
  "community-gladiators-2026-season-2",
  "main-event",
  "codm-v1"
 ].filter(Boolean))];
}

function sortFaqRowsBySlugPriority(rows, slugs) {
 return [...(rows || [])].sort((a, b) => {
  const aSlug = slugs.indexOf(a.tournament_slug);
  const bSlug = slugs.indexOf(b.tournament_slug);
  const aPriority = aSlug === -1 ? 999 : aSlug;
  const bPriority = bSlug === -1 ? 999 : bSlug;
  if (aPriority !== bPriority) return aPriority - bPriority;
  const orderA = Number(a.priority_order ?? 100);
  const orderB = Number(b.priority_order ?? 100);
  if (orderA !== orderB) return orderA - orderB;
  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
 });
}

async function loadFaqItems() {
 const slugs = faqCandidateSlugs();

 const { data, error } = await sb
  .from("faq_items")
  .select("*")
  .in("tournament_slug", slugs)
  .eq("is_published", true)
  .order("priority_order", { ascending: true })
  .order("created_at", { ascending: false });

 if (error) {
  if (error.code === "42P01") return { rows: [], missingTable: true };
  throw error;
 }

 return { rows: sortFaqRowsBySlugPriority(data || [], slugs), missingTable: false };
}

async function loadPublicInquiries() {
 const slugs = faqCandidateSlugs();

 const { data, error } = await sb
  .from("support_inquiries")
  .select("*")
  .in("tournament_slug", slugs)
  .eq("is_published", true)
  .order("created_at", { ascending: false })
  .limit(20);

 if (error) {
  if (error.code === "42P01") return { rows: [], missingTable: true };
  throw error;
 }

 return { rows: sortFaqRowsBySlugPriority(data || [], slugs), missingTable: false };
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
   <p class="rich-text">${formatLinkedMultilineText(row.answer)}</p>
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
   <p class="rich-text"><strong>Question:</strong><br>${formatLinkedMultilineText(row.message)}</p>
   <p class="rich-text"><strong>Answer:</strong><br>${formatLinkedMultilineText(row.published_answer || row.admin_note || "Answered by admin.")}</p>
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
 renderPrizePool();

 renderRulebook();

 const [announcements, timeline, matchDetails, participatingTeams] = await Promise.all([
  safeLoadAnnouncements(),
  loadTournamentTimeline(),
  loadMatchDetails(),
  loadParticipatingTeams()
 ]);

 dashboardMatchDetails = matchDetails;
 dashboardTimelineRows = timeline.rows || [];
 dashboardParticipatingTeams = participatingTeams.rows || [];
 dashboardParticipatingTeams.error = participatingTeams.error || null;

 renderAnnouncements(announcements);
 renderTournamentTimeline(timeline);
 populateDashboardFilters(matchDetails.rows || []);
 wireDashboardFilters();
 renderDashboardMatchViews();

 populateTeamDirectoryFilters(dashboardParticipatingTeams);
 wireTeamDirectoryFilters();
 renderParticipatingTeams(participatingTeams);

 await renderSupportSection();
}

document.addEventListener("DOMContentLoaded", async () => {
 initializeDashboardCollapsibles();
 if (!portal.requireConfig()) return;

 try {
  dashboardTournaments = await portal.listTournaments({ publicOnly: true });
  const requestedSlug = portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
  const selectedSlug = dashboardTournaments.some(row => row.slug === requestedSlug)
   ? requestedSlug
   : (dashboardTournaments[0]?.slug || cfg.DEFAULT_TOURNAMENT_SLUG);

  if (selectedSlug !== requestedSlug) {
   portal.setSelectedTournamentSlug(selectedSlug, true);
  }

  tournament = dashboardTournaments.find(row => row.slug === selectedSlug) || await loadTournament(selectedSlug);

  renderDashboardTournamentSelector();
  wireDashboardTournamentSelector();
  await renderDashboardData();
 } catch (err) {
  console.error(err);
  portal.toast(err.message || "Failed to load event hub.");
 }
});