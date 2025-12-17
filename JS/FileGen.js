//Generate CSS file
function flattenToCss(collection) {
  const { raw, con, backgrounds } = collection;
  const cssVars = { light: {}, dark: {} };

  // Raw colors (common to both themes) - include leading '#'
  Object.entries(raw).forEach(([group, weights]) => {
    Object.entries(weights).forEach(([weight, data]) => {
      const varName = `--${group}-${weight}`;
      const value = normalizeHex(data.value) || "#000000";
      cssVars.light[varName] = value;
      cssVars.dark[varName] = value;
    });
  });

  // Contextual tokens reference raw color variables
  Object.entries(con).forEach(([theme, themeData]) => {
    Object.entries(themeData).forEach(([group, roles]) => {
      Object.entries(roles).forEach(([role, variations]) => {
        Object.entries(variations).forEach(([variation, data]) => {
          const refParts = (data.valueRef || "").split("-");
          const refGroup = refParts[0];
          const refWeight = refParts[1];
          const rawVarName = `--${refGroup}-${refWeight}`;
          cssVars[theme][
            `--${group}-${role}-${variation}`
          ] = `var(${rawVarName})`;
        });
      });
    });
  });

  // Backgrounds (include #)
  cssVars.light["--bg-primary"] = normalizeHex(backgrounds.light) || "#FFFFFF";
  cssVars.dark["--bg-primary"] = normalizeHex(backgrounds.dark) || "#000000";

  return cssVars;
}

function generateCss(cssVars) {
  let css = `/* Color Tokens - Auto-generated */\n\n`;
  // Light theme (default)
  css += `:root {\n`;
  Object.entries(cssVars.light).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n\n`;

  // Dark theme using prefers-color-scheme
  css += `@media (prefers-color-scheme: dark) {\n  :root {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `    ${variable}: ${value};\n`;
  });
  css += `  }\n}\n\n`;

  // Utility `.dark` class
  css += `.dark {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n`;
  return css;
}

function downloadCss() {
  const scheme = JSON.parse(JSON.stringify(colorSchemes.rDesignNew));
  const collection = variableMaker(scheme);
  const cssVars = flattenToCss(collection);
  const cssContent = generateCss(cssVars);
  const blob = new Blob([cssContent], { type: "text/css" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tokens.css";
  a.click();
  URL.revokeObjectURL(url);
}

//
//
//

function generateCSV({ data, columns }) {
  const rows = Array.isArray(data)
    ? data
    : Object.entries(data).map(([key, value]) => ({ key, ...value }));

  const header = columns.map((col) => col.label);

  const body = rows.map((row) => {
    return columns
      .map((col) => {
        const val = getValueByPath(row, col.path);
        return escapeCSV(val ?? "");
      })
      .join(",");
  });

  return [header.join(","), ...body].join("\n");
}

function getValueByPath(obj, path) {
  return path
    .split(".")
    .reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function escapeCSV(value) {
  const str = String(value).replace(/"/g, '""');
  return /["\n,]/.test(str) ? `"${str}"` : str;
}

function flattenTokensForCsv(out) {
  const result = [];

  ["light", "dark"].forEach((theme) => {
    const groups = out.con[theme];

    for (const group in groups) {
      const roles = groups[group];

      for (const role in roles) {
        const variations = roles[role];

        for (const variation in variations) {
          const item = variations[variation];

          result.push({
            theme,
            group,
            role,
            variation,
            weight: item.weight,
            value: item.value,
            contrastRatio: item.contrastRatio,
            contrastRating: item.contrastRating,
          });
        }
      }
    }
  });

  return result;
}

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
