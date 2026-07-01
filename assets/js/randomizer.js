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

function randomizerTimestamp() {
 return new Date().toLocaleString("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
 }).replace(",", "") + " GMT+8";
}

function randomizerHash(text) {
 let hash = 2166136261;
 const input = String(text || "");
 for (let i = 0; i < input.length; i += 1) {
  hash ^= input.charCodeAt(i);
  hash = Math.imul(hash, 16777619);
 }
 return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function getRandomizerEntropySource() {
 return window.crypto?.getRandomValues ? "window.crypto.getRandomValues / Fisher-Yates" : "Math.random fallback / Fisher-Yates";
}

function buildRandomizerSystemLog({ rawNames, names, shuffled, groups, groupCount, distribution, format, duplicatesRemoved }) {
 const prefix = portal.text(portal.qs("#randomizerGroupPrefix")?.value) || "Group";
 const duplicateMode = portal.qs("#randomizerRemoveDuplicates")?.checked ? "ENABLED" : "DISABLED";
 const adminEmail = randomizerProfile?.email || "admin-session";
 const inputHash = randomizerHash(rawNames.join("|"));
 const shuffleHash = randomizerHash(shuffled.join("|"));
 const assignmentHash = randomizerHash(groups.map((group, index) => `${groupLabel(index)}:${group.join(",")}`).join("|"));
 const groupSizes = groups.map((group, index) => `${groupLabel(index)}=${group.length}`).join("; ");
 const lines = [];

 lines.push("[CODM-TOURNAMENT-OS::RANDOMIZER_AUDIT_LOG]");
 lines.push(`run_timestamp_gmt8       = ${randomizerTimestamp()}`);
 lines.push(`operator                 = ${adminEmail}`);
 lines.push(`tool                     = admin/randomizer.html`);
 lines.push(`run_id                   = RND-${Date.now().toString(36).toUpperCase()}-${assignmentHash.slice(0, 6)}`);
 lines.push("------------------------------------------------------------");
 lines.push("[INPUT_SCAN]");
 lines.push(`raw_line_count           = ${rawNames.length}`);
 lines.push(`valid_entry_count        = ${names.length}`);
 lines.push(`duplicate_filter         = ${duplicateMode}`);
 lines.push(`duplicates_removed       = ${duplicatesRemoved}`);
 lines.push(`input_checksum           = ${inputHash}`);
 lines.push("------------------------------------------------------------");
 lines.push("[RANDOMIZATION_ENGINE]");
 lines.push(`shuffle_method           = Fisher-Yates unbiased in-place shuffle`);
 lines.push(`entropy_source           = ${getRandomizerEntropySource()}`);
 lines.push(`shuffle_output_checksum  = ${shuffleHash}`);
 lines.push("------------------------------------------------------------");
 lines.push("[DISTRIBUTION_CONFIG]");
 lines.push(`group_count              = ${groupCount}`);
 lines.push(`group_prefix             = ${prefix}`);
 lines.push(`distribution_mode        = ${String(distribution || "balanced").toUpperCase()}`);
 lines.push(`assignment_rule          = ${distribution === "snake" ? "row alternates left-to-right then right-to-left" : "round-robin top-to-bottom after shuffle"}`);
 lines.push(`sheet_output_format      = ${String(format || "long").toUpperCase()}`);
 lines.push(`group_size_matrix        = ${groupSizes}`);
 lines.push(`assignment_checksum      = ${assignmentHash}`);
 lines.push("------------------------------------------------------------");
 lines.push("[ASSIGNMENT_TRACE]");
 const traceSlotCounter = Array.from({ length: groupCount }, () => 0);
 shuffled.forEach((name, index) => {
  let groupIndex = index % groupCount;
  if (distribution === "snake") {
   const row = Math.floor(index / groupCount);
   const position = index % groupCount;
   groupIndex = row % 2 === 0 ? position : groupCount - 1 - position;
  }
  traceSlotCounter[groupIndex] += 1;
  const groupName = groupLabel(groupIndex);
  const slotLabel = String(traceSlotCounter[groupIndex]).padStart(2, "0");
  lines.push(`SEQ ${String(index + 1).padStart(3, "0")}  HASH=${randomizerHash(name)}  TARGET=${groupName}  SLOT=${slotLabel}  NAME=${name}`);
 });
 lines.push("------------------------------------------------------------");
 lines.push("[STATUS]");
 lines.push("result                   = COMPLETED");
 lines.push("copy_ready_for_sheets    = TRUE");
 lines.push("end_of_log               = TRUE");
 return lines.join("\n");
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
 const rawNames = (portal.qs("#randomizerInput")?.value || "")
  .split(/\r?\n/)
  .map(line => portal.text(line))
  .filter(Boolean);
 const names = parseRandomizerNames();
 const duplicatesRemoved = Math.max(0, rawNames.length - names.length);
 const groupCount = Math.max(1, Number(portal.qs("#randomizerGroupCount")?.value || 1));
 const output = portal.qs("#randomizerOutput");
 const summary = portal.qs("#randomizerSummary");
 const systemLog = portal.qs("#randomizerSystemLog");

 if (!names.length) {
  portal.toast("Paste at least one player or team name.");
  return;
 }

 if (groupCount > names.length) {
  portal.toast("Group count is higher than the number of names. Empty groups will be created.");
 }

 const shuffled = shuffleArray(names);
 const distribution = portal.qs("#randomizerDistribution")?.value || "balanced";
 const groups = buildGroups(shuffled, groupCount, distribution);
 const format = portal.qs("#randomizerFormat")?.value || "long";

 if (output) output.value = format === "wide" ? toWideTable(groups) : toLongTable(groups);
 if (summary) summary.textContent = `${names.length} names split into ${groupCount} group${groupCount === 1 ? "" : "s"}`;
 if (systemLog) systemLog.value = buildRandomizerSystemLog({ rawNames, names, shuffled, groups, groupCount, distribution, format, duplicatesRemoved });
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

async function copyRandomizerSystemLog() {
 const output = portal.qs("#randomizerSystemLog");
 const text = output?.value || "";
 if (!text) {
  portal.toast("No system log to copy yet.");
  return;
 }

 try {
  await navigator.clipboard.writeText(text);
  portal.toast("System log copied.");
 } catch (err) {
  output.focus();
  output.select();
  document.execCommand("copy");
  portal.toast("System log copied.");
 }
}

function wireRandomizerTool() {
 portal.qs("#randomizerForm")?.addEventListener("submit", generateRandomizedGroups);
 portal.qs("#randomizerCopyBtn")?.addEventListener("click", copyRandomizerOutput);
 portal.qs("#randomizerCopyLogBtn")?.addEventListener("click", copyRandomizerSystemLog);
 portal.qs("#randomizerClearBtn")?.addEventListener("click", () => {
  const input = portal.qs("#randomizerInput");
  const output = portal.qs("#randomizerOutput");
  const log = portal.qs("#randomizerSystemLog");
  const preview = portal.qs("#randomizerPreview");
  const summary = portal.qs("#randomizerSummary");
  if (input) input.value = "";
  if (output) output.value = "";
  if (log) log.value = "";
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
