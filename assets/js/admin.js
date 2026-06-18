let currentProfile = null;
let activeTournament = null;
let announcementFormWired = false;
let adminMatchRows = [];
let adminFiltersWired = false;

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

async function loadTournament() {
  activeTournament = await portal.getActiveTournament(cfg.DEFAULT_TOURNAMENT_SLUG);
  if (!activeTournament) {
    activeTournament = {
      id: null,
      slug: cfg.DEFAULT_TOURNAMENT_SLUG || "main-event",
      title: cfg.SITE_NAME || "CODM Tournament OS"
    };
  }
}

async function loadMatchDetails() {
  const slug = cfg.DEFAULT_TOURNAMENT_SLUG || "main-event";

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
      portal.qs("#matchTableWarning").innerHTML = `<div class="notice notice-warning">match_details table missing. Run supabase_match_details_schema.sql.</div>`;
      return [];
    }
    if (error.code === "42501") {
      portal.qs("#matchTableWarning").innerHTML = `<div class="notice notice-warning">match_details RLS/public policy issue. Run supabase_match_details_public_read_fix.sql.</div>`;
      return [];
    }
    throw error;
  }

  if (data && data.length) return data;

  const fallback = await sb
    .from("match_details")
    .select("*")
    .eq("is_published", true)
    .order("mode", { ascending: true })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(250);

  if (fallback.error) throw fallback.error;
  return fallback.data || [];
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

function renderAdminMatchPreviews() {
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
  const [annRes, matchRows] = await Promise.all([
    sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(25),
    loadMatchDetails()
  ]);

  if (annRes.error) throw annRes.error;

  adminMatchRows = matchRows || [];

  renderAnnouncementsTable(annRes.data || []);
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

function renderAnnouncementsTable(rows) {
  portal.qs("#announcementsTable").innerHTML = rows.map(row => `
    <tr>
      <td>${portal.esc(row.priority || "Info")}</td>
      <td><strong>${portal.esc(row.title)}</strong><div>${portal.esc(row.body || "")}</div></td>
      <td>${row.is_published ? "Published" : "Draft"}</td>
    </tr>
  `).join("") || `<tr><td colspan="3">No announcements.</td></tr>`;
}

function renderScheduleTable(rows) {
  const scheduleRows = rows.filter(row => row.is_published !== false).slice(0, 40);

  portal.qs("#scheduleTable").innerHTML = scheduleRows.map(row => `
    <tr>
      <td>${portal.esc(modeLabel(row.mode))}</td>
      <td><strong>${portal.esc(row.match_title || row.stage || "Match")}</strong><div>${portal.esc(row.map_name || "")}</div></td>
      <td>${row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "TBD"}</td>
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
  await loadTournament();
  await loadAdminData();
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

function wireAnnouncementForm() {
  if (announcementFormWired) return;
  announcementFormWired = true;

  portal.qs("#announcementForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      tournament_id: activeTournament?.id || null,
      title: portal.text(portal.qs("#announcementTitle").value),
      body: portal.text(portal.qs("#announcementBody").value),
      priority: portal.qs("#announcementPriority").value,
      priority_order: portal.qs("#announcementPriority").value === "Urgent" ? 1 : portal.qs("#announcementPriority").value === "Important" ? 2 : 3,
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: currentProfile?.id || null
    };

    const { error } = await sb.from("announcements").insert(payload);
    if (error) throw error;
    event.target.reset();
    portal.toast("Announcement posted.");
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
