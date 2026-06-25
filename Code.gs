/**
 * CODM Tournament OS — Google Sheets Sync
 * Community Gladiators 2026 Season 2
 *
 * Syncs:
 * - Match data from MP_1V1, MP_TEAM_5V5, BR_SOLO, BR_SQUAD
 * - Participating teams from PARTICIPATING_TEAMS
 *
 * Required Script Properties:
 * SUPABASE_URL=https://mueolsjzwitvlgxwtfbi.supabase.co
 * SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
 * TOURNAMENT_SLUG=community-gladiators-2026-season-2
 *
 * Privacy rule:
 * Player UID values are stored only in participating_team_players.
 * The public dashboard reads v_public_participating_teams, which never
 * includes player_uid or raw UID data.
 */

const MATCH_TABS = ["MP_1V1", "MP_TEAM_5V5", "BR_SOLO", "BR_SQUAD"];
const TEAM_TAB = "PARTICIPATING_TEAMS";
const MATCH_HEADER_ROW = 4;
const MATCH_DATA_START_ROW = 5;
const TEAM_HEADER_ROW = 1;
const TEAM_DATA_START_ROW = 2;
const UPSERT_CHUNK_SIZE = 200;
const tournamentCache_ = {};

const MP_HEADERS = {
  recordKey: "Record Key",
  published: "Published",
  status: "Status",
  tournamentSlug: "Tournament Slug",
  mode: "Mode",
  stage: "Stage",
  day: "Day",
  bracket: "Bracket",
  seriesNo: "Series No",
  matchNo: "Match No",
  matchTitle: "Match Title",
  scheduledAt: "Scheduled At",
  teamA: "Team A / Player A",
  tagA: "Tag A",
  teamB: "Team B / Player B",
  tagB: "Tag B",
  mapOrder: "Map Order",
  gameMode: "Game Mode",
  map: "Map",
  participantName: "Team / Player",
  participantTag: "Tag",
  side: "Side",
  result: "W/L",
  score: "Score",
  opponentScore: "Opp Score",
  seriesWin: "Series Win",
  seriesPoints: "Series Points",
  notes: "Notes"
};

const BR_HEADERS = {
  recordKey: "Record Key",
  published: "Published",
  status: "Status",
  tournamentSlug: "Tournament Slug",
  mode: "Mode",
  stage: "Stage",
  day: "Day",
  bracket: "Bracket",
  roundNo: "Round",
  matchTitle: "Match Title",
  scheduledAt: "Scheduled At",
  map: "Map",
  slot: "Slot",
  participantName: "Team / Player Name",
  participantTag: "Tag",
  placement: "Placement",
  eliminations: "Eliminations",
  victory: "Victory",
  placementPoints: "Placement Pts",
  eliminationPoints: "Elimination Pts",
  totalPoints: "Total Pts",
  notes: "Notes"
};

const TEAM_HEADERS = {
  teamName: "TEAM NAME",
  teamTag: "TEAM TAG",
  teamLogoUrl: "TEAM LOGO URL",
  mode: "Mode",
  player1: "PLAYER 1",
  uid1: "UID",
  player2: "PLAYER 2",
  uid2: "UID",
  player3: "PLAYER 3",
  uid3: "UID",
  player4: "PLAYER 4",
  uid4: "UID",
  player5: "PLAYER 5",
  uid5: "UID",
  tournamentSlug: "Tournament Slug",
  published: "Published"
};

/**
 * Menu shown after the spreadsheet is reloaded.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CODM Sync")
    .addItem("Test Supabase Connection", "testSupabaseConnection")
    .addItem("Preview Current Tournament", "previewCurrentTournamentPayload")
    .addSeparator()
    .addItem("Sync Current Tournament (Matches + Teams)", "syncCurrentTournamentToSupabase")
    .addItem("Sync Match Data Only", "syncMatchDetailsToSupabase")
    .addItem("Sync Participating Teams Only", "syncParticipatingTeamsToSupabase")
    .addSeparator()
    .addItem("Clear Match Data Only", "clearMatchDetailsForTournament")
    .addItem("Clear Participating Teams Only", "clearParticipatingTeamsForTournament")
    .addToUi();
}

function cfg_() {
  const props = PropertiesService.getScriptProperties();

  return {
    url: text_(props.getProperty("SUPABASE_URL")),
    serviceRoleKey: text_(props.getProperty("SUPABASE_SERVICE_ROLE_KEY")),
    tournamentSlug: text_(props.getProperty("TOURNAMENT_SLUG")) ||
      "community-gladiators-2026-season-2"
  };
}

function requireCfg_() {
  const config = cfg_();

  if (!config.url) throw new Error("Missing Script Property: SUPABASE_URL");
  if (!config.serviceRoleKey) throw new Error("Missing Script Property: SUPABASE_SERVICE_ROLE_KEY");

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url)) {
    throw new Error("SUPABASE_URL looks invalid: " + config.url);
  }

  return config;
}

function text_(value) {
  return String(value == null ? "" : value).trim();
}

function integerOrNull_(value) {
  if (value === "" || value == null) return null;

  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function bool_(value, defaultValue) {
  if (value === "" || value == null) return defaultValue;
  if (value === true || value === false) return value;

  const normalized = text_(value).toLowerCase();
  if (["true", "yes", "y", "1", "published"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "draft"].includes(normalized)) return false;

  return defaultValue;
}

function dateToIso_(value) {
  if (!value) return null;

  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value.getTime())
  ) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function headerIndex_(headers) {
  const index = {};

  headers.forEach((header, i) => {
    const key = text_(header).toLowerCase();
    if (!index[key]) index[key] = [];
    index[key].push(i);
  });

  return index;
}

/**
 * Resolves duplicate header names by occurrence.
 * Example: "UID" occurrence 0 is Player 1 UID, occurrence 1 is Player 2 UID.
 */
function get_(row, index, headerName, occurrence) {
  const occurrences = index[text_(headerName).toLowerCase()] || [];
  const col = occurrences[occurrence || 0];
  return col == null ? "" : row[col];
}

function assertHeaders_(tabName, index, required) {
  const missing = required.filter(header => !(index[text_(header).toLowerCase()] || []).length);

  if (missing.length) {
    throw new Error(
      "Tab " + tabName + " is missing required header(s): " + missing.join(", ")
    );
  }
}

function buildRaw_(row, headers) {
  const raw = {};

  headers.forEach((header, index) => {
    const safeHeader = text_(header) || "Column " + (index + 1);
    const value = row[index];

    // Duplicate column labels (e.g. UID) are retained with their position.
    const rawKey = Object.prototype.hasOwnProperty.call(raw, safeHeader)
      ? safeHeader + " #" + (index + 1)
      : safeHeader;

    raw[rawKey] = value instanceof Date && !isNaN(value.getTime())
      ? value.toISOString()
      : value;
  });

  return raw;
}

function supabaseFetch_(method, path, payload, prefer) {
  const config = requireCfg_();

  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: "Bearer " + config.serviceRoleKey,
      Prefer: prefer || "resolution=merge-duplicates,return=representation"
    }
  };

  if (payload !== undefined && payload !== null) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(config.url + path, options);
  const status = response.getResponseCode();
  const body = response.getContentText();

  Logger.log(method + " " + path + " → " + status);

  if (status >= 300) {
    Logger.log(body);
    throw new Error("Supabase error " + status + ": " + body);
  }

  return body ? JSON.parse(body) : null;
}

function getTournament_(slug) {
  const cleanSlug = text_(slug);
  if (!cleanSlug) throw new Error("A Tournament Slug is required.");

  if (tournamentCache_[cleanSlug]) return tournamentCache_[cleanSlug];

  const rows = supabaseFetch_(
    "GET",
    "/rest/v1/tournaments?slug=eq." +
      encodeURIComponent(cleanSlug) +
      "&select=id,slug,title&limit=1"
  );

  if (!rows || !rows.length) {
    throw new Error(
      "Tournament not found for slug: " + cleanSlug +
      ". Run the multi-tournament migration SQL first."
    );
  }

  tournamentCache_[cleanSlug] = rows[0];
  return rows[0];
}

function normalizePayloads_(payloads, keys) {
  return payloads.map(payload => {
    const normalized = {};

    keys.forEach(key => {
      normalized[key] = Object.prototype.hasOwnProperty.call(payload, key)
        ? (payload[key] === undefined ? null : payload[key])
        : null;
    });

    if (keys.includes("raw_data") && !normalized.raw_data) normalized.raw_data = {};
    return normalized;
  });
}

const MATCH_DETAILS_PAYLOAD_KEYS = [
  "tournament_id", "tournament_slug", "source_tab", "source_row", "sheet_row_key",
  "mode", "stage", "day_no", "bracket", "round_no", "series_no", "match_no",
  "match_title", "scheduled_at", "status", "is_published", "map_order",
  "game_mode", "map_name", "team_a", "tag_a", "team_b", "tag_b",
  "participant_name", "participant_tag", "side", "result", "score",
  "opponent_score", "series_win", "series_points", "slot", "placement",
  "eliminations", "victory", "placement_points", "elimination_points",
  "total_points", "notes", "raw_data", "updated_at"
];

const PARTICIPATING_TEAM_PAYLOAD_KEYS = [
  "tournament_id", "tournament_slug", "source_tab", "source_row", "sheet_row_key",
  "mode", "team_name", "team_tag", "team_logo_url", "is_published",
  "raw_data", "updated_at"
];

const PARTICIPATING_PLAYER_PAYLOAD_KEYS = [
  "team_id", "player_order", "player_name", "player_uid", "updated_at"
];

function mapMpRow_(sourceTab, rowNumber, index, headers, row, tournament, tournamentSlug) {
  const h = MP_HEADERS;
  const recordKey = text_(get_(row, index, h.recordKey)) || sourceTab + "-" + rowNumber;

  return {
    tournament_id: tournament.id,
    tournament_slug: tournamentSlug,
    source_tab: sourceTab,
    source_row: rowNumber,
    sheet_row_key: recordKey,
    mode: text_(get_(row, index, h.mode)) || sourceTab,
    stage: text_(get_(row, index, h.stage)) || null,
    day_no: integerOrNull_(get_(row, index, h.day)),
    bracket: text_(get_(row, index, h.bracket)) || null,
    round_no: null,
    series_no: integerOrNull_(get_(row, index, h.seriesNo)),
    match_no: integerOrNull_(get_(row, index, h.matchNo)),
    match_title: text_(get_(row, index, h.matchTitle)) || null,
    scheduled_at: dateToIso_(get_(row, index, h.scheduledAt)),
    status: text_(get_(row, index, h.status)) || "Scheduled",
    is_published: bool_(get_(row, index, h.published), true),
    map_order: integerOrNull_(get_(row, index, h.mapOrder)),
    game_mode: text_(get_(row, index, h.gameMode)) || null,
    map_name: text_(get_(row, index, h.map)) || null,
    team_a: text_(get_(row, index, h.teamA)) || null,
    tag_a: text_(get_(row, index, h.tagA)) || null,
    team_b: text_(get_(row, index, h.teamB)) || null,
    tag_b: text_(get_(row, index, h.tagB)) || null,
    participant_name: text_(get_(row, index, h.participantName)) || null,
    participant_tag: text_(get_(row, index, h.participantTag)) || null,
    side: text_(get_(row, index, h.side)) || null,
    result: text_(get_(row, index, h.result)) || null,
    score: integerOrNull_(get_(row, index, h.score)),
    opponent_score: integerOrNull_(get_(row, index, h.opponentScore)),
    series_win: integerOrNull_(get_(row, index, h.seriesWin)),
    series_points: integerOrNull_(get_(row, index, h.seriesPoints)),
    slot: null,
    placement: null,
    eliminations: null,
    victory: null,
    placement_points: null,
    elimination_points: null,
    total_points: null,
    notes: text_(get_(row, index, h.notes)) || null,
    raw_data: buildRaw_(row, headers),
    updated_at: new Date().toISOString()
  };
}

function mapBrRow_(sourceTab, rowNumber, index, headers, row, tournament, tournamentSlug) {
  const h = BR_HEADERS;
  const recordKey = text_(get_(row, index, h.recordKey)) || sourceTab + "-" + rowNumber;

  return {
    tournament_id: tournament.id,
    tournament_slug: tournamentSlug,
    source_tab: sourceTab,
    source_row: rowNumber,
    sheet_row_key: recordKey,
    mode: text_(get_(row, index, h.mode)) || sourceTab,
    stage: text_(get_(row, index, h.stage)) || null,
    day_no: integerOrNull_(get_(row, index, h.day)),
    bracket: text_(get_(row, index, h.bracket)) || null,
    round_no: integerOrNull_(get_(row, index, h.roundNo)),
    series_no: null,
    match_no: null,
    match_title: text_(get_(row, index, h.matchTitle)) || null,
    scheduled_at: dateToIso_(get_(row, index, h.scheduledAt)),
    status: text_(get_(row, index, h.status)) || "Scheduled",
    is_published: bool_(get_(row, index, h.published), true),
    map_order: null,
    game_mode: null,
    map_name: text_(get_(row, index, h.map)) || null,
    team_a: null,
    tag_a: null,
    team_b: null,
    tag_b: null,
    participant_name: text_(get_(row, index, h.participantName)) || null,
    participant_tag: text_(get_(row, index, h.participantTag)) || null,
    side: null,
    result: null,
    score: null,
    opponent_score: null,
    series_win: null,
    series_points: null,
    slot: integerOrNull_(get_(row, index, h.slot)),
    placement: integerOrNull_(get_(row, index, h.placement)),
    eliminations: integerOrNull_(get_(row, index, h.eliminations)),
    victory: integerOrNull_(get_(row, index, h.victory)),
    placement_points: integerOrNull_(get_(row, index, h.placementPoints)),
    elimination_points: integerOrNull_(get_(row, index, h.eliminationPoints)),
    total_points: integerOrNull_(get_(row, index, h.totalPoints)),
    notes: text_(get_(row, index, h.notes)) || null,
    raw_data: buildRaw_(row, headers),
    updated_at: new Date().toISOString()
  };
}

function readMatchTabPayloads_(tabName, tournament, config) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
  if (!sheet) return { payloads: [], skippedOtherTournament: 0 };

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < MATCH_DATA_START_ROW) return { payloads: [], skippedOtherTournament: 0 };

  const headers = sheet
    .getRange(MATCH_HEADER_ROW, 1, 1, lastColumn)
    .getValues()[0]
    .map(text_);

  const index = headerIndex_(headers);
  const isBr = tabName.indexOf("BR_") === 0;

  assertHeaders_(
    tabName,
    index,
    isBr
      ? [BR_HEADERS.recordKey, BR_HEADERS.tournamentSlug, BR_HEADERS.mode, BR_HEADERS.matchTitle, BR_HEADERS.participantName]
      : [MP_HEADERS.recordKey, MP_HEADERS.tournamentSlug, MP_HEADERS.mode, MP_HEADERS.matchTitle, MP_HEADERS.participantName]
  );

  const rows = sheet
    .getRange(MATCH_DATA_START_ROW, 1, lastRow - MATCH_DATA_START_ROW + 1, lastColumn)
    .getValues();

  const payloads = [];
  let skippedOtherTournament = 0;

  rows.forEach((row, offset) => {
    const rowNumber = MATCH_DATA_START_ROW + offset;
    if (!row.some(value => text_(value) !== "")) return;

    const rowTournamentSlug = text_(
      get_(row, index, isBr ? BR_HEADERS.tournamentSlug : MP_HEADERS.tournamentSlug)
    ) || config.tournamentSlug;

    if (rowTournamentSlug !== config.tournamentSlug) {
      skippedOtherTournament += 1;
      return;
    }

    const matchTitle = text_(get_(row, index, "Match Title"));
    const participant = text_(get_(row, index, isBr ? "Team / Player Name" : "Team / Player"));
    const map = text_(get_(row, index, "Map"));

    if (!matchTitle && !participant && !map) return;

    payloads.push(
      isBr
        ? mapBrRow_(tabName, rowNumber, index, headers, row, tournament, rowTournamentSlug)
        : mapMpRow_(tabName, rowNumber, index, headers, row, tournament, rowTournamentSlug)
    );
  });

  return { payloads, skippedOtherTournament };
}

function readAllMatchPayloads_(tournament, config) {
  let payloads = [];
  let skippedOtherTournament = 0;

  MATCH_TABS.forEach(tabName => {
    const result = readMatchTabPayloads_(tabName, tournament, config);
    payloads = payloads.concat(result.payloads);
    skippedOtherTournament += result.skippedOtherTournament;
  });

  return { payloads, skippedOtherTournament };
}

function upsertMatchDetails_(payloads) {
  let written = 0;

  for (let start = 0; start < payloads.length; start += UPSERT_CHUNK_SIZE) {
    const chunk = normalizePayloads_(
      payloads.slice(start, start + UPSERT_CHUNK_SIZE),
      MATCH_DETAILS_PAYLOAD_KEYS
    );

    supabaseFetch_(
      "POST",
      "/rest/v1/match_details?on_conflict=tournament_slug,source_tab,sheet_row_key",
      chunk
    );

    written += chunk.length;
  }

  return written;
}

function teamSheetKey_(mode, teamName, teamTag, firstPlayer) {
  const source = text_(teamTag) || text_(teamName) || text_(firstPlayer);
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return text_(mode) + "|" + (normalized || "row");
}

function readParticipatingTeamsPayloads_(tournament, config) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAM_TAB);

  if (!sheet) {
    throw new Error("Missing required tab: " + TEAM_TAB);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < TEAM_DATA_START_ROW) {
    return { teams: [], playersBySheetKey: {}, skippedOtherTournament: 0 };
  }

  const headers = sheet
    .getRange(TEAM_HEADER_ROW, 1, 1, lastColumn)
    .getValues()[0]
    .map(text_);

  const index = headerIndex_(headers);

  assertHeaders_(TEAM_TAB, index, [
    TEAM_HEADERS.teamName,
    TEAM_HEADERS.teamTag,
    TEAM_HEADERS.teamLogoUrl,
    TEAM_HEADERS.mode,
    TEAM_HEADERS.player1,
    TEAM_HEADERS.uid1,
    TEAM_HEADERS.tournamentSlug,
    TEAM_HEADERS.published
  ]);

  const rows = sheet
    .getRange(TEAM_DATA_START_ROW, 1, lastRow - TEAM_DATA_START_ROW + 1, lastColumn)
    .getValues();

  const teams = [];
  const playersBySheetKey = {};
  let skippedOtherTournament = 0;

  rows.forEach((row, offset) => {
    const rowNumber = TEAM_DATA_START_ROW + offset;
    if (!row.some(value => text_(value) !== "")) return;

    const rowTournamentSlug = text_(get_(row, index, TEAM_HEADERS.tournamentSlug)) || config.tournamentSlug;
    if (rowTournamentSlug !== config.tournamentSlug) {
      skippedOtherTournament += 1;
      return;
    }

    const mode = text_(get_(row, index, TEAM_HEADERS.mode));
    const teamNameInput = text_(get_(row, index, TEAM_HEADERS.teamName));
    const teamTag = text_(get_(row, index, TEAM_HEADERS.teamTag));
    const teamLogoUrl = text_(get_(row, index, TEAM_HEADERS.teamLogoUrl));

    const roster = [
      { order: 1, name: text_(get_(row, index, TEAM_HEADERS.player1)), uid: text_(get_(row, index, TEAM_HEADERS.uid1, 0)) },
      { order: 2, name: text_(get_(row, index, TEAM_HEADERS.player2)), uid: text_(get_(row, index, TEAM_HEADERS.uid2, 1)) },
      { order: 3, name: text_(get_(row, index, TEAM_HEADERS.player3)), uid: text_(get_(row, index, TEAM_HEADERS.uid3, 2)) },
      { order: 4, name: text_(get_(row, index, TEAM_HEADERS.player4)), uid: text_(get_(row, index, TEAM_HEADERS.uid4, 3)) },
      { order: 5, name: text_(get_(row, index, TEAM_HEADERS.player5)), uid: text_(get_(row, index, TEAM_HEADERS.uid5, 4)) }
    ].filter(player => player.name || player.uid);

    // Skip template rows such as a preset Mode/Tournament Slug with no team/player yet.
    if (!teamNameInput && !teamTag && !roster.length) return;

    if (!mode) {
      throw new Error(TEAM_TAB + " row " + rowNumber + " needs a Mode.");
    }

    if (!teamNameInput && !roster[0]?.name) {
      throw new Error(
        TEAM_TAB + " row " + rowNumber +
        " needs TEAM NAME or PLAYER 1."
      );
    }

    const teamName = teamNameInput || roster[0].name;
    const sheetRowKey = teamSheetKey_(mode, teamName, teamTag, roster[0]?.name);

    if (playersBySheetKey[sheetRowKey]) {
      throw new Error(
        TEAM_TAB + " has duplicate Mode + Team Tag/Name key: " + sheetRowKey +
        ". Use a unique stable TEAM TAG for each entry within a mode."
      );
    }

    teams.push({
      tournament_id: tournament.id,
      tournament_slug: rowTournamentSlug,
      source_tab: TEAM_TAB,
      source_row: rowNumber,
      sheet_row_key: sheetRowKey,
      mode: mode,
      team_name: teamName,
      team_tag: teamTag || null,
      team_logo_url: teamLogoUrl || null,
      is_published: bool_(get_(row, index, TEAM_HEADERS.published), true),
      raw_data: buildRaw_(row, headers),
      updated_at: new Date().toISOString()
    });

    playersBySheetKey[sheetRowKey] = roster;
  });

  return { teams, playersBySheetKey, skippedOtherTournament };
}

function upsertParticipatingTeams_(teamPayloads) {
  const rows = [];

  for (let start = 0; start < teamPayloads.length; start += UPSERT_CHUNK_SIZE) {
    const chunk = normalizePayloads_(
      teamPayloads.slice(start, start + UPSERT_CHUNK_SIZE),
      PARTICIPATING_TEAM_PAYLOAD_KEYS
    );

    const upserted = supabaseFetch_(
      "POST",
      "/rest/v1/participating_teams?on_conflict=tournament_slug,source_tab,sheet_row_key",
      chunk
    );

    rows.push.apply(rows, upserted || []);
  }

  return rows;
}

function deletePlayersForTeams_(teamIds) {
  for (let start = 0; start < teamIds.length; start += UPSERT_CHUNK_SIZE) {
    const chunk = teamIds.slice(start, start + UPSERT_CHUNK_SIZE);
    if (!chunk.length) continue;

    supabaseFetch_(
      "DELETE",
      "/rest/v1/participating_team_players?team_id=in.(" + chunk.join(",") + ")",
      null,
      "return=minimal"
    );
  }
}

function insertParticipatingPlayers_(teamRows, playersBySheetKey) {
  const idBySheetKey = {};

  teamRows.forEach(team => {
    idBySheetKey[team.sheet_row_key] = team.id;
  });

  const playerPayloads = [];

  Object.keys(playersBySheetKey).forEach(sheetRowKey => {
    const teamId = idBySheetKey[sheetRowKey];

    if (!teamId) {
      throw new Error("No participating_teams ID returned for: " + sheetRowKey);
    }

    playersBySheetKey[sheetRowKey].forEach(player => {
      playerPayloads.push({
        team_id: teamId,
        player_order: player.order,
        player_name: player.name || ("Player " + player.order),
        player_uid: player.uid || null,
        updated_at: new Date().toISOString()
      });
    });
  });

  for (let start = 0; start < playerPayloads.length; start += UPSERT_CHUNK_SIZE) {
    const chunk = normalizePayloads_(
      playerPayloads.slice(start, start + UPSERT_CHUNK_SIZE),
      PARTICIPATING_PLAYER_PAYLOAD_KEYS
    );

    supabaseFetch_(
      "POST",
      "/rest/v1/participating_team_players?on_conflict=team_id,player_order",
      chunk
    );
  }

  return playerPayloads.length;
}

function syncParticipatingTeams_(tournament, config) {
  const result = readParticipatingTeamsPayloads_(tournament, config);

  if (!result.teams.length) {
    return {
      teams: 0,
      players: 0,
      skippedOtherTournament: result.skippedOtherTournament
    };
  }

  const upsertedTeams = upsertParticipatingTeams_(result.teams);
  deletePlayersForTeams_(upsertedTeams.map(team => team.id));
  const playerCount = insertParticipatingPlayers_(upsertedTeams, result.playersBySheetKey);

  return {
    teams: upsertedTeams.length,
    players: playerCount,
    skippedOtherTournament: result.skippedOtherTournament
  };
}

function syncCurrentTournamentToSupabase() {
  const config = requireCfg_();
  const tournament = getTournament_(config.tournamentSlug);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const matchResult = readAllMatchPayloads_(tournament, config);
  const matchCount = upsertMatchDetails_(matchResult.payloads);

  const teamResult = syncParticipatingTeams_(tournament, config);

  spreadsheet.toast(
    "Matches: " + matchCount +
    " · Teams: " + teamResult.teams +
    " · Players: " + teamResult.players,
    "Current Tournament Synced",
    12
  );

  Logger.log(JSON.stringify({
    tournament: config.tournamentSlug,
    matches: matchCount,
    teams: teamResult.teams,
    players: teamResult.players,
    skippedMatchRows: matchResult.skippedOtherTournament,
    skippedTeamRows: teamResult.skippedOtherTournament
  }, null, 2));
}

function syncMatchDetailsToSupabase() {
  const config = requireCfg_();
  const tournament = getTournament_(config.tournamentSlug);
  const result = readAllMatchPayloads_(tournament, config);
  const written = upsertMatchDetails_(result.payloads);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Synced " + written + " match row(s).",
    "Match Sync Complete",
    10
  );
}

function syncParticipatingTeamsToSupabase() {
  const config = requireCfg_();
  const tournament = getTournament_(config.tournamentSlug);
  const result = syncParticipatingTeams_(tournament, config);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Synced " + result.teams + " team(s) and " + result.players + " player row(s).",
    "Participating Teams Sync Complete",
    10
  );
}

function previewCurrentTournamentPayload() {
  const config = requireCfg_();
  const tournament = getTournament_(config.tournamentSlug);
  const matchResult = readAllMatchPayloads_(tournament, config);
  const teamResult = readParticipatingTeamsPayloads_(tournament, config);

  Logger.log("Match sample:");
  Logger.log(JSON.stringify(matchResult.payloads.slice(0, 3), null, 2));

  // Do not log UID values in the preview.
  const safeTeamSample = teamResult.teams.slice(0, 3).map(team => ({
    ...team,
    raw_data: { "UID values": "[imported but redacted from preview]" }
  }));
  Logger.log("Participating team sample:");
  Logger.log(JSON.stringify(safeTeamSample, null, 2));

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Preview: " + matchResult.payloads.length +
    " match rows · " + teamResult.teams.length +
    " team rows.",
    "CODM Sync Preview",
    10
  );
}

function testSupabaseConnection() {
  const config = requireCfg_();
  const tournament = getTournament_(config.tournamentSlug);

  const teamView = supabaseFetch_(
    "GET",
    "/rest/v1/v_public_participating_teams?tournament_slug=eq." +
      encodeURIComponent(config.tournamentSlug) +
      "&select=team_name,team_tag,mode,player_count&limit=3"
  );

  Logger.log(JSON.stringify({
    tournament: tournament,
    publicTeamViewSample: teamView
  }, null, 2));

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Connection successful. Check Executions / Logs.",
    "CODM Sync",
    8
  );
}

function clearMatchDetailsForTournament() {
  const config = requireCfg_();
  const ui = SpreadsheetApp.getUi();

  const choice = ui.alert(
    "Clear match data only?",
    "This deletes only public.match_details rows for:\n\n" +
      config.tournamentSlug,
    ui.ButtonSet.YES_NO
  );

  if (choice !== ui.Button.YES) return;

  supabaseFetch_(
    "DELETE",
    "/rest/v1/match_details?tournament_slug=eq." + encodeURIComponent(config.tournamentSlug),
    null,
    "return=minimal"
  );
}

function clearParticipatingTeamsForTournament() {
  const config = requireCfg_();
  const ui = SpreadsheetApp.getUi();

  const choice = ui.alert(
    "Clear participating teams only?",
    "This deletes participating teams and their private UID roster data for:\n\n" +
      config.tournamentSlug,
    ui.ButtonSet.YES_NO
  );

  if (choice !== ui.Button.YES) return;

  supabaseFetch_(
    "DELETE",
    "/rest/v1/participating_teams?tournament_slug=eq." + encodeURIComponent(config.tournamentSlug),
    null,
    "return=minimal"
  );
}
