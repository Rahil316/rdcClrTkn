// Start:- Color Utilities

function validHex(hex) {
  if (
    typeof hex !== "string" ||
    !/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)
  ) {
    return false;
  }
  return true;
}

function hexToRgb(hex) {
  if (!validHex(hex)) return console.error("Invalid Hex Code") || null;
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  let bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl(r, g, b) {
  if ([r, g, b].some((v) => v < 0 || v > 255))
    return console.error("Invalid Values") || null;
  (r /= 255), (g /= 255), (b /= 255);
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) h = s = 0;
  else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h =
      (max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4) * 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hexToHsl(hex) {
  if (!validHex(hex))
    return console.error("Invalid Hex Code @hexToHsl") || null;
  return rgbToHsl(...hexToRgb(hex));
}

function hexToHue(hex) {
  return hexToHsl(hex)?.[0] ?? null;
}

function hexToSat(hex) {
  return hexToHsl(hex)?.[1] ?? null;
}

function hexToLum(hex) {
  return hexToHsl(hex)?.[2] ?? null;
}

function hslToRgb(h, s, l) {
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100)
    return console.error("Invalid Values") || null;
  (s /= 100), (l /= 100);
  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  let [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
      ? [x, c, 0]
      : h < 180
      ? [0, c, x]
      : h < 240
      ? [0, x, c]
      : h < 300
      ? [x, 0, c]
      : [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r, g, b) {
  if ([r, g, b].some((v) => v < 0 || v > 255))
    return console.error("Invalid Values") || null;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function hslToHex(h, s, l) {
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100)
    return console.error("Invalid Values") || null;
  return rgbToHex(...hslToRgb(h, s, l));
}

function relLum(hex) {
  let [r, g, b] = hexToRgb(hex)?.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) ?? [0, 0, 0];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  if (!validHex(hex1) || !validHex(hex2))
    return console.error("Invalid Values") || null;
  let lum1 = relLum(hex1),
    lum2 = relLum(hex2);
  return Number(
    ((Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05)).toFixed(2)
  );
}

function contrastRating(hex1, hex2) {
  if (!validHex(hex1) || !validHex(hex2))
    return console.error("Invalid Values") || null;
  let ratio = contrastRatio(hex1, hex2);
  return ratio < 3
    ? "Fail"
    : ratio < 4.5
    ? "AA Large"
    : ratio < 7
    ? "AA"
    : "AAA";
}

const seriesMaker = (x) => {
  let result = [];
  for (let i = 1; i <= x; i++) {
    result.push(i.toString());
  }
  return result;
};

function colorCalSplit(hexIn, weights) {
  let [hue, satu, lumn] = hexToHsl(hexIn);

  let midPoint = Math.ceil(weights.length / 2);
  let lightGap = (100 - lumn) / midPoint;
  let darkGap = lumn / midPoint;
  let lumSeq = [];

  for (let i = 1; i < midPoint; i++) {
    lumSeq.push(darkGap * i);
  }
  lumSeq.push(lumn);
  for (let i = 1; i < midPoint; i++) {
    lumSeq.push(lumn + i * lightGap);
  }

  let output = lumSeq.map((x) => hslToHex(hue, satu, x));
  output[midPoint - 1] = hexIn;
  return output.reverse();
}

function colorCalEven(hexIn, weights) {
  let output = [];
  let lumSeq = [];
  for (let i = 1; i <= weights.length; i++) {
    lumSeq.push(100 - (100 / (weights.length + 1)) * i);
  }
  let hue = hexToHue(hexIn);
  let satu = hexToSat(hexIn);
  output = lumSeq.map((x) => hslToHex(hue, satu, x));
  return output;
}

// End:- Color Utilities

// #######################################################################

// Defining color Scheme
// Start:- Color Definitions
//

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
    weightCount: 11,
    lightBg: "FFFFFF", // Light theme background
    darkBg: "000000", // Dark theme background
    weightNames: "",
    roles: {
      text: {
        name: "Text",
        shortName: "tx",
        minContrast: "7.5",
        gaps: 2,
        description: "Use these tokens for text",
      },
      layer: {
        name: "Layer",
        shortName: "ly",
        minContrast: "0",
        gaps: 1,
        description:
          "Use these tokens for layers and surfaces like backgrounds of cards and other sections",
      },
      stroke: {
        name: "Stroke",
        shortName: "st",
        minContrast: "1",
        gaps: 1,
        description: "Use these tokens for strokes and borders",
      },
      fill: {
        name: "Fill",
        shortName: "fi",
        minContrast: "4",
        gaps: 2,
        description: "Use these tokens for filling shapes like buttons",
      },
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

// End- Color Definitions
// #######################################################################
// Enhanced Color Maker - Generates both themes simultaneously

function variableMaker(clrSys) {
  let clrGroups = clrSys.clrGroups;
  let clrRoles = clrSys.roles;
  let clrVariations = clrSys.variations;
  let clrWeights = seriesMaker(clrSys.weightCount);

  // Default backgrounds if not provided
  let lightBg = clrSys.lightBg || "FFFFFF";
  let darkBg = clrSys.darkBg || "000000";

  let rawVarObj = {};
  let conVarObj = {
    light: {},
    dark: {},
  };
  let errors = [];

  // Generate Raw Variable Object (common for both themes)
  for (const groupName in clrGroups) {
    let colorVars = colorCalSplit(clrGroups[groupName], clrWeights);

    if (!rawVarObj[groupName]) {
      rawVarObj[groupName] = {};
    }

    for (const [i, weight] of clrWeights.entries()) {
      if (!rawVarObj[groupName][weight]) {
        rawVarObj[groupName][weight] = {};
      }

      rawVarObj[groupName][weight].value = colorVars[i];

      // Calculate contrast against both white and black for raw palette
      rawVarObj[groupName][weight].lightContrast = {
        ratio: contrastRatio(colorVars[i], lightBg),
        rating: contrastRating(colorVars[i], lightBg),
      };
      rawVarObj[groupName][weight].darkContrast = {
        ratio: contrastRatio(colorVars[i], darkBg),
        rating: contrastRating(colorVars[i], darkBg),
      };
    }
  }

  // Generate Contextual Variable Object for both themes
  const themes = [
    { name: "light", bgColor: lightBg },
    { name: "dark", bgColor: darkBg },
  ];

  themes.forEach((theme) => {
    for (const clr in rawVarObj) {
      if (!conVarObj[theme.name][clr]) conVarObj[theme.name][clr] = {};

      for (const roleName in clrRoles) {
        const role = clrRoles[roleName];
        if (!conVarObj[theme.name][clr][roleName])
          conVarObj[theme.name][clr][roleName] = {};

        let optimalBaseIndex = -1;
        const minContrast = parseFloat(role.minContrast);
        const gap = role.gaps;

        // Find optimal base that meets contrast requirements for this theme
        for (let i = 0; i < clrWeights.length; i++) {
          const baseContrast =
            rawVarObj[clr][clrWeights[i]][`${theme.name}Contrast`].ratio;
          const weakestIndex = i - 2 * gap;
          const strongestIndex = i + 2 * gap;

          if (
            baseContrast >= minContrast &&
            weakestIndex >= 0 &&
            strongestIndex < clrWeights.length
          ) {
            optimalBaseIndex = i;
            break;
          }
        }

        // Fallback logic
        if (optimalBaseIndex === -1) {
          let bestBaseIndex = -1;
          let bestRange = -1;

          for (let i = 0; i < clrWeights.length; i++) {
            const baseContrast =
              rawVarObj[clr][clrWeights[i]][`${theme.name}Contrast`].ratio;
            if (baseContrast >= minContrast) {
              const availableRange = Math.min(i, clrWeights.length - 1 - i);
              if (availableRange > bestRange) {
                bestRange = availableRange;
                bestBaseIndex = i;
              }
            }
          }

          optimalBaseIndex =
            bestBaseIndex !== -1
              ? bestBaseIndex
              : Math.floor(clrWeights.length / 2);
          errors.push({
            color: clr,
            role: roleName,
            theme: theme.name,
            error: `Using best available base at index ${optimalBaseIndex}.`,
          });
        }

        // Generate variations for this theme
        const variationKeys = Object.keys(clrVariations);
        for (const variationKey of variationKeys) {
          let weightOffset = 0;
          switch (variationKey) {
            case "weakest":
              weightOffset = -2 * gap;
              break;
            case "weak":
              weightOffset = -gap;
              break;
            case "base":
              weightOffset = 0;
              break;
            case "strong":
              weightOffset = gap;
              break;
            case "stronger":
              weightOffset = 2 * gap;
              break;
          }

          let targetWeightIndex = optimalBaseIndex + weightOffset;
          targetWeightIndex = Math.max(
            0,
            Math.min(targetWeightIndex, clrWeights.length - 1)
          );
          const targetWeight = clrWeights[targetWeightIndex];
          const rawData = rawVarObj[clr][targetWeight];

          conVarObj[theme.name][clr][roleName][variationKey] = {
            value: rawData.value,
            contrastRatio: rawData[`${theme.name}Contrast`].ratio,
            contrastRating: rawData[`${theme.name}Contrast`].rating,
            valueRef: `${clr}-${targetWeight}`,
            weight: targetWeight,
            weightIndex: targetWeightIndex,
            baseWeightIndex: optimalBaseIndex,
            variationOffset: weightOffset,
            theme: theme.name,
            backgroundColor: theme.bgColor,
          };
        }
      }
    }
  });

  return {
    raw: rawVarObj,
    con: conVarObj,
    errors: errors,
    backgrounds: {
      light: lightBg,
      dark: darkBg,
    },
  };
}

// Enhanced Display Function
function displayColorTokens(collection) {
  const container = document.getElementById("rawColorsContainer");
  if (!container) return;

  const fragment = document.createDocumentFragment();
  const { raw, con, errors, backgrounds } = collection;

  // Build all sections in fragment first
  if (errors?.length) {
    fragment.appendChild(createErrorSection(errors));
  }

  //   fragment.appendChild(createBackgroundInfoSection(backgrounds));
  fragment.appendChild(createRawSection(raw));
  fragment.appendChild(createThemeSection(con, "light"));
  fragment.appendChild(createThemeSection(con, "dark"));
  fragment.appendChild(createDebugSection(collection));

  // Single DOM update
  container.innerHTML = "";
  container.appendChild(fragment);
}

// Helper functions
function createErrorSection(errors) {
  const errorHTML = errors
    .map(
      (error) =>
        `<div class="error-item">
          <strong>${error.color} - ${error.role}</strong> 
          (${error.theme}): ${error.error}
         </div>`
    )
    .join("");

  const section = document.createElement("div");
  section.className = "errors-section";
  section.innerHTML = `
    <div class="errors-header">
      <h4>⚠️ Warnings (${errors.length})</h4>
      <button class="errors-toggle collapsed">▼</button>
    </div>
    <div class="errors-content">
      <div class="error-list">${errorHTML}</div>
    </div>
  `;

  // Add click handler for accordion
  const header = section.querySelector(".errors-header");
  const content = section.querySelector(".errors-content");
  const toggle = section.querySelector(".errors-toggle");

  header.addEventListener("click", () => {
    const isCollapsed = toggle.classList.contains("collapsed");
    if (isCollapsed) {
      toggle.classList.remove("collapsed");
      content.classList.add("expanded");
    } else {
      toggle.classList.add("collapsed");
      content.classList.remove("expanded");
    }
  });

  return section;
}

function createRawSection(raw) {
  const rawHTML = Object.entries(raw)
    .map(([colorGroup, weights]) => {
      const swatchesHTML = Object.entries(weights)
        .map(([weight, data]) => {
          if (!data?.value) return "";
          const colorValue = data.value.startsWith("#")
            ? data.value
            : `#${data.value}`;

          // Use white text for dark colors, black text for light colors
          const useWhiteText = hexToLum(data.value) > 50;

          return `
        <div class="color-swatch" style="background-color:${colorValue}; color:${
            useWhiteText ? "black" : "white"
          }">
          <div class="swatch-info">
            <div class="weight">${weight}</div>
            <div class="hex">${colorValue}</div>
            <div class="contrast-light">
              <span class="contrast-label">Light BG:</span>
              ${data.lightContrast.ratio?.toFixed(2) || "N/A"} - ${
            data.lightContrast.rating || "N/A"
          }
            </div>
            <div class="contrast-dark">
              <span class="contrast-label">Dark BG:</span>
              ${data.darkContrast.ratio?.toFixed(2) || "N/A"} - ${
            data.darkContrast.rating || "N/A"
          }
            </div>
          </div>
        </div>
      `;
        })
        .join("");

      return `
      <div class="color-group">
        <h3>${colorGroup.toUpperCase()}</h3>
        <div class="swatches-container">${swatchesHTML}</div>
      </div>
    `;
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
        return `
        <div class="contextual-group">
          <h4>${colorGroup.toUpperCase()}</h4>
          <p>No roles generated for this color group</p>
        </div>
      `;
      }

      const rolesHTML = Object.entries(roles)
        .map(([role, variations]) => {
          if (!variations || Object.keys(variations).length === 0) return "";

          const variationsHTML = Object.entries(variations)
            .map(([variation, data]) => {
              if (!data?.value) return "";
              const colorValue = data.value.startsWith("#")
                ? data.value
                : `#${data.value}`;

              // Use appropriate text color based on contrast
              const useWhiteText = data.contrastRatio > 4.5;

              return `
          <div class="color-token" style="background-color:${colorValue}; color:${
                useWhiteText ? "white" : "black"
              }">
            <div class="token-info">
              <div class="variation">${variation}</div>
              <div class="hex">${colorValue}</div>
              <div class="ref">Ref: ${data.valueRef}</div>
              <div class="contrast">
                Contrast: ${data.contrastRatio?.toFixed(2) || "N/A"} - ${
                data.contrastRating || "N/A"
              }
              </div>
              <div class="theme-info">${themeName} Theme</div>
              ${
                data.baseWeightIndex !== data.weightIndex
                  ? '<div class="offset-info">Adjusted</div>'
                  : ""
              }
            </div>
          </div>
        `;
            })
            .join("");

          return variationsHTML
            ? `
        <div class="role-group">
          <h5>${role}</h5>
          <div class="variations-container">${variationsHTML}</div>
        </div>
      `
            : "";
        })
        .join("");

      return rolesHTML
        ? `
      <div class="contextual-group">
        <h4>${colorGroup.toUpperCase()}</h4>
        ${rolesHTML}
      </div>
    `
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
      <p><strong>Dark theme groups:</strong> ${Object.keys(con.dark).length}</p>
      <p><strong>Errors:</strong> ${errors?.length || 0}</p>
    </div>
    <button class="debug-btn" onclick="console.log('Full Collection:', ${JSON.stringify(
      collection
    ).replace(/"/g, "&quot;")})">
      Log Full Collection to Console
    </button>
  `;
  return section;
}

// Enhanced Control Code
function createColorInputs(colorScheme, onUpdate) {
  const targetContainer = document.getElementById("colorInputs");
  targetContainer.innerHTML = "<h4>Color System Controls</h4>";

  // Basic Settings
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

  const backgroundsSection = createSection("Theme Background Colors");
  backgroundsSection.appendChild(
    createColorInput(
      "lightBg",
      "Light Theme Background",
      colorScheme.lightBg || "FFFFFF",
      "lightBg"
    )
  );
  backgroundsSection.appendChild(
    createColorInput(
      "darkBg",
      "Dark Theme Background",
      colorScheme.darkBg || "000000",
      "darkBg"
    )
  );

  targetContainer.appendChild(basicSection);
  targetContainer.appendChild(backgroundsSection);

  const colorsSection = createSection("Color Groups");
  // Roles Configuration
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
  targetContainer.appendChild(rolesSection);

  // Add input event listeners
  targetContainer.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const path = e.target.dataset.path.split(".");
      updateColorScheme(path, e.target.value);
      onUpdate(colorScheme);
    });
  });

  function createSection(title) {
    const section = document.createElement("div");
    section.className = "control-section";
    section.innerHTML = `<h3>${title}</h3>`;
    return section;
  }

  function createInput(path, label, value, type = "text") {
    const div = document.createElement("div");
    div.className = "input-group";
    div.innerHTML = `
      <label>${label}</label>
      <input type="${type}" value="${value}" data-path="${path}">
    `;
    return div;
  }

  function createColorInput(path, label, value, type = "background") {
    const div = document.createElement("div");
    div.className = "input-group color-input";
    div.innerHTML = `
    <label>${label}</label>
    <div class="color-input-wrapper">
      <input type="color" value="#${value}" data-path="${path}">
      <input type="text" value="${value}" data-path="${path}" placeholder="${label}">
    </div>
  `;
    return div;
  }

  function updateColorScheme(path, value) {
    let current = colorScheme;

    // Handle background colors (lightBg, darkBg) - they are direct properties
    if (path[0] === "lightBg" || path[0] === "darkBg") {
      colorScheme[path[0]] = value.replace("#", "");
      return;
    }

    // Handle nested properties (roles, clrGroups)
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    const lastKey = path[path.length - 1];
    // Handle color inputs specially - remove # if present
    if (path.includes("clrGroups")) {
      current[lastKey] = value.replace("#", "");
    } else {
      current[lastKey] = value;
    }
  }
}

// Initialize the inputs and set up real-time updates
function initializeColorControls() {
  // Create a copy to avoid modifying the original
  const editableScheme = JSON.parse(JSON.stringify(colorSchemes.rDesignNew));

  createColorInputs(editableScheme, (updatedScheme) => {
    // Regenerate colors and update display
    const newCollection = variableMaker(updatedScheme);
    displayColorTokens(newCollection);
  });

  // Initial generation
  const initialCollection = variableMaker(editableScheme);
  displayColorTokens(initialCollection);
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeColorControls();
});
