let currentProfile = null;
let activeTournament = null;

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

async function loadMatchDetails() {
  const { data, error } = await sb
    .from("match_details")
    .select("*")
    .eq("tournament_slug", cfg.DEFAULT_TOURNAMENT_SLUG || "main-event")
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
    throw error;
  }

  return data || [];
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
  const scheduleRows = rows.filter(row => row.is_published).slice(0, 40);

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
    row.is_published &&
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

function wireAdminLoginForm() {
  portal.qs("#adminLoginForm")?.addEventListener("submit", async (event) => {
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

function wireAnnouncementForm() {
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

    await loadTournament();
    await loadAdminData();
    wireAnnouncementForm();
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Admin page failed to load.");
  }
});
