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
