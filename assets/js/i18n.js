/**
 * CODM Tournament OS — Lightweight UI Translation
 * Default language: English
 * Supported: English, Bahasa Malaysia, Filipino, Mandarin Chinese
 *
 * This translates static UI copy and common dynamic UI labels.
 * User-generated content such as team names, announcement text, and results
 * is only affected if it exactly matches a known UI string.
 */
(function () {
  const STORAGE_KEY = "codm_language";
  const SUPPORTED = ["en", "ms", "fil", "zh"];
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
    },

    zh: {
      "Language": "语言",
      "EN": "EN",
      "MS": "MS",
      "FIL": "FIL",
      "ZH": "ZH",
      "English": "英语",
      "Bahasa Malaysia": "马来语",
      "Filipino": "菲律宾语",
      "Mandarin": "普通话",

      "Announcements": "公告",
      "Registration": "报名",
      "Timeline": "时间线",
      "Teams": "队伍",
      "Schedule": "赛程",
      "Results": "赛果",
      "Rulebook": "规则手册",
      "FAQ & Support": "常见问题与支持",
      "View Public Site": "查看公开页面",
      "Sign Out": "退出登录",
      "Tournament": "赛事",

      "Public Event Hub": "公开赛事中心",
      "Announcements, schedule,": "公告、赛程、",
      "rulebook, and results.": "规则手册与赛果。",
      "Official Updates": "官方更新",
      "Latest tournament notices from admins and organizers.": "来自管理员和主办方的最新赛事通知。",
      "Join the Competition": "加入比赛",
      "Event Registration": "赛事报名",
      "Ready to compete? Open the official registration form and complete your team or player submission.": "准备好参赛了吗？打开官方报名表，完成队伍或选手提交。",
      "Open Registration Form": "打开报名表",
      "Registration is currently closed.": "报名目前已关闭。",
      "Tournament Roadmap": "赛事路线图",
      "Tournament Timeline": "赛事时间线",
      "Admin-controlled dates and stage milestones for the selected event.": "所选赛事的日期与阶段节点由管理员控制。",
      "Tournament Directory": "赛事目录",
      "Participating Teams & Players": "参赛队伍与选手",
      "Published teams and player rosters for the selected tournament.": "所选赛事已发布的队伍与选手名单。",
      "Match Flow": "比赛流程",
      "Match Schedule": "比赛赛程",
      "Published matches, lobby times, and series windows.": "已发布的比赛、房间时间与系列赛时间段。",
      "Published": "已发布",
      "Match Results": "比赛赛果",
      "Finalized scores and published standings entries.": "最终比分与已发布的排名记录。",
      "Help Desk": "帮助中心",
      "Check common questions first. If you still need help, submit an inquiry for the admin team.": "请先查看常见问题。如仍需帮助，请向管理员团队提交咨询。",
      "Official Rules": "官方规则",
      "Review the official tournament rules before match day.": "请在比赛日前查看官方赛事规则。",
      "Full Rulebook Viewer": "完整规则手册查看器",

      "Show": "显示",
      "Hide": "隐藏",
      "Reset": "重置",
      "All Modes": "所有模式",
      "Mode": "模式",
      "Search": "搜索",
      "Team, tag, or player...": "队伍、标签或选手...",
      "No published participating teams are available for the selected tournament yet.": "所选赛事尚无已发布的参赛队伍。",
      "No published timeline items are available for this tournament yet.": "该赛事尚无已发布的时间线项目。",
      "No published matches are available for this tournament yet.": "该赛事尚无已发布的比赛。",
      "No published results are available for this tournament yet.": "该赛事尚无已发布的赛果。",

      "Roster": "名单",
      "Roster pending": "名单待定",
      "entry": "条记录",
      "entries": "条记录",
      "Date TBA": "日期待定",
      "Milestone": "里程碑",
      "Upcoming": "即将开始",
      "Live": "直播中",
      "Completed": "已完成",
      "Postponed": "已延期",
      "Cancelled": "已取消",

      "Command Center": "指挥中心",
      "Admin Console": "管理员控制台",
      "Post announcements and monitor match data synced from Google Sheets.": "发布公告并监控从 Google Sheets 同步的比赛数据。",
      "Managing Tournament": "正在管理赛事",
      "Tournament Setup": "赛事设置",
      "Sheet Sync": "表格同步",
      "Match Preview": "比赛预览",
      "FAQ": "常见问题",
      "Inquiries": "咨询",
      "Registration & Timeline": "报名与时间线",
      "Open or close registration and publish the tournament schedule/timeline for the selected event.": "为所选赛事开启或关闭报名，并发布赛事赛程/时间线。",
      "Tournament Control": "赛事控制",
      "Registration Status": "报名状态",
      "Open Registration": "开启报名",
      "Close Registration": "关闭报名",
      "Registration Form URL": "报名表链接",
      "Rulebook URL": "规则手册链接",
      "Save Registration Settings": "保存报名设置",
      "View Registration Card": "查看报名卡片",
      "Timeline Title": "时间线标题",
      "Type": "类型",
      "Status": "状态",
      "Display Date Text": "显示日期文本",
      "Start Date/Time": "开始日期/时间",
      "End Date/Time": "结束日期/时间",
      "Location / Platform": "地点 / 平台",
      "Sort Order": "排序",
      "Description": "描述",
      "Save Timeline Item": "保存时间线项目",
      "Cancel Edit": "取消编辑",
      "Draft / Hidden": "草稿 / 隐藏",
      "Actions": "操作",
      "Edit": "编辑",
      "Delete": "删除",
      "Publish": "发布",

      "Post Announcement": "发布公告",
      "Title": "标题",
      "Priority": "优先级",
      "Info": "信息",
      "Important": "重要",
      "Urgent": "紧急",
      "Message": "消息",
      "Publish Announcement": "发布公告",
      "Save Announcement": "保存公告",
      "Editing announcement. Save changes or cancel to create a new post.": "正在编辑公告。保存更改，或取消以创建新公告。",
      "Admin Only": "仅限管理员",
      "Admin role required.": "需要管理员权限。",
      "You are logged in, but this account is not marked as an admin in Supabase profiles.": "你已登录，但该账户未在 Supabase profiles 中标记为管理员。",
      "Email": "电子邮箱",
      "Password": "密码",
      "Login": "登录",

      "Question": "问题",
      "Answer": "答案",
      "Category": "类别",
      "Add FAQ": "添加常见问题",
      "Submit Inquiry": "提交咨询",
      "Support": "支持"
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
