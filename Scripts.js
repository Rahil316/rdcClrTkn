// COLOR SYSTEM
const colorSchemes = {
  rDesignNew: {
    name: "RDS",
    clrGroups: {
      primary: "5d10d1",
      secondary: "904AAA",
      tertiary: "7E8088",
      black: "1C2230",
      gray: "87899D",
      success: "47B872",
      danger: "ED3E3E",
      warning: "F2AA30",
      info: "206BB0",
    },
    weightCount: 23,
    lightBg: "FFFFFF",
    darkBg: "000000",
    weightNames: "",
    roles: {
      text: { name: "Text", shortName: "tx", minContrast: "5", gaps: 3 },
      layer: { name: "Layer", shortName: "ly", minContrast: "0", gaps: 1 },
      stroke: { name: "Stroke", shortName: "st", minContrast: "1", gaps: 1 },
      fill: { name: "Fill", shortName: "fi", minContrast: "4", gaps: 2 },
    },
    variations: {
      weakest: { name: "Weakest", code: "1" },
      weak: { name: "Weak", code: "2" },
      base: { name: "Base", code: "3" },
      strong: { name: "Strong", code: "4" },
      stronger: { name: "Stronger", code: "5" },
    },
  },
};

// COLOR SYSTEM GENERATOR
function variableMaker(clrSys) {
  const clrGroups = clrSys.clrGroups;
  const clrRoles = clrSys.roles;
  const clrWeights = seriesMaker(clrSys.weightCount);

  const lightBg = normalizeHex(clrSys.lightBg) || "#FFFFFF";
  const darkBg = normalizeHex(clrSys.darkBg) || "#000000";

  const rawVarObj = {};
  const conVarObj = { light: {}, dark: {} };
  const errors = { critical: [], warnings: [], notices: [] };

  // --------------------------------------------
  // RAW COLORS
  // --------------------------------------------
  for (const group in clrGroups) {
    const seed = normalizeHex(clrGroups[group]) || "#000000";
    const colorVars = colorCalSplit(seed, clrWeights);
    colorVars.reverse();

    rawVarObj[group] = {};

    clrWeights.forEach((w, idx) => {
      const val = normalizeHex(colorVars[idx]) || seed;

      rawVarObj[group][w] = {
        value: val,
        lightContrast: {
          ratio: contrastRatio(val, lightBg),
          rating: contrastRating(val, lightBg),
        },
        darkContrast: {
          ratio: contrastRatio(val, darkBg),
          rating: contrastRating(val, darkBg),
        },
      };
    });
  }

  // --------------------------------------------
  // INTERNAL: can baseIdx satisfy all offsets?
  // --------------------------------------------
  function canUseBaseIndex(group, baseIdx, role, themeName) {
    const gap = role.gaps;
    const minC = parseFloat(role.minContrast);
    const themeKey = themeName + "Contrast";

    const offsets = {
      weakest: -2 * gap,
      weak: -gap,
      base: 0,
      strong: 0 + gap,
      stronger: 2 * gap,
    };

    for (const offset of Object.values(offsets)) {
      const idx = baseIdx + offset;

      if (idx < 0 || idx >= clrWeights.length) return false;

      const weight = clrWeights[idx];
      const ratio = rawVarObj[group][weight][themeKey].ratio;

      if (ratio == null || ratio < minC) return false;
    }
    return true;
  }

  // --------------------------------------------
  // CONTEXTUAL TOKENS
  // --------------------------------------------
  const themes = [
    { name: "light", bg: lightBg },
    { name: "dark", bg: darkBg },
  ];

  themes.forEach((theme) => {
    const t = theme.name;

    for (const group in rawVarObj) {
      conVarObj[t][group] = {};

      for (const roleName in clrRoles) {
        const role = clrRoles[roleName];
        const gap = role.gaps;
        const minC = parseFloat(role.minContrast);

        conVarObj[t][group][roleName] = {};

        // --------------------------------------------
        // Find a usable baseIdx
        let baseIdx = -1;

        // Perfect match search
        for (let i = 0; i < clrWeights.length; i++) {
          const w = clrWeights[i];
          const c = rawVarObj[group][w][t + "Contrast"].ratio;

          if (c >= minC && canUseBaseIndex(group, i, role, t)) {
            baseIdx = i;
            break;
          }
        }

        // fallback if no perfect baseIdx found
        if (baseIdx === -1) {
          let best = { idx: -1, range: -1 };

          for (let i = 0; i < clrWeights.length; i++) {
            const w = clrWeights[i];
            const c = rawVarObj[group][w][t + "Contrast"].ratio;

            if (c >= minC) {
              const r = Math.min(i, clrWeights.length - 1 - i);
              if (r > best.range) best = { idx: i, range: r };
            }
          }

          if (best.idx !== -1) {
            baseIdx = best.idx;
            errors.warnings.push({
              color: group,
              role: roleName,
              theme: t,
              warning: "Min contrast met only partially; using best fallback.",
            });
          } else {
            baseIdx = Math.floor(clrWeights.length / 2);
            errors.critical.push({
              color: group,
              role: roleName,
              theme: t,
              error: "Cannot meet minimum contrast for any weight.",
            });
          }
        }

        // --------------------------------------------
        // ⭐ THE FIX: clamp baseIdx so strong/stronger never overflow
        // --------------------------------------------
        const maxOffset = 2 * gap;
        baseIdx = Math.min(
          Math.max(baseIdx, maxOffset),
          clrWeights.length - 1 - maxOffset
        );

        // --------------------------------------------
        // Generate variations
        // --------------------------------------------
        const offsets = {
          weakest: -2 * gap,
          weak: -gap,
          base: 0,
          strong: gap,
          stronger: 2 * gap,
        };

        for (const variation in offsets) {
          let idx = baseIdx + offsets[variation];
          let adjusted = false;

          if (idx < 0) {
            idx = 0;
            adjusted = true;
          }
          if (idx >= clrWeights.length) {
            idx = clrWeights.length - 1;
            adjusted = true;
          }

          const weight = clrWeights[idx];
          const data = rawVarObj[group][weight];

          conVarObj[t][group][roleName][variation] = {
            value: data.value,
            contrastRatio: data[t + "Contrast"].ratio,
            contrastRating: data[t + "Contrast"].rating,
            valueRef: `${group}-${weight}`,
            weight,
            baseWeightIndex: baseIdx,
            variationOffset: offsets[variation],
            isAdjusted: adjusted,
            theme: t,
          };

          if (adjusted) {
            errors.warnings.push({
              color: group,
              role: roleName,
              variation,
              theme: t,
              warning: `Variation '${variation}' clamped due to overflow`,
            });
          }
        }
      }
    }
  });

  return {
    raw: rawVarObj,
    con: conVarObj,
    errors,
    backgrounds: { light: lightBg, dark: darkBg },
  };
}

// DISPLAY FUNCTIONS
function displayColorTokens(collection) {
  const container = document.getElementById("rawColorsContainer");
  if (!container) return;

  container.classList.add("color-system-updating");
  const fragment = document.createDocumentFragment();

  if (collection.errors) fragment.appendChild(createDebugSection(collection));
  fragment.appendChild(createErrorSection(collection.errors));
  fragment.appendChild(createRawSection(collection.raw));
  fragment.appendChild(createThemeSection(collection.con, "light"));
  fragment.appendChild(createThemeSection(collection.con, "dark"));

  container.innerHTML = "";
  container.appendChild(fragment);

  requestAnimationFrame(() => {
    container.classList.remove("color-system-updating");
  });
}

function getOptimalTextColor(bg) {
  const b = normalizeHex(bg) || "#000000";
  return contrastRatio(b, "#000000") > contrastRatio(b, "#FFFFFF")
    ? "black"
    : "white";
}

function createErrorSection(errors) {
  const createListHTML = (arr) =>
    arr
      .map(
        (e) =>
          `<div class="error-item">${e.error || e.warning || e.notice}</div>`
      )
      .join("");
  const section = document.createElement("div");
  section.className = "errors-section";
  section.innerHTML = `
      <div class="errors-header">
        <h4>⚠️ Warnings & Errors</h4>
        <button class="errors-toggle collapsed">▼</button>
      </div>
      <div class="errors-content">
        <div class="error-category"><strong>Critical (${
          errors.critical?.length || 0
        })</strong>${createListHTML(errors.critical || [])}</div>
        <div class="error-category"><strong>Warnings (${
          errors.warnings?.length || 0
        })</strong>${createListHTML(errors.warnings || [])}</div>
        <div class="error-category"><strong>Notices (${
          errors.notices?.length || 0
        })</strong>${createListHTML(errors.notices || [])}</div>
      </div>
    `;
  const header = section.querySelector(".errors-header");
  const content = section.querySelector(".errors-content");
  const toggle = section.querySelector(".errors-toggle");
  header.addEventListener("click", () => {
    const isCollapsed = toggle.classList.contains("collapsed");
    toggle.classList.toggle("collapsed", !isCollapsed);
    content.classList.toggle("expanded", isCollapsed);
  });
  return section;
}

function createRawSection(raw) {
  const rawHTML = Object.entries(raw)
    .map(([colorGroup, weights]) => {
      const swatchesHTML = Object.entries(weights)
        .map(([weight, data]) => {
          if (!data?.value) return "";
          const colorValue = normalizeHex(data.value) || "#000000";
          const textColor = getOptimalTextColor(colorValue);
          return `
          <div class="color-swatch" style="background-color:${colorValue}; color:${textColor}">
            <div class="swatch-info">
              <div class="weight">${weight}</div>
              <div class="hex">${colorValue}</div>
              <div class="hsl">${hexToHsl(colorValue)}</div>
              <div class="contrast-light"><span class="contrast-label">Light BG:</span>${(
                data.lightContrast.ratio || 0
              ).toFixed(2)} - ${data.lightContrast.rating}</div>
              <div class="contrast-dark"><span class="contrast-label">Dark BG:</span>${(
                data.darkContrast.ratio || 0
              ).toFixed(2)} - ${data.darkContrast.rating}</div>
            </div>
          </div>
        `;
        })
        .join("");
      return `<div class="color-group"><h3>${colorGroup.toUpperCase()}</h3><div class="swatches-container">${swatchesHTML}</div></div>`;
    })
    .join("");
  const section = document.createElement("div");
  section.className = "raw-colors-section";
  section.innerHTML = `<h4>Raw Color Palette</h4>${rawHTML}`;
  return section;
}

function createThemeSection(con, theme) {
  const themeData = con[theme];
  const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);
  const contextualHTML = Object.entries(themeData)
    .map(([colorGroup, roles]) => {
      if (!roles || Object.keys(roles).length === 0) {
        return `<div class="contextual-group"><h4>${colorGroup.toUpperCase()}</h4><p>No roles generated</p></div>`;
      }
      const rolesHTML = Object.entries(roles)
        .map(([role, variations]) => {
          if (!variations || Object.keys(variations).length === 0) return "";
          const variationsHTML = Object.entries(variations)
            .map(([variation, data]) => {
              if (!data?.value) return "";
              const colorValue = normalizeHex(data.value) || "#000000";
              const textColor = getOptimalTextColor(colorValue);
              return `
            <div class="color-token" style="background-color:${colorValue}; color:${textColor}">
              <div class="token-info">
                <div class="variation">${variation}</div>
                <div class="hex">${colorValue}</div>
                <div class="ref">Ref: ${data.valueRef}</div>
                <div class="contrast">Contrast: ${(
                  data.contrastRatio || 0
                ).toFixed(2)} - ${data.contrastRating}</div>
                <div class="theme-info">${themeName} Theme</div>
                ${
                  data.isAdjusted
                    ? '<div class="offset-info">Adjusted</div>'
                    : ""
                }
              </div>
            </div>
          `;
            })
            .join("");
          return variationsHTML
            ? `<div class="role-group"><h5>${role}</h5><div class="variations-container">${variationsHTML}</div></div>`
            : "";
        })
        .join("");
      return rolesHTML
        ? `<div class="contextual-group"><h4>${colorGroup.toUpperCase()}</h4>${rolesHTML}</div>`
        : "";
    })
    .join("");
  const section = document.createElement("div");
  section.className = `theme-section ${theme}-theme`;
  section.innerHTML = `<h4>${themeName} Theme - Contextual Tokens</h4>${contextualHTML}`;
  return section;
}

function createDebugSection(collection) {
  const { raw, con, errors } = collection;
  const section = document.createElement("div");
  section.className = "debug-section";
  section.innerHTML = `
      <h4>Debug Info</h4>
      <div class="debug-stats">
        <p><strong>Raw groups:</strong> ${Object.keys(raw).length}</p>
        <p><strong>Light theme groups:</strong> ${
          Object.keys(con.light).length
        }</p>
        <p><strong>Dark theme groups:</strong> ${
          Object.keys(con.dark).length
        }</p>
        <p><strong>Critical errors:</strong> ${errors.critical?.length || 0}</p>
        <p><strong>Warnings:</strong> ${errors.warnings?.length || 0}</p>
      </div>
      <button id="exportCss" class="prBtn">Export CSS</button>
      <button id="downloadCsv" class="prBtn">Export CSV</button>
      <button id="logSummary" style="float:right;"class="prBtn">Log Summary to Console</button>
    `;
  setTimeout(() => {
    const btn = section.querySelector("#logSummary");
    if (btn)
      btn.addEventListener("click", () => {
        console.log("Color system summary:", {
          rawGroups: Object.keys(raw),
          lightGroups: Object.keys(con.light),
          darkGroups: Object.keys(con.dark),
          errorsSummary: {
            critical: errors.critical?.length || 0,
            warnings: errors.warnings?.length || 0,
          },
        });
      });
  }, 0);
  return section;
}

// CONTROL PANEL FUNCTIONS (kept mostly, but input handling improved)
function createColorInputs(colorScheme, onUpdate) {
  const targetContainer = document.getElementById("colorInputs");
  if (!targetContainer) return;
  targetContainer.innerHTML = "<h4>Color System Controls</h4>";

  // ----- Basic Settings -----
  const basicSection = createSection("Basic Settings");
  basicSection.appendChild(
    createInput("name", "System Name", colorScheme.name)
  );
  basicSection.appendChild(
    createInput(
      "weightCount",
      "Weight Count",
      colorScheme.weightCount,
      "number"
    )
  );
  targetContainer.appendChild(basicSection);

  // ----- Background Colors -----
  const backgroundsSection = createSection("Theme Background Colors");
  backgroundsSection.appendChild(
    createColorInput(
      "lightBg",
      "Light Theme Background",
      colorScheme.lightBg || "FFFFFF"
    )
  );
  backgroundsSection.appendChild(
    createColorInput(
      "darkBg",
      "Dark Theme Background",
      colorScheme.darkBg || "000000"
    )
  );
  targetContainer.appendChild(backgroundsSection);

  // ----- Color Groups -----
  targetContainer.appendChild(createColorGroupsSection(colorScheme));

  // ----- Roles -----
  targetContainer.appendChild(createRolesSection(colorScheme));

  // ----- INPUT HANDLERS -----
  let updateTimeout;
  const inputs = targetContainer.querySelectorAll("input");

  inputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      const path = e.target.dataset.path.split(".");
      const rawVal = e.target.value;
      const type = e.target.type;

      if (updateTimeout) clearTimeout(updateTimeout);

      updateTimeout = setTimeout(() => {
        // Hex text fields
        if (type === "text" && e.target.classList.contains("color-text")) {
          const normalized = normalizeHex(rawVal);
          if (!normalized) return; // don't commit until valid
          updateColorScheme(colorScheme, path, normalized.replace("#", ""));
        }

        // Numeric fields (gaps, weightCount, minContrast)
        else if (type === "number") {
          const n = rawVal === "" ? 0 : Number(rawVal);
          updateColorScheme(
            colorScheme,
            path,
            Number.isFinite(n) ? Math.floor(n) : 0
          );
        }

        // Everything else
        else {
          updateColorScheme(colorScheme, path, rawVal);
        }

        const updatedCopy = JSON.parse(JSON.stringify(colorScheme));
        onUpdate(updatedCopy);
      }, 350);
    });

    input.addEventListener("change", (e) => {
      const path = e.target.dataset.path.split(".");
      const rawVal = e.target.value;
      const type = e.target.type;

      if (type === "number") {
        const n = rawVal === "" ? 0 : Number(rawVal);
        updateColorScheme(
          colorScheme,
          path,
          Number.isFinite(n) ? Math.floor(n) : 0
        );
      } else {
        updateColorScheme(colorScheme, path, rawVal.replace("#", ""));
      }

      const updatedCopy = JSON.parse(JSON.stringify(colorScheme));
      onUpdate(updatedCopy);
    });
  });
}

function createColorGroupsSection(colorScheme) {
  const colorsSection = createSection("Color Groups");
  for (const [key, value] of Object.entries(colorScheme.clrGroups)) {
    const formattedLabel = key.charAt(0).toUpperCase() + key.slice(1);
    colorsSection.appendChild(
      createColorGroupInput(key, formattedLabel, value)
    );
  }
  return colorsSection;
}

function createColorGroupInput(key, label, value) {
  const div = document.createElement("div");
  div.className = "input-group color-input";
  div.innerHTML = `
      <label>${label}</label>
      <div class="color-input-wrapper">
        <input type="color" value="#${value}" data-path="clrGroups.${key}" class="color-picker">
        <input type="text" value="${value}" data-path="clrGroups.${key}" class="color-text" placeholder="${label} color">
      </div>
    `;
  setupColorInputSync(div);
  return div;
}

function createColorInput(path, label, value) {
  const div = document.createElement("div");
  div.className = "input-group color-input";
  div.innerHTML = `
      <label>${label}</label>
      <div class="color-input-wrapper">
        <input type="color" value="#${value}" data-path="${path}" class="color-picker">
        <input type="text" value="${value}" data-path="${path}" class="color-text" placeholder="${label}">
      </div>
    `;
  setupColorInputSync(div);
  return div;
}

function setupColorInputSync(container) {
  const colorPicker = container.querySelector(".color-picker");
  const colorText = container.querySelector(".color-text");

  colorPicker.addEventListener("input", (e) => {
    const hexValue = e.target.value.replace("#", "");
    colorText.value = hexValue.toUpperCase();
  });

  colorText.addEventListener("input", (e) => {
    let hexValue = e.target.value.replace("#", "").toUpperCase();
    if (/^[0-9A-F]{6}$/.test(hexValue)) {
      colorPicker.value = "#" + hexValue;
    }
  });
}

function createRolesSection(colorScheme) {
  const rolesSection = createSection("Roles Configuration");
  for (const [roleKey, role] of Object.entries(colorScheme.roles)) {
    const roleDiv = document.createElement("div");
    roleDiv.className = "role-control-group";
    roleDiv.innerHTML = `<h4>${role.name}</h4>`;
    roleDiv.appendChild(
      createInput(
        `roles.${roleKey}.minContrast`,
        "Min Contrast",
        role.minContrast,
        "number"
      )
    );
    roleDiv.appendChild(
      createInput(`roles.${roleKey}.gaps`, "Gaps", role.gaps, "number")
    );
    roleDiv.appendChild(
      createInput(`roles.${roleKey}.shortName`, "Short Name", role.shortName)
    );
    rolesSection.appendChild(roleDiv);
  }
  return rolesSection;
}

function createSection(title) {
  const section = document.createElement("div");
  section.className = "control-section";
  section.innerHTML = `<h3>${title}</h3>`;
  return section;
}

function createInput(path, label, value, type = "text") {
  const div = document.createElement("div");
  div.className = "input-group";
  div.innerHTML = `<label>${label}</label><input type="${type}" value="${value}" data-path="${path}">`;
  return div;
}

function updateColorScheme(colorScheme, path, value) {
  // Handle backgrounds (strip #)
  if (path[0] === "lightBg" || path[0] === "darkBg") {
    colorScheme[path[0]] = value.replace("#", "");
    return;
  }

  // Handle color groups (strip #)
  if (path[0] === "clrGroups") {
    colorScheme.clrGroups[path[1]] = value.replace("#", "");
    return;
  }

  // Walk nested object
  let current = colorScheme;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }

  const key = path[path.length - 1];

  // Numeric fields
  if (key === "gaps" || key === "minContrast" || key === "weightCount") {
    const n = value === "" ? 0 : Number(value);
    current[key] = Number.isFinite(n) ? n : 0;
    return;
  }

  // Everything else stored raw
  current[key] = value;
}

// INITIALIZATION
function initializeColorControls() {
  // Always work on a deep copy so UI changes do not mutate the original
  const editable = JSON.parse(JSON.stringify(colorSchemes.rDesignNew));

  // Build all UI inputs + wire input handlers
  createColorInputs(editable, (updatedScheme) => {
    const output = variableMaker(updatedScheme);
    displayColorTokens(output);
  });

  // Render initial output
  displayColorTokens(variableMaker(editable));

  document.addEventListener("click", (e) => {
    if (e.target.id === "exportCss") {
      downloadCss();
    }

    if (e.target.id === "downloadCsv") {
      const updated = variableMaker(editable); // current token output
      const flat = flattenTokensForCsv(updated); // flatten it
      const csv = generateCSV({
        data: flat,
        columns: [
          { label: "Theme", path: "theme" },
          { label: "Group", path: "group" },
          { label: "Role", path: "role" },
          { label: "Variation", path: "variation" },
          { label: "Weight", path: "weight" },
          { label: "Hex Value", path: "value" },
          { label: "Contrast Ratio", path: "contrastRatio" },
          { label: "Rating", path: "contrastRating" },
        ],
      });

      downloadCSV("tokens.csv", csv);
    }
  });

  // Export button handler
  document.addEventListener("click", (e) => {
    if (e.target.id === "exportCss") {
      downloadCss();
    }
  });
}

document.addEventListener("DOMContentLoaded", initializeColorControls);
