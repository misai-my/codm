let randomizerProfile = null;

async function randomizerLoadProfile() {
 const session = await portal.getSession();
 const user = session?.user;
 if (!user) return null;

 let result = await sb
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .maybeSingle();

 if (result.error) throw result.error;
 if (result.data) return result.data;

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

 return { id: user.id, email, role: "missing_profile" };
}

function randomizerIsAdmin(profile) {
 return String(profile?.role || "").toLowerCase() === "admin";
}

function showRandomizerLogin(message = "") {
 portal.qs("#randomizerLoginCard")?.classList.remove("hidden");
 portal.qs("#randomizerDenied")?.classList.add("hidden");
 portal.qs("#randomizerMain")?.classList.add("hidden");
 portal.qs("#randomizerSignOutBtn")?.classList.add("hidden");
 const status = portal.qs("#randomizerLoginStatus");
 if (status && message) {
  status.textContent = message;
  status.classList.remove("hidden");
 }
}

function showRandomizerDenied() {
 portal.qs("#randomizerLoginCard")?.classList.add("hidden");
 portal.qs("#randomizerDenied")?.classList.remove("hidden");
 portal.qs("#randomizerMain")?.classList.add("hidden");
 portal.qs("#randomizerSignOutBtn")?.classList.remove("hidden");
}

function showRandomizerMain() {
 portal.qs("#randomizerLoginCard")?.classList.add("hidden");
 portal.qs("#randomizerDenied")?.classList.add("hidden");
 portal.qs("#randomizerMain")?.classList.remove("hidden");
 portal.qs("#randomizerSignOutBtn")?.classList.remove("hidden");
}

async function requireRandomizerAdmin() {
 const session = await portal.waitForSession?.() || await portal.getSession();
 if (!session?.user) {
  showRandomizerLogin();
  return false;
 }

 randomizerProfile = await randomizerLoadProfile();
 if (!randomizerIsAdmin(randomizerProfile)) {
  showRandomizerDenied();
  return false;
 }

 showRandomizerMain();
 return true;
}

function wireRandomizerLoginForm() {
 const form = portal.qs("#randomizerLoginForm");
 if (!form || form.dataset.bound === "true") return;
 form.dataset.bound = "true";
 form.addEventListener("submit", async event => {
  event.preventDefault();
  const email = portal.text(portal.qs("#randomizerLoginEmail")?.value);
  const password = portal.qs("#randomizerLoginPassword")?.value || "";
  const status = portal.qs("#randomizerLoginStatus");
  try {
   if (status) {
    status.textContent = "Signing in...";
    status.classList.remove("hidden");
   }
   const { error } = await sb.auth.signInWithPassword({ email, password });
   if (error) throw error;
   if (await requireRandomizerAdmin()) {
    portal.toast("Randomizer ready.");
   }
  } catch (err) {
   console.error(err);
   if (status) {
    status.textContent = err.message || "Login failed.";
    status.classList.remove("hidden");
   }
  }
 });
}

function shuffleArray(items) {
 const output = [...items];
 if (window.crypto?.getRandomValues) {
  for (let i = output.length - 1; i > 0; i -= 1) {
   const value = new Uint32Array(1);
   window.crypto.getRandomValues(value);
   const j = value[0] % (i + 1);
   [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
 }

 for (let i = output.length - 1; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  [output[i], output[j]] = [output[j], output[i]];
 }
 return output;
}

function parseRandomizerNames() {
 const raw = portal.qs("#randomizerInput")?.value || "";
 let names = raw
  .split(/\r?\n/)
  .map(line => portal.text(line))
  .filter(Boolean);

 if (portal.qs("#randomizerRemoveDuplicates")?.checked) {
  const seen = new Set();
  names = names.filter(name => {
   const key = name.toLowerCase();
   if (seen.has(key)) return false;
   seen.add(key);
   return true;
  });
 }

 return names;
}

function groupLabel(index) {
 const prefix = portal.text(portal.qs("#randomizerGroupPrefix")?.value) || "Group";
 return `${prefix} ${index + 1}`;
}

function buildGroups(names, groupCount, distribution) {
 const groups = Array.from({ length: groupCount }, () => []);
 names.forEach((name, index) => {
  let groupIndex = index % groupCount;
  if (distribution === "snake") {
   const row = Math.floor(index / groupCount);
   const position = index % groupCount;
   groupIndex = row % 2 === 0 ? position : groupCount - 1 - position;
  }
  groups[groupIndex].push(name);
 });
 return groups;
}

function toLongTable(groups) {
 const rows = [["Group", "Slot", "Name"]];
 groups.forEach((group, groupIndex) => {
  group.forEach((name, slotIndex) => rows.push([groupLabel(groupIndex), slotIndex + 1, name]));
 });
 return rows.map(row => row.join("\t")).join("\n");
}

function toWideTable(groups) {
 const maxRows = Math.max(0, ...groups.map(group => group.length));
 const rows = [groups.map((_, index) => groupLabel(index))];
 for (let i = 0; i < maxRows; i += 1) {
  rows.push(groups.map(group => group[i] || ""));
 }
 return rows.map(row => row.join("\t")).join("\n");
}

function renderPreview(groups) {
 const preview = portal.qs("#randomizerPreview");
 if (!preview) return;
 preview.innerHTML = groups.map((group, groupIndex) => `
  <div class="group-preview-card">
   <h3>${portal.esc(groupLabel(groupIndex))}</h3>
   <ol>${group.map(name => `<li>${portal.esc(name)}</li>`).join("")}</ol>
  </div>
 `).join("");
}

function generateRandomizedGroups(event) {
 event?.preventDefault?.();
 const names = parseRandomizerNames();
 const groupCount = Math.max(1, Number(portal.qs("#randomizerGroupCount")?.value || 1));
 const output = portal.qs("#randomizerOutput");
 const summary = portal.qs("#randomizerSummary");

 if (!names.length) {
  portal.toast("Paste at least one player or team name.");
  return;
 }

 if (groupCount > names.length) {
  portal.toast("Group count is higher than the number of names. Empty groups will be created.");
 }

 const shuffled = shuffleArray(names);
 const groups = buildGroups(shuffled, groupCount, portal.qs("#randomizerDistribution")?.value || "balanced");
 const format = portal.qs("#randomizerFormat")?.value || "long";

 if (output) output.value = format === "wide" ? toWideTable(groups) : toLongTable(groups);
 if (summary) summary.textContent = `${names.length} names split into ${groupCount} group${groupCount === 1 ? "" : "s"}`;
 renderPreview(groups);
 portal.toast("Groups randomized.");
}

async function copyRandomizerOutput() {
 const output = portal.qs("#randomizerOutput");
 const text = output?.value || "";
 if (!text) {
  portal.toast("No result to copy yet.");
  return;
 }

 try {
  await navigator.clipboard.writeText(text);
  portal.toast("Copied. Paste directly into Google Sheets.");
 } catch (err) {
  output.focus();
  output.select();
  document.execCommand("copy");
  portal.toast("Copied. Paste directly into Google Sheets.");
 }
}

function wireRandomizerTool() {
 portal.qs("#randomizerForm")?.addEventListener("submit", generateRandomizedGroups);
 portal.qs("#randomizerCopyBtn")?.addEventListener("click", copyRandomizerOutput);
 portal.qs("#randomizerClearBtn")?.addEventListener("click", () => {
  const input = portal.qs("#randomizerInput");
  const output = portal.qs("#randomizerOutput");
  const preview = portal.qs("#randomizerPreview");
  const summary = portal.qs("#randomizerSummary");
  if (input) input.value = "";
  if (output) output.value = "";
  if (preview) preview.innerHTML = "";
  if (summary) summary.textContent = "No result yet";
 });
}

document.addEventListener("DOMContentLoaded", async () => {
 if (!portal.requireConfig()) return;
 portal.updateTournamentLinks(document);
 wireRandomizerLoginForm();
 wireRandomizerTool();
 try {
  await requireRandomizerAdmin();
 } catch (err) {
  console.error(err);
  portal.toast(err.message || "Randomizer failed to load.");
 }
});
