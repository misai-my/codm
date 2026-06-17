let currentProfile = null;
let activeTournament = null;
let scheduleTableAvailable = true;

async function loadProfile() {
  const session = await portal.getSession();
  if (!session?.user) return null;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function showAdminLogin() {
  portal.qs("#adminLoginCard")?.classList.remove("hidden");
  portal.qs("#adminDenied")?.classList.add("hidden");
  portal.qs("#adminMain")?.classList.add("hidden");
  portal.qs("#adminSignOutBtn")?.classList.add("hidden");
}

function showAdminDenied() {
  portal.qs("#adminLoginCard")?.classList.add("hidden");
  portal.qs("#adminDenied")?.classList.remove("hidden");
  portal.qs("#adminMain")?.classList.add("hidden");
  portal.qs("#adminSignOutBtn")?.classList.remove("hidden");
}

function showAdminMain() {
  portal.qs("#adminLoginCard")?.classList.add("hidden");
  portal.qs("#adminDenied")?.classList.add("hidden");
  portal.qs("#adminMain")?.classList.remove("hidden");
  portal.qs("#adminSignOutBtn")?.classList.remove("hidden");
}

async function requireAdmin() {
  const session = await portal.getSession();

  if (!session?.user) {
    showAdminLogin();
    return false;
  }

  currentProfile = await loadProfile();

  if (!currentProfile || String(currentProfile.role).toLowerCase() !== "admin") {
    showAdminDenied();
    return false;
  }

  showAdminMain();
  return true;
}

async function loadTournament() {
  activeTournament = await portal.getActiveTournament(cfg.DEFAULT_TOURNAMENT_SLUG);
  if (!activeTournament) throw new Error(`Tournament not found: ${cfg.DEFAULT_TOURNAMENT_SLUG}`);
}

function tableMissing(error) {
  const msg = String(error?.message || error?.details || error || "").toLowerCase();
  return msg.includes("match_schedules") || msg.includes("schema cache") || msg.includes("could not find the table");
}

async function loadScheduleRows() {
  const scheduleRes = await sb
    .from("match_schedules")
    .select("*")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("schedule_order", { ascending: true })
    .limit(50);

  if (scheduleRes.error) {
    if (tableMissing(scheduleRes.error)) {
      scheduleTableAvailable = false;
      showScheduleSetupWarning();
      return [];
    }
    throw scheduleRes.error;
  }

  scheduleTableAvailable = true;
  hideScheduleSetupWarning();
  return scheduleRes.data || [];
}

async function loadAdminData() {
  const [annRes, resultRes, scheduleRows] = await Promise.all([
    sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(25),
    sb.from("event_results").select("*").order("created_at", { ascending: false }).limit(25),
    loadScheduleRows()
  ]);

  if (annRes.error) throw annRes.error;
  if (resultRes.error) throw resultRes.error;

  renderAnnouncementsTable(annRes.data || []);
  renderResultsTable(resultRes.data || []);
  renderScheduleTable(scheduleRows || []);
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

function renderResultsTable(rows) {
  portal.qs("#resultsTable").innerHTML = rows.map(row => `
    <tr>
      <td>${portal.esc(row.mode || "")}</td>
      <td><strong>${portal.esc(row.title)}</strong><div>${portal.esc(row.team_a || "")} ${row.team_a_score ?? ""} - ${row.team_b_score ?? ""} ${portal.esc(row.team_b || "")}</div></td>
      <td>${row.is_published ? "Published" : "Draft"}</td>
    </tr>
  `).join("") || `<tr><td colspan="3">No results.</td></tr>`;
}

function renderScheduleTable(rows) {
  if (!scheduleTableAvailable) {
    portal.qs("#scheduleTable").innerHTML = `<tr><td colspan="4">Run <strong>supabase_public_event_hub_migration.sql</strong> to enable match schedules.</td></tr>`;
    return;
  }

  portal.qs("#scheduleTable").innerHTML = rows.map(row => `
    <tr>
      <td>${row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "TBD"}</td>
      <td><strong>${portal.esc(row.title || "Match")}</strong><div>${portal.esc(row.team_a || "TBD")} vs ${portal.esc(row.team_b || "TBD")}</div></td>
      <td>${portal.esc(row.mode || "")}</td>
      <td>${row.is_published ? portal.esc(row.status || "Published") : "Draft"}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No schedule.</td></tr>`;
}

function showScheduleSetupWarning() {
  const warning = portal.qs("#scheduleWarning");
  if (!warning) return;
  warning.innerHTML = "The <strong>match_schedules</strong> table is missing. Run <strong>supabase_public_event_hub_migration.sql</strong> in Supabase, then refresh this page.";
  warning.classList.remove("hidden");

  portal.qsa("#scheduleForm input, #scheduleForm select, #scheduleForm textarea, #scheduleForm button").forEach(el => {
    el.disabled = true;
  });
}

function hideScheduleSetupWarning() {
  const warning = portal.qs("#scheduleWarning");
  if (warning) warning.classList.add("hidden");

  portal.qsa("#scheduleForm input, #scheduleForm select, #scheduleForm textarea, #scheduleForm button").forEach(el => {
    el.disabled = false;
  });
}

function localDateTimeToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function wireAdminLoginForm() {
  portal.qs("#adminLoginForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const email = portal.text(portal.qs("#adminLoginEmail")?.value).toLowerCase();
    const status = portal.qs("#adminLoginStatus");
    if (!email) return;

    try {
      status.textContent = "Sending admin login link...";
      status.classList.remove("hidden");
      await portal.sendMagicLink(email, "admin.html");
      status.textContent = "Admin login link sent. Open it on this browser/device.";
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Could not send admin login link.";
    }
  });
}

function wireAdminForms() {
  portal.qs("#announcementForm")?.addEventListener("submit", async event => {
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

  portal.qs("#resultForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const payload = {
      tournament_id: activeTournament?.id,
      title: portal.text(portal.qs("#resultTitle").value),
      mode: portal.qs("#resultMode").value,
      status: portal.qs("#resultStatus").value,
      team_a: portal.text(portal.qs("#teamA").value),
      team_b: portal.text(portal.qs("#teamB").value),
      team_a_score: Number(portal.qs("#teamAScore").value || 0),
      team_b_score: Number(portal.qs("#teamBScore").value || 0),
      is_published: true,
      created_by: currentProfile?.id || null
    };

    const { error } = await sb.from("event_results").insert(payload);
    if (error) throw error;
    event.target.reset();
    portal.toast("Result posted.");
    await loadAdminData();
  });

  portal.qs("#scheduleForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!scheduleTableAvailable) {
      portal.toast("Run the match_schedules SQL migration first.");
      return;
    }

    const payload = {
      tournament_id: activeTournament?.id,
      title: portal.text(portal.qs("#scheduleTitle").value),
      mode: portal.qs("#scheduleMode").value,
      stage: portal.text(portal.qs("#scheduleStage").value),
      team_a: portal.text(portal.qs("#scheduleTeamA").value),
      team_b: portal.text(portal.qs("#scheduleTeamB").value),
      status: portal.text(portal.qs("#scheduleStatus").value) || "Scheduled",
      description: portal.text(portal.qs("#scheduleDescription").value),
      scheduled_at: localDateTimeToIso(portal.qs("#scheduleAt").value),
      schedule_order: Number(portal.qs("#scheduleOrder").value || 100),
      is_published: true,
      created_by: currentProfile?.id || null
    };

    const { error } = await sb.from("match_schedules").insert(payload);
    if (error) throw error;
    event.target.reset();
    portal.toast("Schedule posted.");
    await loadAdminData();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  wireAdminLoginForm();

  try {
    if (!(await requireAdmin())) return;
    await loadTournament();
    await loadAdminData();
    wireAdminForms();
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Admin page failed to load.");
  }
});
