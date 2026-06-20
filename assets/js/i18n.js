/**
 * CODM Tournament OS — Lightweight UI Translation
 * Default language: English
 * Supported: English, Bahasa Malaysia, Filipino
 *
 * This translates static UI copy and common dynamic UI labels.
 * User-generated content such as team names, announcement text, and results
 * is only affected if it exactly matches a known UI string.
 */
(function () {
  const STORAGE_KEY = "codm_language";
  const SUPPORTED = ["en", "ms", "fil"];
  const DEFAULT_LANG = "en";

  const DICTIONARY = {
    ms: {
      "Language": "Bahasa",
      "English": "English",
      "Bahasa Malaysia": "Bahasa Malaysia",
      "Filipino": "Filipino",

      "Announcements": "Pengumuman",
      "Registration": "Pendaftaran",
      "Timeline": "Garis Masa",
      "Teams": "Pasukan",
      "Schedule": "Jadual",
      "Results": "Keputusan",
      "Rulebook": "Buku Peraturan",
      "FAQ & Support": "Soalan Lazim & Sokongan",
      "View Public Site": "Lihat Laman Awam",
      "Sign Out": "Log Keluar",
      "Tournament": "Kejohanan",

      "Public Event Hub": "Hab Acara Awam",
      "Announcements, schedule,": "Pengumuman, jadual,",
      "rulebook, and results.": "buku peraturan, dan keputusan.",
      "Official Updates": "Kemas Kini Rasmi",
      "Latest tournament notices from admins and organizers.": "Notis kejohanan terkini daripada admin dan penganjur.",
      "Join the Competition": "Sertai Pertandingan",
      "Event Registration": "Pendaftaran Acara",
      "Ready to compete? Open the official registration form and complete your team or player submission.": "Bersedia untuk bertanding? Buka borang pendaftaran rasmi dan lengkapkan penyertaan pasukan atau pemain anda.",
      "Open Registration Form": "Buka Borang Pendaftaran",
      "Registration is currently closed.": "Pendaftaran sedang ditutup.",
      "Tournament Roadmap": "Peta Perjalanan Kejohanan",
      "Tournament Timeline": "Garis Masa Kejohanan",
      "Admin-controlled dates and stage milestones for the selected event.": "Tarikh dan pencapaian peringkat yang dikawal oleh admin untuk acara yang dipilih.",
      "Tournament Directory": "Direktori Kejohanan",
      "Participating Teams & Players": "Pasukan & Pemain Bertanding",
      "Published teams and player rosters for the selected tournament.": "Pasukan dan senarai pemain yang diterbitkan untuk kejohanan yang dipilih.",
      "Match Flow": "Aliran Perlawanan",
      "Match Schedule": "Jadual Perlawanan",
      "Published matches, lobby times, and series windows.": "Perlawanan diterbitkan, masa lobi, dan jendela siri.",
      "Published": "Diterbitkan",
      "Match Results": "Keputusan Perlawanan",
      "Finalized scores and published standings entries.": "Skor muktamad dan kedudukan yang diterbitkan.",
      "Help Desk": "Meja Bantuan",
      "Check common questions first. If you still need help, submit an inquiry for the admin team.": "Semak soalan lazim dahulu. Jika masih perlukan bantuan, hantar pertanyaan kepada pasukan admin.",
      "Official Rules": "Peraturan Rasmi",
      "Review the official tournament rules before match day.": "Semak peraturan rasmi kejohanan sebelum hari perlawanan.",
      "Full Rulebook Viewer": "Paparan Penuh Buku Peraturan",

      "Show": "Tunjuk",
      "Hide": "Sembunyi",
      "Reset": "Tetapkan Semula",
      "All Modes": "Semua Mod",
      "Mode": "Mod",
      "Search": "Cari",
      "Team, tag, or player...": "Pasukan, tag, atau pemain...",
      "No published participating teams are available for the selected tournament yet.": "Tiada pasukan bertanding yang diterbitkan untuk kejohanan yang dipilih.",
      "No published timeline items are available for this tournament yet.": "Tiada item garis masa diterbitkan untuk kejohanan ini.",
      "No published matches are available for this tournament yet.": "Tiada perlawanan diterbitkan untuk kejohanan ini.",
      "No published results are available for this tournament yet.": "Tiada keputusan diterbitkan untuk kejohanan ini.",

      "Roster": "Senarai Pemain",
      "Roster pending": "Senarai belum tersedia",
      "entry": "entri",
      "entries": "entri",
      "Date TBA": "Tarikh belum diumumkan",
      "Milestone": "Pencapaian",
      "Upcoming": "Akan Datang",
      "Live": "Langsung",
      "Completed": "Selesai",
      "Postponed": "Ditangguh",
      "Cancelled": "Dibatalkan",

      "Command Center": "Pusat Kawalan",
      "Admin Console": "Konsol Admin",
      "Post announcements and monitor match data synced from Google Sheets.": "Hantar pengumuman dan pantau data perlawanan yang diselaraskan daripada Google Sheets.",
      "Managing Tournament": "Mengurus Kejohanan",
      "Tournament Setup": "Tetapan Kejohanan",
      "Sheet Sync": "Penyelarasan Sheet",
      "Match Preview": "Pratonton Perlawanan",
      "FAQ": "Soalan Lazim",
      "Inquiries": "Pertanyaan",
      "Registration & Timeline": "Pendaftaran & Garis Masa",
      "Open or close registration and publish the tournament schedule/timeline for the selected event.": "Buka atau tutup pendaftaran dan terbitkan jadual/garis masa kejohanan untuk acara yang dipilih.",
      "Tournament Control": "Kawalan Kejohanan",
      "Registration Status": "Status Pendaftaran",
      "Open Registration": "Buka Pendaftaran",
      "Close Registration": "Tutup Pendaftaran",
      "Registration Form URL": "URL Borang Pendaftaran",
      "Rulebook URL": "URL Buku Peraturan",
      "Save Registration Settings": "Simpan Tetapan Pendaftaran",
      "View Registration Card": "Lihat Kad Pendaftaran",
      "Timeline Title": "Tajuk Garis Masa",
      "Type": "Jenis",
      "Status": "Status",
      "Display Date Text": "Teks Tarikh Paparan",
      "Start Date/Time": "Tarikh/Masa Mula",
      "End Date/Time": "Tarikh/Masa Tamat",
      "Location / Platform": "Lokasi / Platform",
      "Sort Order": "Susunan",
      "Description": "Penerangan",
      "Save Timeline Item": "Simpan Item Garis Masa",
      "Cancel Edit": "Batal Sunting",
      "Draft / Hidden": "Draf / Tersembunyi",
      "Actions": "Tindakan",
      "Edit": "Sunting",
      "Delete": "Padam",
      "Publish": "Terbitkan",

      "Official Updates": "Kemas Kini Rasmi",
      "Post Announcement": "Hantar Pengumuman",
      "Title": "Tajuk",
      "Priority": "Keutamaan",
      "Info": "Maklumat",
      "Important": "Penting",
      "Urgent": "Segera",
      "Message": "Mesej",
      "Publish Announcement": "Terbitkan Pengumuman",
      "Save Announcement": "Simpan Pengumuman",
      "Editing announcement. Save changes or cancel to create a new post.": "Sedang menyunting pengumuman. Simpan perubahan atau batal untuk cipta hantaran baharu.",
      "Admin Only": "Admin Sahaja",
      "Admin role required.": "Peranan admin diperlukan.",
      "You are logged in, but this account is not marked as an admin in Supabase profiles.": "Anda telah log masuk, tetapi akaun ini belum ditanda sebagai admin dalam profil Supabase.",
      "Email": "E-mel",
      "Password": "Kata Laluan",
      "Login": "Log Masuk",

      "Question": "Soalan",
      "Answer": "Jawapan",
      "Category": "Kategori",
      "Add FAQ": "Tambah Soalan Lazim",
      "Submit Inquiry": "Hantar Pertanyaan",
      "Support": "Sokongan"
    },

    fil: {
      "Language": "Wika",
      "English": "English",
      "Bahasa Malaysia": "Bahasa Malaysia",
      "Filipino": "Filipino",

      "Announcements": "Mga Anunsyo",
      "Registration": "Rehistrasyon",
      "Timeline": "Timeline",
      "Teams": "Mga Team",
      "Schedule": "Iskedyul",
      "Results": "Resulta",
      "Rulebook": "Rulebook",
      "FAQ & Support": "FAQ at Support",
      "View Public Site": "Tingnan ang Public Site",
      "Sign Out": "Mag-sign Out",
      "Tournament": "Tournament",

      "Public Event Hub": "Public Event Hub",
      "Announcements, schedule,": "Mga anunsyo, iskedyul,",
      "rulebook, and results.": "rulebook, at resulta.",
      "Official Updates": "Opisyal na Updates",
      "Latest tournament notices from admins and organizers.": "Pinakabagong tournament notices mula sa admins at organizers.",
      "Join the Competition": "Sumali sa Laban",
      "Event Registration": "Event Registration",
      "Ready to compete? Open the official registration form and complete your team or player submission.": "Handa ka na bang lumaban? Buksan ang official registration form at kumpletuhin ang submission ng team o player.",
      "Open Registration Form": "Buksan ang Registration Form",
      "Registration is currently closed.": "Sarado ang registration sa ngayon.",
      "Tournament Roadmap": "Tournament Roadmap",
      "Tournament Timeline": "Tournament Timeline",
      "Admin-controlled dates and stage milestones for the selected event.": "Mga petsa at stage milestones na kinokontrol ng admin para sa napiling event.",
      "Tournament Directory": "Tournament Directory",
      "Participating Teams & Players": "Mga Kasaling Team at Player",
      "Published teams and player rosters for the selected tournament.": "Mga naka-publish na team at player roster para sa napiling tournament.",
      "Match Flow": "Daloy ng Match",
      "Match Schedule": "Iskedyul ng Match",
      "Published matches, lobby times, and series windows.": "Mga naka-publish na match, lobby time, at series windows.",
      "Published": "Naka-publish",
      "Match Results": "Resulta ng Match",
      "Finalized scores and published standings entries.": "Final scores at naka-publish na standings entries.",
      "Help Desk": "Help Desk",
      "Check common questions first. If you still need help, submit an inquiry for the admin team.": "Tingnan muna ang common questions. Kung kailangan pa ng tulong, magsumite ng inquiry sa admin team.",
      "Official Rules": "Opisyal na Rules",
      "Review the official tournament rules before match day.": "Basahin ang official tournament rules bago ang match day.",
      "Full Rulebook Viewer": "Full Rulebook Viewer",

      "Show": "Ipakita",
      "Hide": "Itago",
      "Reset": "I-reset",
      "All Modes": "Lahat ng Mode",
      "Mode": "Mode",
      "Search": "Search",
      "Team, tag, or player...": "Team, tag, o player...",
      "No published participating teams are available for the selected tournament yet.": "Wala pang naka-publish na participating teams para sa napiling tournament.",
      "No published timeline items are available for this tournament yet.": "Wala pang naka-publish na timeline items para sa tournament na ito.",
      "No published matches are available for this tournament yet.": "Wala pang naka-publish na matches para sa tournament na ito.",
      "No published results are available for this tournament yet.": "Wala pang naka-publish na resulta para sa tournament na ito.",

      "Roster": "Roster",
      "Roster pending": "Wala pang roster",
      "entry": "entry",
      "entries": "entries",
      "Date TBA": "Date TBA",
      "Milestone": "Milestone",
      "Upcoming": "Paparating",
      "Live": "Live",
      "Completed": "Tapos na",
      "Postponed": "Na-postpone",
      "Cancelled": "Nakansela",

      "Command Center": "Command Center",
      "Admin Console": "Admin Console",
      "Post announcements and monitor match data synced from Google Sheets.": "Mag-post ng announcements at i-monitor ang match data na galing sa Google Sheets.",
      "Managing Tournament": "Minamanage na Tournament",
      "Tournament Setup": "Tournament Setup",
      "Sheet Sync": "Sheet Sync",
      "Match Preview": "Match Preview",
      "FAQ": "FAQ",
      "Inquiries": "Inquiries",
      "Registration & Timeline": "Registration at Timeline",
      "Open or close registration and publish the tournament schedule/timeline for the selected event.": "Buksan o isara ang registration at i-publish ang tournament schedule/timeline para sa napiling event.",
      "Tournament Control": "Tournament Control",
      "Registration Status": "Registration Status",
      "Open Registration": "Buksan ang Registration",
      "Close Registration": "Isara ang Registration",
      "Registration Form URL": "Registration Form URL",
      "Rulebook URL": "Rulebook URL",
      "Save Registration Settings": "I-save ang Registration Settings",
      "View Registration Card": "Tingnan ang Registration Card",
      "Timeline Title": "Timeline Title",
      "Type": "Type",
      "Status": "Status",
      "Display Date Text": "Display Date Text",
      "Start Date/Time": "Start Date/Time",
      "End Date/Time": "End Date/Time",
      "Location / Platform": "Lokasyon / Platform",
      "Sort Order": "Sort Order",
      "Description": "Description",
      "Save Timeline Item": "I-save ang Timeline Item",
      "Cancel Edit": "Cancel Edit",
      "Draft / Hidden": "Draft / Hidden",
      "Actions": "Actions",
      "Edit": "Edit",
      "Delete": "Delete",
      "Publish": "Publish",

      "Official Updates": "Opisyal na Updates",
      "Post Announcement": "Mag-post ng Announcement",
      "Title": "Title",
      "Priority": "Priority",
      "Info": "Info",
      "Important": "Important",
      "Urgent": "Urgent",
      "Message": "Message",
      "Publish Announcement": "I-publish ang Announcement",
      "Save Announcement": "I-save ang Announcement",
      "Editing announcement. Save changes or cancel to create a new post.": "Ini-edit ang announcement. I-save ang changes o i-cancel para gumawa ng bagong post.",
      "Admin Only": "Admin Only",
      "Admin role required.": "Kailangan ng admin role.",
      "You are logged in, but this account is not marked as an admin in Supabase profiles.": "Naka-login ka, pero hindi pa naka-mark bilang admin ang account na ito sa Supabase profiles.",
      "Email": "Email",
      "Password": "Password",
      "Login": "Login",

      "Question": "Tanong",
      "Answer": "Sagot",
      "Category": "Category",
      "Add FAQ": "Magdagdag ng FAQ",
      "Submit Inquiry": "Isumite ang Inquiry",
      "Support": "Support"
    }
  };

  function getLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(stored) ? stored : DEFAULT_LANG;
  }

  function setLanguage(lang) {
    const next = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("lang", next);
    updateSelectors(next);
    applyTranslations(document.body || document);
  }

  function translateText(text, lang) {
    if (lang === DEFAULT_LANG) return text;
    return (DICTIONARY[lang] && DICTIONARY[lang][text]) || text;
  }

  function translateWithWhitespace(value, lang) {
    const text = value || "";
    const trimmed = text.trim();
    if (!trimmed) return text;

    const translated = translateText(trimmed, lang);
    if (translated === trimmed) return text;

    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    return leading + translated + trailing;
  }

  function shouldSkipNode(node) {
    if (!node || !node.parentElement) return true;
    const parent = node.parentElement;

    if (parent.closest("[data-i18n-ignore]")) return true;

    return ["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"].includes(parent.tagName);
  }

  function translateTextNode(node, lang) {
    if (shouldSkipNode(node)) return;

    if (!node.__codmSourceText) {
      node.__codmSourceText = node.nodeValue;
    }

    node.nodeValue = translateWithWhitespace(node.__codmSourceText, lang);
  }

  function translateElementAttributes(element, lang) {
    if (!element || element.nodeType !== 1 || element.closest("[data-i18n-ignore]")) return;

    ["placeholder", "title", "aria-label"].forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;

      const key = `codmSource${attribute}`;
      if (!element.dataset[key]) {
        element.dataset[key] = element.getAttribute(attribute);
      }

      const source = element.dataset[key];
      element.setAttribute(attribute, translateText(source, lang));
    });
  }

  function walk(root, callback) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) callback(node);
  }

  function applyTranslations(root) {
    const lang = getLanguage();
    document.documentElement.setAttribute("lang", lang);

    walk(root || document.body, node => translateTextNode(node, lang));
    (root || document).querySelectorAll?.("[placeholder], [title], [aria-label]").forEach(element => {
      translateElementAttributes(element, lang);
    });

    updateSelectors(lang);
  }

  function updateSelectors(lang) {
    document.querySelectorAll("[data-language-select]").forEach(select => {
      if (select.value !== lang) select.value = lang;
    });
  }

  function wireSelector(select) {
    if (!select || select.dataset.languageBound === "true") return;

    select.dataset.languageBound = "true";
    select.value = getLanguage();
    select.addEventListener("change", () => setLanguage(select.value));
  }

  function wireSelectors() {
    document.querySelectorAll("[data-language-select]").forEach(wireSelector);
  }

  function observeMutations() {
    let pending = false;

    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;

      requestAnimationFrame(() => {
        pending = false;
        wireSelectors();
        applyTranslations(document.body);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.setAttribute("lang", getLanguage());
    wireSelectors();
    applyTranslations(document.body);
    observeMutations();
  });

  window.CODM_I18N = {
    getLanguage,
    setLanguage,
    apply: applyTranslations
  };
})();
