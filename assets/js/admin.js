let currentProfile = null;
let activeTournament = null;
let announcementFormWired = false;
let adminAnnouncementRows = [];
let adminMatchRows = [];
let adminFiltersWired = false;
let faqAdminRows = [];
let inquiryRows = [];
let inquiryFiltersWired = false;
let faqFormWired = false;
let adminTournaments = [];
let adminTimelineRows = [];
let tournamentSettingsWired = false;
let timelineFormWired = false;


function adminTournamentSlug() {
 return activeTournament?.slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
}

function adminTournamentRulebookUrl() {
 return activeTournament?.rulebook_url || activeTournament?.rulebook_doc_url || cfg.TOURNAMENT_FALLBACKS?.[adminTournamentSlug()]?.rulebook_url || cfg.RULEBOOK_URL || "";
}

function renderAdminTournamentSelector() {
 const select = portal.qs("#adminTournamentSelect");
 if (!select) return;

 const selectedSlug = adminTournamentSlug();
 select.innerHTML = adminTournaments.length
  ? adminTournaments.map(row => `<option value="${portal.esc(row.slug)}">${portal.esc(row.title || row.slug)}</option>`).join("")
  : `<option value="${portal.esc(selectedSlug)}">${portal.esc(activeTournament?.title || selectedSlug)}</option>`;

 select.value = selectedSlug;

 const status = portal.qs("#adminTournamentStatus");
 if (status) {
  const state = activeTournament?.status ? ` · ${activeTournament.status}` : "";
  status.textContent = `${activeTournament?.title || selectedSlug}${state}`;
 }

 portal.updateTournamentLinks(document, selectedSlug);
}

async function switchAdminTournament(slug) {
 portal.setSelectedTournamentSlug(slug, true);
 activeTournament = adminTournaments.find(row => row.slug === slug) || await loadTournament(slug);

 adminMatchRows = [];
 adminAnnouncementRows = [];
 faqAdminRows = [];
 inquiryRows = [];
 adminTimelineRows = [];

 renderAdminTournamentSelector();
 renderTournamentSettings();
 renderTimelineTable();
 renderAdminMatchPreviews();
 await loadAdminData();
 await loadFaqAndSupportAdmin();
}

function wireAdminTournamentSelector() {
 const select = portal.qs("#adminTournamentSelect");
 if (!select || select.dataset.bound === "true") return;

 select.dataset.bound = "true";
 select.addEventListener("change", async () => {
  try {
   await switchAdminTournament(select.value);
   portal.toast("Tournament changed.");
  } catch (err) {
   console.error(err);
   portal.toast(err.message || "Could not change tournament.");
  }
 });
}


function storedDateTimeParts(value) {
 if (!value) return null;
 const raw = String(value).trim();
 if (!raw) return null;

 // Admin-entered dates and synced sheet dates are treated as GMT+8 display times.
 // Do not parse with new Date()/toISOString() because that shifts the time based on
 // Apps Script, Supabase, or browser timezone.
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

function toDateTimeLocal(value) {
 const parts = storedDateTimeParts(value);
 if (!parts?.date) return "";
 return `${parts.date}T${parts.time || "00:00"}`;
}

function toGmt8StorageDateTime(value) {
 if (!value) return null;
 const parts = storedDateTimeParts(value);
 if (!parts?.date) return portal.text(value) || null;
 return `${parts.date} ${parts.time || "00:00"}:00`;
}

function dateTimeLabelGmt8(value) {
 const parts = storedDateTimeParts(value);
 if (!parts?.date) return value ? String(value) : "TBA";
 return parts.time ? `${parts.date} ${parts.time} GMT+8` : `${parts.date} GMT+8`;
}

function renderTournamentSettings() {
 const openSelect = portal.qs("#adminRegistrationOpen");
 const formUrl = portal.qs("#adminRegistrationUrl");
 const rulebookUrl = portal.qs("#adminRulebookUrl");
 const status = portal.qs("#tournamentSetupStatus");

 if (openSelect) openSelect.value = activeTournament?.registration_open === false ? "false" : "true";
 if (formUrl) formUrl.value = activeTournament?.registration_form_url || "";
 if (rulebookUrl) rulebookUrl.value = activeTournament?.rulebook_doc_url || activeTournament?.rulebook_url || "";

 if (status) {
  const isOpen = activeTournament?.registration_open !== false;
  status.className = `notice section-tight ${isOpen ? "notice-success" : "notice-warning"}`;
  status.innerHTML = `
   <strong>${portal.esc(activeTournament?.title || adminTournamentSlug())}</strong>
   registration is currently <strong>${isOpen ? "OPEN" : "CLOSED"}</strong>.
  `;
 }
}

async function saveTournamentRegistrationSettings(event) {
 event.preventDefault();

 const payload = {
  registration_open: portal.qs("#adminRegistrationOpen")?.value === "true",
  registration_form_url: portal.text(portal.qs("#adminRegistrationUrl")?.value),
  rulebook_doc_url: portal.text(portal.qs("#adminRulebookUrl")?.value)
 };

 const { data, error } = await sb
  .from("tournaments")
  .update(payload)
  .eq("slug", adminTournamentSlug())
  .select("*")
  .maybeSingle();

 if (error) throw error;

 activeTournament = data || { ...activeTournament, ...payload };
 adminTournaments = adminTournaments.map(row => row.slug === activeTournament.slug ? activeTournament : row);

 renderAdminTournamentSelector();
 renderTournamentSettings();
 portal.updateTournamentLinks(document, adminTournamentSlug());
 portal.toast(payload.registration_open ? "Registration opened." : "Registration closed.");
}

function wireTournamentRegistrationForm() {
 if (tournamentSettingsWired) return;
 tournamentSettingsWired = true;

 portal.qs("#tournamentRegistrationForm")?.addEventListener("submit", async event => {
  try {
   await saveTournamentRegistrationSettings(event);
  } catch (err) {
   console.error(err);
   portal.toast(err.message || "Could not save registration settings.");
  }
 });
}

async function loadAdminTimelineRows() {
 const slug = adminTournamentSlug();

 const { data, error } = await sb
  .from("tournament_schedule_events")
  .select("*")
  .eq("tournament_slug", slug)
  .order("sort_order", { ascending: true })
  .order("start_at", { ascending: true, nullsFirst: false });

 if (error) {
  if (["42P01", "PGRST205"].includes(error.code)) {
   portal.qs("#timelineTable").innerHTML = `
    <tr><td colspan="6">Timeline table missing. Run supabase_tournament_timeline_registration_admin.sql first.</td></tr>
   `;
   return [];
  }

  throw error;
 }

 return data || [];
}

function resetTimelineForm() {
 const form = portal.qs("#timelineForm");
 if (!form) return;

 form.reset();
 portal.qs("#timelineId").value = "";
 portal.qs("#timelineSortOrder").value = "100";
 portal.qs("#timelinePublished").value = "true";
 portal.qs("#timelineType").value = "Registration";
 portal.qs("#timelineStatus").value = "Upcoming";
}

function timelinePayloadFromForm() {
 return {
  tournament_id: activeTournament?.id || null,
  tournament_slug: adminTournamentSlug(),
  title: portal.text(portal.qs("#timelineTitle")?.value),
  event_type: portal.text(portal.qs("#timelineType")?.value) || "General",
  event_status: portal.text(portal.qs("#timelineStatus")?.value) || "Upcoming",
  display_date_text: portal.text(portal.qs("#timelineDisplayDate")?.value),
  start_at: toGmt8StorageDateTime(portal.qs("#timelineStartAt")?.value),
  end_at: toGmt8StorageDateTime(portal.qs("#timelineEndAt")?.value),
  location: portal.text(portal.qs("#timelineLocation")?.value),
  sort_order: Number(portal.qs("#timelineSortOrder")?.value || 100),
  description: portal.text(portal.qs("#timelineDescription")?.value),
  is_published: portal.qs("#timelinePublished")?.value === "true",
  created_by: currentProfile?.id || null,
  updated_at: new Date().toISOString()
 };
}

async function saveTimelineItem(event) {
 event.preventDefault();

 const id = portal.qs("#timelineId")?.value;
 const payload = timelinePayloadFromForm();

 if (!payload.title) {
  portal.toast("Timeline title is required.");
  return;
 }

 if (id) {
  const { error } = await sb
   .from("tournament_schedule_events")
   .update(payload)
   .eq("id", id);

  if (error) throw error;
  portal.toast("Timeline item updated.");
 } else {
  const { error } = await sb
   .from("tournament_schedule_events")
   .insert(payload);

  if (error) throw error;
  portal.toast("Timeline item added.");
 }

 resetTimelineForm();
 adminTimelineRows = await loadAdminTimelineRows();
 renderTimelineTable();
}

function editTimelineItem(row) {
 portal.qs("#timelineId").value = row.id || "";
 portal.qs("#timelineTitle").value = row.title || "";
 portal.qs("#timelineType").value = row.event_type || "General";
 portal.qs("#timelineStatus").value = row.event_status || "Upcoming";
 portal.qs("#timelineDisplayDate").value = row.display_date_text || "";
 portal.qs("#timelineStartAt").value = toDateTimeLocal(row.start_at);
 portal.qs("#timelineEndAt").value = toDateTimeLocal(row.end_at);
 portal.qs("#timelineLocation").value = row.location || "";
 portal.qs("#timelineSortOrder").value = row.sort_order ?? 100;
 portal.qs("#timelineDescription").value = row.description || "";
 portal.qs("#timelinePublished").value = row.is_published === false ? "false" : "true";

 document.getElementById("tournamentSetupAdmin")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function timelineDateLabel(row) {
 if (row.display_date_text) return row.display_date_text;
 if (row.start_at && row.end_at) {
  return `${dateTimeLabelGmt8(row.start_at)} – ${dateTimeLabelGmt8(row.end_at)}`;
 }
 if (row.start_at) return dateTimeLabelGmt8(row.start_at);
 return "TBA";
}

function renderTimelineTable() {
 const table = portal.qs("#timelineTable");
 if (!table) return;

 table.innerHTML = adminTimelineRows.map(row => `
  <tr>
   <td>${Number(row.sort_order ?? 100)}</td>
   <td>
    <strong>${portal.esc(row.title || "Timeline Item")}</strong>
    <div>${portal.esc(row.description || row.location || "")}</div>
   </td>
   <td>${portal.esc(timelineDateLabel(row))}</td>
   <td>${portal.esc(row.event_type || "General")} · ${portal.esc(row.event_status || "Upcoming")}</td>
   <td>${row.is_published ? "Published" : "Draft"}</td>
   <td>
    <div class="table-actions">
     <button class="btn btn-small" type="button" data-timeline-edit="${portal.esc(row.id)}">Edit</button>
     <button class="btn btn-small" type="button" data-timeline-publish="${portal.esc(row.id)}">${row.is_published ? "Hide" : "Publish"}</button>
     <button class="btn btn-small btn-danger" type="button" data-timeline-delete="${portal.esc(row.id)}">Delete</button>
    </div>
   </td>
  </tr>
 `).join("") || `<tr><td colspan="6">No timeline items for this tournament yet.</td></tr>`;

 table.querySelectorAll("[data-timeline-edit]").forEach(button => {
  button.addEventListener("click", () => {
   const row = adminTimelineRows.find(item => item.id === button.dataset.timelineEdit);
   if (row) editTimelineItem(row);
  });
 });

 table.querySelectorAll("[data-timeline-publish]").forEach(button => {
  button.addEventListener("click", async () => {
   const row = adminTimelineRows.find(item => item.id === button.dataset.timelinePublish);
   if (!row) return;

   const { error } = await sb
    .from("tournament_schedule_events")
    .update({
     is_published: !row.is_published,
     updated_at: new Date().toISOString()
    })
    .eq("id", row.id);

   if (error) throw error;
   adminTimelineRows = await loadAdminTimelineRows();
   renderTimelineTable();
   portal.toast(row.is_published ? "Timeline item hidden." : "Timeline item published.");
  });
 });

 table.querySelectorAll("[data-timeline-delete]").forEach(button => {
  button.addEventListener("click", async () => {
   if (!confirm("Delete this timeline item?")) return;

   const { error } = await sb
    .from("tournament_schedule_events")
    .delete()
    .eq("id", button.dataset.timelineDelete);

   if (error) throw error;
   adminTimelineRows = await loadAdminTimelineRows();
   renderTimelineTable();
   portal.toast("Timeline item deleted.");
  });
 });
}

function wireTimelineForm() {
 if (timelineFormWired) return;
 timelineFormWired = true;

 portal.qs("#timelineForm")?.addEventListener("submit", async event => {
  try {
   await saveTimelineItem(event);
  } catch (err) {
   console.error(err);
   portal.toast(err.message || "Could not save timeline item.");
  }
 });

 portal.qs("#timelineCancelEdit")?.addEventListener("click", resetTimelineForm);
}


async function loadProfile() {
 const session = await portal.getSession();
 const user = session?.user;
 if (!user) return null;

 // First try the normal profile lookup by Auth user id.
 let result = await sb
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .maybeSingle();

 if (result.error) throw result.error;
 if (result.data) return result.data;

 // Fallback: some older rows may have email but not the current id.
 const email = String(user.email || "").toLowerCase();
 if (email) {
  result = await sb
   .from("profiles")
   .select("*")
   .eq("email", email)
   .maybeSingle();

  if (result.error) throw result.error;
  if (result.data) return result.data;
 }

 // Return a lightweight profile so the page can show a useful denied message
 // instead of signing out and sending the user to index.html.
 return {
  id: user.id,
  email,
  role: "missing_profile"
 };
}

function isAdminProfile(profile) {
 return String(profile?.role || "").toLowerCase() === "admin";
}

function showAdminLogin(message = "") {
 portal.qs("#adminLoginCard")?.classList.remove("hidden");
 portal.qs("#adminDenied")?.classList.add("hidden");
 portal.qs("#adminMain")?.classList.add("hidden");
 portal.qs("#adminSignOutBtn")?.classList.add("hidden");

 const status = portal.qs("#adminLoginStatus");
 if (status && message) {
  status.textContent = message;
  status.classList.remove("hidden");
 }
}

function showAdminDenied(profile = currentProfile) {
 portal.qs("#adminLoginCard")?.classList.add("hidden");
 portal.qs("#adminDenied")?.classList.remove("hidden");
 portal.qs("#adminMain")?.classList.add("hidden");
 portal.qs("#adminSignOutBtn")?.classList.remove("hidden");

 const denied = portal.qs("#adminDenied");
 if (denied && profile?.email) {
  const sql = `insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower('${profile.email.replaceAll("'", "''")}')
on conflict (id) do update set role = 'admin', email = excluded.email;`;

  const notice = denied.querySelector(".notice");
  if (notice) {
   notice.innerHTML = `
    This account is logged in but is not marked as admin yet.
    <br/><br/>
    Run this in Supabase SQL Editor:
    <br/>
    <code>${portal.esc(sql)}</code>
   `;
  }
 }
}

function showAdminMain() {
 portal.qs("#adminLoginCard")?.classList.add("hidden");
 portal.qs("#adminDenied")?.classList.add("hidden");
 portal.qs("#adminMain")?.classList.remove("hidden");
 portal.qs("#adminSignOutBtn")?.classList.remove("hidden");
}

async function requireAdmin() {
 const session = await portal.waitForSession?.() || await portal.getSession();

 if (!session?.user) {
  showAdminLogin();
  return false;
 }

 currentProfile = await loadProfile();

 if (!isAdminProfile(currentProfile)) {
  showAdminDenied(currentProfile);
  return false;
 }

 showAdminMain();
 return true;
}

async function loadTournament(slug = null) {
 const targetSlug = slug || portal.getSelectedTournamentSlug(cfg.DEFAULT_TOURNAMENT_SLUG);
 activeTournament = await portal.getTournamentBySlug(targetSlug);

 if (!activeTournament) {
  activeTournament = portal.tournamentFallback(targetSlug);
 }

 return activeTournament;
}

async function loadMatchDetails() {
 const slug = adminTournamentSlug();

 // Important: do not fall back to all published records.
 // A tournament with no synced rows must show an empty preview,
 // never another tournament's match data.
 const { data, error } = await sb
  .from("match_details")
  .select("*")
  .eq("tournament_slug", slug)
  .eq("is_published", true)
  .order("scheduled_at", { ascending: true, nullsFirst: false })
  .order("day_no", { ascending: true, nullsFirst: false })
  .order("series_no", { ascending: true, nullsFirst: false })
  .order("round_no", { ascending: true, nullsFirst: false })
  .order("map_order", { ascending: true, nullsFirst: false })
  .limit(250);

 if (error) {
  if (error.code === "42P01") {
   portal.qs("#matchTableWarning").innerHTML = `<div class="notice notice-warning">match_details table missing. Run the Sheet Mirror SQL first.</div>`;
   return [];
  }

  if (error.code === "42501") {
   portal.qs("#matchTableWarning").innerHTML = `<div class="notice notice-warning">match_details RLS issue. Confirm the published-read policy is enabled.</div>`;
   return [];
  }

  throw error;
 }

 return data || [];
}


function uniqueSorted(rows, field) {
 return [...new Set(rows.map(row => row[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== ""))]
  .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function setSelectOptions(selectId, values, allLabel, labeler = value => value) {
 const select = portal.qs(`#${selectId}`);
 if (!select) return;

 const current = select.value;
 select.innerHTML = [`<option value="">${portal.esc(allLabel)}</option>`]
  .concat(values.map(value => `<option value="${portal.esc(value)}">${portal.esc(labeler(value))}</option>`))
  .join("");

 if (values.map(String).includes(String(current))) {
  select.value = current;
 }
}

function adminRowSearchText(row) {
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

function modeOrder(value) {
 return ({
  MP_1V1: 1,
  MP_TEAM_5V5: 2,
  BR_SOLO: 3,
  BR_SQUAD: 4
 })[value] || 99;
}

function populateAdminFilters(rows) {
 const modes = uniqueSorted(rows, "mode").sort((a, b) => modeOrder(a) - modeOrder(b));
 const stages = uniqueSorted(rows, "stage");
 const statuses = uniqueSorted(rows, "status");
 const days = uniqueSorted(rows, "day_no");

 ["adminSchedule", "adminResults"].forEach(prefix => {
  setSelectOptions(`${prefix}ModeFilter`, modes, "All Modes", modeLabel);
  setSelectOptions(`${prefix}StageFilter`, stages, "All Stages");
  setSelectOptions(`${prefix}StatusFilter`, statuses, "All Status");
  setSelectOptions(`${prefix}DayFilter`, days, "All Days", value => `Day ${value}`);
 });
}

function currentAdminFilter(prefix) {
 return {
  mode: portal.qs(`#${prefix}ModeFilter`)?.value || "",
  stage: portal.qs(`#${prefix}StageFilter`)?.value || "",
  status: portal.qs(`#${prefix}StatusFilter`)?.value || "",
  day: portal.qs(`#${prefix}DayFilter`)?.value || "",
  search: (portal.qs(`#${prefix}SearchFilter`)?.value || "").trim().toLowerCase()
 };
}

function applyAdminFilter(rows, prefix) {
 const filter = currentAdminFilter(prefix);

 return rows.filter(row => {
  if (filter.mode && String(row.mode) !== filter.mode) return false;
  if (filter.stage && String(row.stage || "") !== filter.stage) return false;
  if (filter.status && String(row.status || "") !== filter.status) return false;
  if (filter.day && String(row.day_no ?? "") !== filter.day) return false;
  if (filter.search && !adminRowSearchText(row).includes(filter.search)) return false;
  return true;
 });
}


function updateAdminMatchPreviewContext() {
 const title = activeTournament?.title || adminTournamentSlug();
 const label = portal.qs("#matchPreviewTournament");
 const warning = portal.qs("#matchTableWarning");

 if (label) {
  label.textContent = `Showing published data for: ${title}`;
 }

 if (!warning) return;

 if (adminMatchRows.length) {
  warning.innerHTML = "";
  return;
 }

 warning.innerHTML = `
  <div class="notice notice-info">
   No published match data is available for <strong>${portal.esc(title)}</strong> yet.
  </div>
 `;
}

function renderAdminMatchPreviews() {
 updateAdminMatchPreviewContext();
 renderScheduleTable(applyAdminFilter(adminMatchRows, "adminSchedule"));
 renderResultsTable(applyAdminFilter(adminMatchRows, "adminResults"));
}

function resetAdminFilter(prefix) {
 [`${prefix}ModeFilter`, `${prefix}StageFilter`, `${prefix}StatusFilter`, `${prefix}DayFilter`].forEach(id => {
  const el = portal.qs(`#${id}`);
  if (el) el.value = "";
 });

 const search = portal.qs(`#${prefix}SearchFilter`);
 if (search) search.value = "";

 renderAdminMatchPreviews();
}

function wireAdminFilters() {
 if (adminFiltersWired) return;
 adminFiltersWired = true;

 ["adminSchedule", "adminResults"].forEach(prefix => {
  [`${prefix}ModeFilter`, `${prefix}StageFilter`, `${prefix}StatusFilter`, `${prefix}DayFilter`, `${prefix}SearchFilter`].forEach(id => {
   const el = portal.qs(`#${id}`);
   if (!el) return;
   el.addEventListener(el.tagName === "INPUT" ? "input" : "change", renderAdminMatchPreviews);
  });

  portal.qs(`#${prefix}FilterReset`)?.addEventListener("click", () => resetAdminFilter(prefix));
 });
}

async function loadAdminData() {
 let announcementQuery = sb
  .from("announcements")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(25);

 if (activeTournament?.id) {
  announcementQuery = announcementQuery.or(`tournament_id.is.null,tournament_id.eq.${activeTournament.id}`);
 }

 const [annRes, matchRows, timelineRows] = await Promise.all([
  announcementQuery,
  loadMatchDetails(),
  loadAdminTimelineRows()
 ]);

 if (annRes.error) throw annRes.error;

 adminMatchRows = matchRows || [];
 adminTimelineRows = timelineRows || [];

 renderTournamentSettings();
 renderTimelineTable();
 adminAnnouncementRows = annRes.data || [];
 renderAnnouncementsTable(adminAnnouncementRows);
 populateAdminFilters(adminMatchRows);
 wireAdminFilters();
 renderAdminMatchPreviews();
}

function modeLabel(value) {
 return ({
  MP_1V1: "MP 1v1",
  MP_TEAM_5V5: "MP Team",
  BR_SOLO: "BR Solo",
  BR_SQUAD: "BR Squad"
 })[value] || value || "Mode";
}

function resetAnnouncementForm() {
 const form = portal.qs("#announcementForm");
 if (!form) return;

 form.reset();
 portal.qs("#announcementId").value = "";
 portal.qs("#announcementPublished").value = "true";
 portal.qs("#announcementPriority").value = "Info";

 portal.qs("#announcementSubmitButton").textContent = "Publish Announcement";
 portal.qs("#announcementCancelEdit").classList.add("hidden");
 portal.qs("#announcementEditBanner").classList.add("hidden");
}

function priorityOrder(value) {
 return value === "Urgent" ? 1 : value === "Important" ? 2 : 3;
}

function fillAnnouncementForm(row) {
 if (!row) return;

 portal.qs("#announcementId").value = row.id || "";
 portal.qs("#announcementTitle").value = row.title || "";
 portal.qs("#announcementBody").value = row.body || "";
 portal.qs("#announcementPriority").value = row.priority || "Info";
 portal.qs("#announcementPublished").value = row.is_published === false ? "false" : "true";

 portal.qs("#announcementSubmitButton").textContent = "Save Announcement";
 portal.qs("#announcementCancelEdit").classList.remove("hidden");
 portal.qs("#announcementEditBanner").classList.remove("hidden");

 document.getElementById("announcementsAdmin")?.scrollIntoView({
  behavior: "smooth",
  block: "start"
 });
}


function adminFormatMultilineText(value) {
 return portal.esc(String(value ?? "")).replace(/\r\n|\r|\n/g, "<br>");
}

function renderAnnouncementsTable(rows) {
 const table = portal.qs("#announcementsTable");
 if (!table) return;

 table.innerHTML = rows.map(row => `
  <tr>
   <td>${portal.esc(row.priority || "Info")}</td>
   <td>
    <strong>${portal.esc(row.title)}</strong>
    <div class="rich-text">${adminFormatMultilineText(row.body || "")}</div>
    ${row.published_at ? `<small>${new Date(row.published_at).toLocaleString()}</small>` : ""}
   </td>
   <td>${row.is_published ? "Published" : "Draft"}</td>
   <td>
    <div class="table-actions">
     <button class="btn btn-small" type="button" data-announcement-edit="${portal.esc(row.id)}">Edit</button>
     <button class="btn btn-small" type="button" data-announcement-publish="${portal.esc(row.id)}">${row.is_published ? "Hide" : "Publish"}</button>
     <button class="btn btn-small btn-danger" type="button" data-announcement-delete="${portal.esc(row.id)}">Delete</button>
    </div>
   </td>
  </tr>
 `).join("") || `<tr><td colspan="4">No announcements.</td></tr>`;

 table.querySelectorAll("[data-announcement-edit]").forEach(button => {
  button.addEventListener("click", () => {
   const row = adminAnnouncementRows.find(item => item.id === button.dataset.announcementEdit);
   fillAnnouncementForm(row);
  });
 });

 table.querySelectorAll("[data-announcement-publish]").forEach(button => {
  button.addEventListener("click", async () => {
   const row = adminAnnouncementRows.find(item => item.id === button.dataset.announcementPublish);
   if (!row) return;

   const nextPublished = !row.is_published;
   const payload = {
    is_published: nextPublished,
    published_at: nextPublished ? (row.published_at || new Date().toISOString()) : row.published_at
   };

   const { error } = await sb
    .from("announcements")
    .update(payload)
    .eq("id", row.id);

   if (error) throw error;

   portal.toast(nextPublished ? "Announcement published." : "Announcement hidden.");
   await loadAdminData();
  });
 });

 table.querySelectorAll("[data-announcement-delete]").forEach(button => {
  button.addEventListener("click", async () => {
   if (!confirm("Delete this announcement?")) return;

   const { error } = await sb
    .from("announcements")
    .delete()
    .eq("id", button.dataset.announcementDelete);

   if (error) throw error;

   resetAnnouncementForm();
   portal.toast("Announcement deleted.");
   await loadAdminData();
  });
 });
}

function renderScheduleTable(rows) {
 const scheduleRows = rows.filter(row => row.is_published !== false).slice(0, 40);

 portal.qs("#scheduleTable").innerHTML = scheduleRows.map(row => `
  <tr>
   <td>${portal.esc(modeLabel(row.mode))}</td>
   <td><strong>${portal.esc(row.match_title || row.stage || "Match")}</strong><div>${portal.esc(row.map_name || "")}</div></td>
   <td>${row.scheduled_at ? dateTimeLabelGmt8(row.scheduled_at) : "TBD"}</td>
   <td>${portal.esc(row.status || "Scheduled")}</td>
  </tr>
 `).join("") || `<tr><td colspan="4">No synced schedule rows.</td></tr>`;
}

function renderResultsTable(rows) {
 const resultRows = rows.filter(row =>
  row.is_published !== false &&
  (row.score !== null || row.opponent_score !== null || row.placement !== null || row.total_points !== null)
 ).slice(0, 60);

 portal.qs("#resultsTable").innerHTML = resultRows.map(row => {
  const isBr = String(row.mode).startsWith("BR_");
  const resultText = isBr
   ? `#${row.placement ?? "-"} · ${row.eliminations ?? 0} elims · ${row.total_points ?? 0} pts`
   : `${row.score ?? "-"} - ${row.opponent_score ?? "-"} · ${row.result || ""}`;

  return `
   <tr>
    <td>${portal.esc(modeLabel(row.mode))}</td>
    <td><strong>${portal.esc(row.match_title || row.participant_name || "Entry")}</strong><div>${portal.esc(row.participant_name || row.map_name || "")}</div></td>
    <td>${portal.esc(resultText)}</td>
    <td>${portal.esc(row.status || "Final")}</td>
   </tr>
  `;
 }).join("") || `<tr><td colspan="4">No synced result rows.</td></tr>`;
}

async function bootAdminConsole() {
 adminTournaments = await portal.listTournaments({ publicOnly: false });
 await loadTournament();
 renderAdminTournamentSelector();
 wireAdminTournamentSelector();
 await loadAdminData();
 await loadFaqAndSupportAdmin();
 wireTournamentRegistrationForm();
 wireTimelineForm();
 wireAnnouncementForm();
}

function wireAdminLoginForm() {
 portal.qs("#adminLoginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = portal.text(portal.qs("#adminLoginEmail")?.value).toLowerCase();
  const password = portal.qs("#adminLoginPassword")?.value || "";
  const status = portal.qs("#adminLoginStatus");

  if (!email || !password) return;

  try {
   status.textContent = "Checking admin login...";
   status.classList.remove("hidden");

   await portal.signInWithPassword(email, password);
   await portal.waitForSession?.();

   currentProfile = await loadProfile();

   if (!isAdminProfile(currentProfile)) {
    status.textContent = "Login worked, but this account is not marked as admin yet.";
    showAdminDenied(currentProfile);
    return;
   }

   status.textContent = "Login successful. Loading admin console...";
   showAdminMain();
   await bootAdminConsole();
   status.classList.add("hidden");

   // Keep the URL as admin.html without causing a reload/session race.
   if (!/admin\.html$/i.test(location.pathname)) {
    history.replaceState(null, "", "admin.html");
   }
  } catch (err) {
   console.error(err);
   status.textContent = err.message || "Could not login. Check email and password.";
  }
 });
}


async function loadFaqAdminRows() {
 const slug = adminTournamentSlug();
 const { data, error } = await sb
  .from("faq_items")
  .select("*")
  .eq("tournament_slug", slug)
  .order("priority_order", { ascending: true })
  .order("created_at", { ascending: false });

 if (error) {
  if (error.code === "42P01") {
   portal.toast("faq_items table missing. Run supabase_faq_support_schema.sql.");
   return [];
  }
  throw error;
 }
 return data || [];
}

async function loadInquiryRows() {
 const slug = adminTournamentSlug();
 const { data, error } = await sb
  .from("support_inquiries")
  .select("*")
  .eq("tournament_slug", slug)
  .order("created_at", { ascending: false })
  .limit(300);

 if (error) {
  if (error.code === "42P01") {
   portal.toast("support_inquiries table missing. Run supabase_faq_support_schema.sql.");
   return [];
  }
  throw error;
 }
 return data || [];
}

function renderFaqAdminTable() {
 const table = portal.qs("#faqAdminTable");
 if (!table) return;

 table.innerHTML = faqAdminRows.map(row => `
  <tr>
   <td>${portal.esc(row.category || "General")}</td>
   <td><strong>${portal.esc(row.question)}</strong><div class="rich-text">${adminFormatMultilineText(row.answer || "")}</div></td>
   <td>${row.is_published ? "Published" : "Unpublished"}</td>
   <td>
    <div class="table-actions">
     <button class="btn btn-small" data-faq-toggle="${row.id}">${row.is_published ? "Unpublish" : "Publish"}</button>
     <button class="btn btn-danger btn-small" data-faq-delete="${row.id}">Delete</button>
    </div>
   </td>
  </tr>
 `).join("") || `<tr><td colspan="4">No FAQ items.</td></tr>`;

 table.querySelectorAll("[data-faq-toggle]").forEach(btn => {
  btn.addEventListener("click", async () => {
   const row = faqAdminRows.find(item => item.id === btn.dataset.faqToggle);
   if (!row) return;
   const { error } = await sb.from("faq_items").update({
    is_published: !row.is_published,
    updated_at: new Date().toISOString()
   }).eq("id", row.id);
   if (error) throw error;
   faqAdminRows = await loadFaqAdminRows();
   renderFaqAdminTable();
   portal.toast(row.is_published ? "FAQ unpublished." : "FAQ published.");
  });
 });

 table.querySelectorAll("[data-faq-delete]").forEach(btn => {
  btn.addEventListener("click", async () => {
   if (!confirm("Delete this FAQ item?")) return;
   const { error } = await sb.from("faq_items").delete().eq("id", btn.dataset.faqDelete);
   if (error) throw error;
   faqAdminRows = await loadFaqAdminRows();
   renderFaqAdminTable();
   portal.toast("FAQ deleted.");
  });
 });
}

function inquirySearchText(row) {
 return [row.name, row.email, row.discord, row.category, row.subject, row.message, row.status, row.published_answer, row.admin_note]
  .filter(Boolean).join(" ").toLowerCase();
}

function populateInquiryFilters() {
 const statuses = uniqueSorted(inquiryRows, "status");
 const categories = uniqueSorted(inquiryRows, "category");
 setSelectOptions("inquiryStatusFilter", statuses, "All Status");
 setSelectOptions("inquiryCategoryFilter", categories, "All Categories");
}

function filteredInquiries() {
 const status = portal.qs("#inquiryStatusFilter")?.value || "";
 const category = portal.qs("#inquiryCategoryFilter")?.value || "";
 const published = portal.qs("#inquiryPublishedFilter")?.value || "";
 const search = (portal.qs("#inquirySearchFilter")?.value || "").trim().toLowerCase();

 return inquiryRows.filter(row => {
  if (status && String(row.status || "") !== status) return false;
  if (category && String(row.category || "") !== category) return false;
  if (published && String(Boolean(row.is_published)) !== published) return false;
  if (search && !inquirySearchText(row).includes(search)) return false;
  return true;
 });
}

function renderInquiryTable() {
 const table = portal.qs("#inquiriesAdminTable");
 if (!table) return;

 const rows = filteredInquiries();

 table.innerHTML = rows.map(row => `
  <tr>
   <td>
    <strong>${portal.esc(row.subject)}</strong>
    <div>${portal.esc(row.message)}</div>
    <div><span class="pill">${portal.esc(row.category || "General")}</span></div>
   </td>
   <td>
    <strong>${portal.esc(row.name || "")}</strong>
    <div>${portal.esc(row.email || "")}</div>
    <div>${portal.esc(row.discord || "")}</div>
    <small>${row.created_at ? new Date(row.created_at).toLocaleString() : ""}</small>
   </td>
   <td>
    <select class="inline-select" data-inquiry-status="${row.id}">
     ${["New", "Reviewing", "Answered", "Closed", "Spam"].map(status => `<option value="${status}" ${row.status === status ? "selected" : ""}>${status}</option>`).join("")}
    </select>
    <div>${row.is_published ? "Published" : "Unpublished"}</div>
   </td>
   <td>
    <textarea class="inline-answer" data-inquiry-answer="${row.id}" placeholder="Public answer shown when published">${portal.esc(row.published_answer || "")}</textarea>
   </td>
   <td>
    <div class="table-actions">
     <button class="btn btn-small" data-inquiry-save="${row.id}">Save</button>
     <button class="btn btn-small" data-inquiry-toggle="${row.id}">${row.is_published ? "Unpublish" : "Publish"}</button>
     <button class="btn btn-danger btn-small" data-inquiry-delete="${row.id}">Delete</button>
    </div>
   </td>
  </tr>
 `).join("") || `<tr><td colspan="5">No inquiries found.</td></tr>`;

 table.querySelectorAll("[data-inquiry-save]").forEach(btn => {
  btn.addEventListener("click", async () => {
   const id = btn.dataset.inquirySave;
   const status = table.querySelector(`[data-inquiry-status="${id}"]`)?.value || "New";
   const answer = table.querySelector(`[data-inquiry-answer="${id}"]`)?.value || "";

   const { error } = await sb.from("support_inquiries").update({
    status,
    published_answer: answer,
    admin_note: answer,
    updated_at: new Date().toISOString()
   }).eq("id", id);

   if (error) throw error;
   inquiryRows = await loadInquiryRows();
   populateInquiryFilters();
   renderInquiryTable();
   portal.toast("Inquiry saved.");
  });
 });

 table.querySelectorAll("[data-inquiry-toggle]").forEach(btn => {
  btn.addEventListener("click", async () => {
   const row = inquiryRows.find(item => item.id === btn.dataset.inquiryToggle);
   if (!row) return;

   const answer = table.querySelector(`[data-inquiry-answer="${row.id}"]`)?.value || row.published_answer || "";
   if (!row.is_published && !answer.trim()) {
    alert("Add a public answer before publishing this inquiry.");
    return;
   }

   const { error } = await sb.from("support_inquiries").update({
    is_published: !row.is_published,
    status: !row.is_published ? "Answered" : row.status,
    published_answer: answer,
    admin_note: answer,
    updated_at: new Date().toISOString()
   }).eq("id", row.id);

   if (error) throw error;
   inquiryRows = await loadInquiryRows();
   populateInquiryFilters();
   renderInquiryTable();
   portal.toast(row.is_published ? "Inquiry unpublished." : "Inquiry published.");
  });
 });

 table.querySelectorAll("[data-inquiry-delete]").forEach(btn => {
  btn.addEventListener("click", async () => {
   if (!confirm("Delete this inquiry? This cannot be undone.")) return;
   const { error } = await sb.from("support_inquiries").delete().eq("id", btn.dataset.inquiryDelete);
   if (error) throw error;
   inquiryRows = await loadInquiryRows();
   populateInquiryFilters();
   renderInquiryTable();
   portal.toast("Inquiry deleted.");
  });
 });
}

function wireInquiryFilters() {
 if (inquiryFiltersWired) return;
 inquiryFiltersWired = true;

 ["inquiryStatusFilter", "inquiryCategoryFilter", "inquiryPublishedFilter", "inquirySearchFilter"].forEach(id => {
  const el = portal.qs(`#${id}`);
  if (!el) return;
  el.addEventListener(el.tagName === "INPUT" ? "input" : "change", renderInquiryTable);
 });

 portal.qs("#inquiryFilterReset")?.addEventListener("click", () => {
  ["inquiryStatusFilter", "inquiryCategoryFilter", "inquiryPublishedFilter"].forEach(id => {
   const el = portal.qs(`#${id}`);
   if (el) el.value = "";
  });
  const search = portal.qs("#inquirySearchFilter");
  if (search) search.value = "";
  renderInquiryTable();
 });
}

function wireFaqForm() {
 if (faqFormWired) return;
 faqFormWired = true;

 portal.qs("#faqForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const payload = {
   tournament_id: activeTournament?.id || null,
   tournament_slug: adminTournamentSlug(),
   question: portal.text(portal.qs("#faqQuestion")?.value),
   answer: portal.text(portal.qs("#faqAnswer")?.value),
   category: portal.text(portal.qs("#faqCategory")?.value) || "General",
   priority_order: Number(portal.qs("#faqPriority")?.value || 100),
   is_published: portal.qs("#faqPublished")?.value === "true",
   created_by: currentProfile?.id || null,
   updated_at: new Date().toISOString()
  };

  const { error } = await sb.from("faq_items").insert(payload);
  if (error) throw error;

  event.target.reset();
  portal.qs("#faqCategory").value = "General";
  portal.qs("#faqPriority").value = "100";
  faqAdminRows = await loadFaqAdminRows();
  renderFaqAdminTable();
  portal.toast("FAQ saved.");
 });
}

async function loadFaqAndSupportAdmin() {
 [faqAdminRows, inquiryRows] = await Promise.all([
  loadFaqAdminRows(),
  loadInquiryRows()
 ]);

 renderFaqAdminTable();
 populateInquiryFilters();
 wireInquiryFilters();
 renderInquiryTable();
 wireFaqForm();
}

function wireAnnouncementForm() {
 if (announcementFormWired) return;
 announcementFormWired = true;

 portal.qs("#announcementCancelEdit")?.addEventListener("click", resetAnnouncementForm);

 portal.qs("#announcementForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = portal.qs("#announcementId").value;
  const isPublished = portal.qs("#announcementPublished").value === "true";

  const payload = {
   tournament_id: activeTournament?.id || null,
   title: portal.text(portal.qs("#announcementTitle").value),
   body: portal.text(portal.qs("#announcementBody").value),
   priority: portal.qs("#announcementPriority").value,
   priority_order: priorityOrder(portal.qs("#announcementPriority").value),
   is_published: isPublished,
   published_at: isPublished ? new Date().toISOString() : null,
   created_by: currentProfile?.id || null
  };

  if (id) {
   // Do not overwrite the original creator when editing.
   delete payload.created_by;

   const { error } = await sb
    .from("announcements")
    .update(payload)
    .eq("id", id);

   if (error) throw error;

   portal.toast("Announcement updated.");
  } else {
   const { error } = await sb
    .from("announcements")
    .insert(payload);

   if (error) throw error;

   portal.toast(isPublished ? "Announcement posted." : "Announcement saved as draft.");
  }

  resetAnnouncementForm();
  await loadAdminData();
 });
}

document.addEventListener("DOMContentLoaded", async () => {
 if (!portal.requireConfig()) return;

 wireAdminLoginForm();

 try {
  if (!(await requireAdmin())) return;
  await bootAdminConsole();
 } catch (err) {
  console.error(err);
  portal.toast(err.message || "Admin page failed to load.");
 }
});
