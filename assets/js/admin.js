let currentProfile = null;
let activeTournament = null;
let announcementFormWired = false;

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

async function loadAdminData() {
  const [annRes, matchRows] = await Promise.all([
    sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(25),
    loadMatchDetails()
  ]);

  if (annRes.error) throw annRes.error;

  renderAnnouncementsTable(annRes.data || []);
  renderScheduleTable(matchRows);
  renderResultsTable(matchRows);
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
