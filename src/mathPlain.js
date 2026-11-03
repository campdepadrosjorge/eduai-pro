// src/mathPlain.js
// Convierte notación LaTeX común a texto plano legible, por si el modelo
// igual genera fórmulas con \frac, $, \times, etc. Se usa en el visor y en
// los exports para que la matemática se vea bien en pantalla, Word y PDF.

export function latexToPlain(text) {
  if (!text) return text;
  var t = text;

  // \frac{a}{b} y \dfrac{a}{b} -> a/b (varias pasadas por anidamiento simple)
  for (var i = 0; i < 4; i++) {
    t = t.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2");
  }
  // \sqrt{x} -> √(x)
  t = t.replace(/\\sqrt\s*\{([^{}]+)\}/g, "√($1)");
  // operadores y símbolos
  t = t.replace(/\\times/g, "×")
       .replace(/\\div/g, "÷")
       .replace(/\\cdot/g, "·")
       .replace(/\\pm/g, "±")
       .replace(/\\leq/g, "≤").replace(/\\geq/g, "≥")
       .replace(/\\neq/g, "≠")
       .replace(/\\approx/g, "≈")
       .replace(/\\le\b/g, "≤").replace(/\\ge\b/g, "≥")
       .replace(/\\left/g, "").replace(/\\right/g, "")
       .replace(/\\quad/g, "  ").replace(/\\qquad/g, "    ")
       .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "");
  // \text{...} -> ...
  t = t.replace(/\\text\s*\{([^{}]+)\}/g, "$1");
  // quitar delimitadores de modo matemático $$...$$ y $...$
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, "$1").replace(/\$([^$\n]+)\$/g, "$1");
  // comando residual \algo -> quitar la barra (deja el nombre)
  t = t.replace(/\\([a-zA-Z]+)/g, "$1");
  // llaves sueltas que hayan quedado de super/subíndices simples
  t = t.replace(/\^\{([^{}]+)\}/g, "^$1").replace(/_\{([^{}]+)\}/g, "_$1");
  return t;
}
