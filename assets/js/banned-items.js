(function () {
  const DATA = [
    {
      mode: "Battle Royale",
      groups: [
        { category: "Classes", items: ["Hacker", "Medic"] },
        { category: "Vehicles", items: ["Tank", "Jackal"] },
        { category: "Other Items", items: ["Stealth Chopper"] }
      ]
    },
    {
      mode: "Multiplayer",
      groups: [
        { category: "Weapons · Snipers", items: ["NA-45", "SVD", "XPR", "SO14"] },
        { category: "Weapons · Shotguns", items: ["Argus", "R9-0"] },
        { category: "Weapons · Pistols", items: ["Shorty"] },
        { category: "Weapons · Launchers", items: ["D13 Sector", "FHJ-18", "SMRS", "Thumper"] },
        { category: "Weapon Perks · All Guns", items: ["Akimbo", "Disable"] },
        { category: "Ammo · All Guns", items: ["All Thermite Ammo", "Dragon’s Breath Ammo", "Explosive Ammo", "Incendiary Ammo"] },
        { category: "Ammo · All Shotguns", items: ["Slug Ammo"] },
        { category: "Attachments · 3-Line Rifle", items: ["EMPRESS 514MM F01 Barrel", "Bipod", "KOVALEVSKAYA S01 Stock"] },
        { category: "Attachments · 50 GS", items: ["Lightweight Trigger", "Match Grade Trigger"] },
        { category: "Attachments · AS VAL", items: ["15 Round FMG Mag"] },
        { category: "Attachments · BP-50", items: ["Leroy 438mm", "Recoil Booster"] },
        { category: "Attachments · CR AMAX", items: ["M67 Ammo"] },
        { category: "Attachments · Crossbow", items: ["Thermite Bolt", "Gas Bolt", "Sticky Grenade Bolt"] },
        { category: "Attachments · CX9", items: ["9mm Hollow Point Rounds"] },
        { category: "Attachments · DLQ", items: ["Concussion Ammo"] },
        { category: "Attachments · DRH", items: ["OTM Mag"] },
        { category: "Attachments · Hades", items: ["Heartseeker"] },
        { category: "Attachments · HS0405", items: ["Thunder Rounds"] },
        { category: "Attachments · HVK", items: ["Large Caliber Mag"] },
        { category: "Attachments · LAG 53", items: ["13.0” OSW Para Barrel"] },
        { category: "Attachments · M4", items: ["Underbarrel Launcher"] },
        { category: "Attachments · Machine Pistol", items: ["VDD 35MM Short Barrel"] },
        { category: "Attachments · MG42", items: ["KRAUSNICK 355MM Rapid", "6.5 ARISAKA 125 Round Drums", "Recoil Booster"] },
        { category: "Attachments · Oden", items: ["OWC Ranger Barrel", "OWC Marksman Barrel"] },
        { category: "Attachments · QQ9", items: ["10MM 30 Round Reload"] },
        { category: "Attachments · Ram-7", items: ["FORGE TAC Eclipse Barrel"] },
        { category: "Attachments · RPD", items: ["Infinite Ammo"] },
        { category: "Attachments · SKS", items: ["Tactical Foregrip A", "Granulated Grip Tape"] },
        { category: "Attachments · Type 19", items: ["Hi-Accuracy Sniper Ammo"] },
        { category: "Attachments · Type 63", items: ["Airborne Elastic Wrap Grip", "Firm Grip Tape", "16.4” Rapid Fire Barrel", "16.4” Titanium Barrel", "18.3” Strike Team Barrel"] },
        { category: "Attachments · Tundra", items: ["26.5” Hammer Forged Barrel", "28.2” Tiger Team Barrel"] },
        { category: "Attachments · USS-9", items: ["Carbine Pro Barrel", "16.6” Factory Carbine Barrel", "13.1” First Responder Barrel", ".41 AE 32-Round Mags"] },
        { category: "Lethal Utility", items: ["C4", "Cluster Grenade", "Contact Grenade", "Drill Charge", "Molotov Cocktail", "Thermite", "Trip Mine"] },
        { category: "Tactical Utility", items: ["Cryo Bomb", "Decoy Grenade", "Douser Grenade", "Echo Grenade", "Flash Charge", "Flash Drone", "Gas Grenades", "Heartbeat Sensor", "Inflatable Decoy", "Stim Shot", "Storm Ball", "Trip Sensor"] },
        { category: "Perks · Red", items: ["Martyrdomstreak", "Overclock", "Pinpoint", "Restock", "Tactician"] },
        { category: "Perks · Green", items: ["Quick Fix", "Recon", "Tracker", "Vulture"] },
        { category: "Perks · Blue", items: ["Alert", "Assassin", "Engineer", "Hardline", "High Alert", "Persistence", "Unit Support", "Demo Expert", "Shrapnel"] },
        { category: "Wildcards", items: ["All Wildcards"] },
        { category: "Allowed Operator Skills", allowed: true, items: ["Annihilator", "Claw", "Death Machine", "Equalizer", "Gravity Spikes", "Gravity Vortex Gun", "Purifier", "Sparrow", "Tempest", "War Machine"] }
      ]
    }
  ];

  const CATEGORY_OPTIONS = [
    "Classes", "Vehicles", "Other Items", "Weapons", "Weapon Perks", "Ammo", "Attachments", "Lethal Utility", "Tactical Utility", "Perks", "Wildcards", "Allowed Operator Skills"
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function categoryFamily(category) {
    return category.split(" · ")[0];
  }

  function itemMatches(mode, group, item, query, modeFilter, categoryFilter) {
    const haystack = [mode, group.category, item].join(" ").toLowerCase();
    const family = categoryFamily(group.category);
    return (!query || haystack.includes(query)) &&
      (!modeFilter || mode === modeFilter) &&
      (!categoryFilter || family === categoryFilter);
  }

  function populateFilters() {
    const modeSelect = document.getElementById("bannedModeFilter");
    const categorySelect = document.getElementById("bannedCategoryFilter");
    if (!modeSelect || !categorySelect) return;

    DATA.forEach(modeBlock => {
      const opt = el("option", "", modeBlock.mode);
      opt.value = modeBlock.mode;
      modeSelect.appendChild(opt);
    });

    CATEGORY_OPTIONS.forEach(category => {
      const opt = el("option", "", category);
      opt.value = category;
      categorySelect.appendChild(opt);
    });
  }

  function render() {
    const root = document.getElementById("bannedItemsRoot");
    const search = document.getElementById("bannedSearch");
    const modeFilter = document.getElementById("bannedModeFilter");
    const categoryFilter = document.getElementById("bannedCategoryFilter");
    const count = document.getElementById("bannedResultCount");
    if (!root) return;

    const query = (search?.value || "").trim().toLowerCase();
    const modeValue = modeFilter?.value || "";
    const categoryValue = categoryFilter?.value || "";

    root.innerHTML = "";
    let visibleItems = 0;
    let visibleGroups = 0;

    DATA.forEach(modeBlock => {
      const modeSection = el("section", "banned-mode-section");
      const modeHeader = el("div", "banned-mode-head");
      modeHeader.appendChild(el("h2", "", modeBlock.mode));
      modeHeader.appendChild(el("p", "", modeBlock.mode === "Battle Royale" ? "Restricted BR classes, vehicles, and special items." : "Restricted MP weapons, attachments, utility, perks, wildcards, plus the only allowed Operator Skills."));
      modeSection.appendChild(modeHeader);

      const grid = el("div", "banned-category-grid");

      modeBlock.groups.forEach(group => {
        const items = group.items.filter(item => itemMatches(modeBlock.mode, group, item, query, modeValue, categoryValue));
        if (!items.length) return;

        visibleItems += items.length;
        visibleGroups += 1;

        const card = el("article", "banned-category-card" + (group.allowed ? " is-allowed" : ""));
        card.dataset.mode = modeBlock.mode;
        card.dataset.category = group.category;

        const top = el("div", "banned-card-top");
        top.appendChild(el("h3", "", group.category));
        top.appendChild(el("span", "banned-count-pill", `${items.length} ${items.length === 1 ? "item" : "items"}`));
        card.appendChild(top);

        const list = el("div", "banned-chip-list");
        items.forEach(item => {
          const chip = el("span", group.allowed ? "allowed-chip" : "banned-chip", item);
          list.appendChild(chip);
        });
        card.appendChild(list);
        grid.appendChild(card);
      });

      if (grid.children.length) {
        modeSection.appendChild(grid);
        root.appendChild(modeSection);
      }
    });

    if (count) {
      count.textContent = `${visibleItems} ${visibleItems === 1 ? "item" : "items"} shown · ${visibleGroups} ${visibleGroups === 1 ? "category" : "categories"}`;
    }

    if (!visibleItems) {
      const empty = el("div", "card banned-empty");
      empty.appendChild(el("h2", "", "No banned items found"));
      empty.appendChild(el("p", "", "Try a different keyword or reset the filters."));
      root.appendChild(empty);
    }

    if (window.CODM_I18N) window.CODM_I18N.apply(root);
  }

  function reset() {
    const search = document.getElementById("bannedSearch");
    const modeFilter = document.getElementById("bannedModeFilter");
    const categoryFilter = document.getElementById("bannedCategoryFilter");
    if (search) search.value = "";
    if (modeFilter) modeFilter.value = "";
    if (categoryFilter) categoryFilter.value = "";
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateFilters();
    render();
    ["bannedSearch", "bannedModeFilter", "bannedCategoryFilter"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", render);
      document.getElementById(id)?.addEventListener("change", render);
    });
    document.getElementById("bannedFilterReset")?.addEventListener("click", reset);
  });
})();
