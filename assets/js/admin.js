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

async function requireAdmin() {
  currentProfile = await loadProfile();
  if (!currentProfile || String(currentProfile.role).toLowerCase() !== "admin") {
    portal.qs("#adminDenied").classList.remove("hidden");
    portal.qs("#adminMain").classList.add("hidden");
    return false;
  }
  portal.qs("#adminMain").classList.remove("hidden");
  return true;
}

async function loadTournament() {
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("slug", cfg.DEFAULT_TOURNAMENT_SLUG)
    .maybeSingle();

  if (error) throw error;
  activeTournament = data;
}

async function loadAdminData() {
  const [annRes, resultRes, accessRes] = await Promise.all([
    sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(25),
    sb.from("event_results").select("*").order("created_at", { ascending: false }).limit(25),
    sb.from("registered_access").select("*").order("created_at", { ascending: false }).limit(100)
  ]);

  if (annRes.error) throw annRes.error;
  if (resultRes.error) throw resultRes.error;
  if (accessRes.error) throw accessRes.error;

  renderAnnouncementsTable(annRes.data || []);
  renderResultsTable(resultRes.data || []);
  renderAccessTable(accessRes.data || []);
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
      <td><strong>${portal.esc(row.title)}</strong><div>${portal.esc(row.status || "")}</div></td>
      <td>${row.is_published ? "Published" : "Draft"}</td>
    </tr>
  `).join("") || `<tr><td colspan="3">No results.</td></tr>`;
}

function renderAccessTable(rows) {
  portal.qs("#accessTable").innerHTML = rows.map(row => `
    <tr>
      <td>${portal.esc(row.email)}</td>
      <td>${portal.esc(row.full_name || "")}</td>
      <td>${portal.esc(row.team_name || "")}</td>
      <td>${portal.esc(row.mode || "")}</td>
      <td>${portal.esc(row.status || "")}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">No registered access rows.</td></tr>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!portal.requireConfig()) return;

  try {
    if (!(await requireAdmin())) return;
    await loadTournament();
    await loadAdminData();

    portal.qs("#announcementForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        tournament_id: activeTournament?.id || null,
        title: portal.text(portal.qs("#announcementTitle").value),
        body: portal.text(portal.qs("#announcementBody").value),
        priority: portal.qs("#announcementPriority").value,
        priority_order: portal.qs("#announcementPriority").value === "Urgent" ? 1 : portal.qs("#announcementPriority").value === "Important" ? 2 : 3,
        is_published: true,
        published_at: new Date().toISOString()
      };

      const { error } = await sb.from("announcements").insert(payload);
      if (error) throw error;
      event.target.reset();
      portal.toast("Announcement posted.");
      await loadAdminData();
    });

    portal.qs("#resultForm")?.addEventListener("submit", async (event) => {
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
        is_published: true
      };

      const { error } = await sb.from("event_results").insert(payload);
      if (error) throw error;
      event.target.reset();
      portal.toast("Result posted.");
      await loadAdminData();
    });
  } catch (err) {
    console.error(err);
    portal.toast(err.message || "Admin page failed to load.");
  }
});
