// src/slidesTemplates.js
// Genera una clase en diapositivas (.pptx) a partir de contenido estructurado.
// El docente elige una de 3 plantillas de diseno.
import pptxgen from "pptxgenjs";
// Convierte el texto con formato "## SLIDE" en la estructura de slides
export function parseSlides(texto, claseTitulo, materia, nivel) {
  const slides = [];
  const bloques = texto.split(/##\s*SLIDE\s*\d*\s*:?/i).map(b => b.trim()).filter(Boolean);
  bloques.forEach(bloque => {
    bloque = bloque.replace(/^-{3,}$/gm, "").trim();
    const lineas = bloque.split("\n").map(l => l.trim());
    let title = "";
    const bullets = [];
    let notes = "";
    let enNotas = false;
    lineas.forEach((linea) => {
      if (!linea) return;
      if (!title && !linea.startsWith("-") && !/^NOTAS DEL PRESENTADOR/i.test(linea)) {
        title = linea.replace(/^\*+|\*+$/g, "").trim();
        return;
      }
      if (/^NOTAS DEL PRESENTADOR/i.test(linea)) {
        enNotas = true;
        notes = linea.replace(/^NOTAS DEL PRESENTADOR:?\s*/i, "").trim();
        return;
      }
      if (enNotas) { notes += " " + linea; return; }
      if (linea.startsWith("-")) bullets.push(linea.replace(/^-\s*/, "").trim());
    });
    if (title || bullets.length) slides.push({ title, bullets, notes: notes.trim() });
  });
  return { claseTitulo: claseTitulo || (slides[0] && slides[0].title) || "Clase", materia, nivel, slides };
}
// ---- Definicion de las 3 plantillas ----
export const SLIDE_TEMPLATES = {
  profesional: {
    id: "profesional",
    nombre: "Profesional",
    descripcion: "Sobria y formal. Ideal para secundaria.",
    bg: "FFFFFF",
    portadaBg: "0D3559",
    portadaTitulo: "FFFFFF",
    portadaSub: "8FD9E8",
    titulo: "0D3559",
    texto: "333333",
    acento: "26C3D4",
    fuente: "Arial",
  },
  vibrante: {
    id: "vibrante",
    nombre: "Vibrante",
    descripcion: "Colorida y amigable. Ideal para primaria.",
    bg: "FFF9F0",
    portadaBg: "26C3D4",
    portadaTitulo: "FFFFFF",
    portadaSub: "FDF6E3",
    titulo: "E07B39",
    texto: "444444",
    acento: "79BD9A",
    fuente: "Arial",
  },
  minimalista: {
    id: "minimalista",
    nombre: "Minimalista",
    descripcion: "Limpia y elegante. Sirve para cualquier nivel.",
    bg: "FFFFFF",
    portadaBg: "FFFFFF",
    portadaTitulo: "1A1A1A",
    portadaSub: "888888",
    titulo: "1A1A1A",
    texto: "444444",
    acento: "26C3D4",
    fuente: "Arial",
  },
};

function sanitize(name) {
  return (name || "clase").replace(/[<>:"/\\|?*]/g, "").trim().slice(0, 60) || "clase";
}

// slidesData: { claseTitulo, materia, nivel, slides: [{title, bullets:[], notes}] }
export async function generarPptx(slidesData, templateId) {
  const t = SLIDE_TEMPLATES[templateId] || SLIDE_TEMPLATES.profesional;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  // ---- Portada ----
  const portada = pres.addSlide();
  portada.background = { color: t.portadaBg };
  if (t.id !== "minimalista") {
    portada.addShape(pres.ShapeType.rect, { x: 0, y: 5.9, w: 13.33, h: 0.25, fill: { color: t.acento } });
  } else {
    portada.addShape(pres.ShapeType.rect, { x: 0.7, y: 2.15, w: 2.2, h: 0.08, fill: { color: t.acento } });
  }
  portada.addText(slidesData.claseTitulo || "Clase", {
    x: 0.7, y: 2.3, w: 11.9, h: 1.5, fontFace: t.fuente, fontSize: 40, bold: true,
    color: t.portadaTitulo, align: t.id === "minimalista" ? "left" : "center",
  });
  const sub = [slidesData.materia, slidesData.nivel].filter(Boolean).join("  ·  ");
  if (sub) {
    portada.addText(sub, {
      x: 0.7, y: 3.9, w: 11.9, h: 0.7, fontFace: t.fuente, fontSize: 18,
      color: t.portadaSub, align: t.id === "minimalista" ? "left" : "center",
    });
  }

  // ---- Slides de contenido ----
  (slidesData.slides || []).forEach((sl) => {
    const s = pres.addSlide();
    s.background = { color: t.bg };
    s.addText(sl.title || "", {
      x: 0.7, y: 0.5, w: 11.9, h: 0.9, fontFace: t.fuente, fontSize: 28, bold: true, color: t.titulo,
    });
    s.addShape(pres.ShapeType.rect, { x: 0.7, y: 1.45, w: 2.0, h: 0.06, fill: { color: t.acento } });
    const bullets = (sl.bullets || []).map((b) => ({
      text: b,
      options: { bullet: { code: "2022" }, breakLine: true, paraSpaceAfter: 10 },
    }));
    if (bullets.length) {
      s.addText(bullets, {
        x: 0.9, y: 1.8, w: 11.5, h: 4.8, fontFace: t.fuente, fontSize: 20, color: t.texto, valign: "top",
      });
    }
    if (sl.notes) s.addNotes(sl.notes);
  });

  const nombre = sanitize(slidesData.claseTitulo) + ".pptx";
  await pres.writeFile({ fileName: nombre });
}