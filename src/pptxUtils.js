// src/pptxUtils.js
import PptxGenJS from "pptxgenjs";
 
const COLORS = {
  bg: "1a2640",
  bgLight: "243350",
  accent: "f59e0b",
  text: "e8edf5",
  textMuted: "94a3b8",
  white: "FFFFFF",
};
 
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[-•]\s+/gm, "")
    .replace(/^#+\s+/gm, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F0FF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
 
function extractBullets(text) {
  if (!text) return [];
  var lines = text.split("\n");
  var bullets = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.match(/^NOTAS?:/i) || line.match(/^---+$/)) break;
    var clean = line
      .replace(/^[-•*]\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F0FF}]/gu, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (clean.length > 2) bullets.push(clean);
  }
  return bullets.slice(0, 7);
}
 
function extractNotes(text) {
  if (!text) return "";
  var match = text.match(/NOTAS?:\s*([\s\S]*?)(?=\n---|\n##|$)/i);
  return match ? match[1].replace(/\*\*/g, "").trim() : "";
}
 
function parseSlides(content) {
  // Dividir por ## SLIDE o ## seguido de número o título
  var slideBlocks = content.split(/(?=^##\s+(?:SLIDE\s*\[?\d+\]?[:.\-\s]|DIAPOSITIVA\s*\d+|SLIDE\s*\d+|\d+[:.]\s))/im);
 
  // Filtrar bloques vacíos y los que no son slides
  slideBlocks = slideBlocks.filter(function(block) {
    return block.trim().length > 10 && block.match(/^##/im);
  });
 
  // Si no encontramos con ese patrón, intentar con cualquier ##
  if (slideBlocks.length < 2) {
    slideBlocks = content.split(/(?=^##\s+)/m).filter(function(b) { return b.trim().startsWith("##"); });
  }
 
  var slides = [];
 
  for (var i = 0; i < slideBlocks.length; i++) {
    var block = slideBlocks[i].trim();
    var lines = block.split("\n");
 
    // Extraer título de la primera línea
    var titleLine = lines[0].replace(/^##\s+/, "").replace(/^SLIDE\s*\[?\d+\]?\s*[:.\-]\s*/i, "").replace(/^DIAPOSITIVA\s*\d+\s*[:.\-]\s*/i, "").replace(/^\d+\s*[:.\-]\s*/, "").trim();
    var title = cleanText(titleLine).slice(0, 80) || ("Slide " + (i + 1));
 
    // Extraer contenido (líneas después del título hasta NOTAS:)
    var contentLines = lines.slice(1).join("\n");
    var bullets = extractBullets(contentLines);
    var notes = extractNotes(contentLines);
 
    slides.push({ title: title, bullets: bullets, notes: notes });
  }
 
  return slides;
}
 
export async function generatePptx(topic, subject, content) {
  var pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = topic;
  pptx.author = "AulaXpro";
 
  // ── SLIDE DE TÍTULO ──────────────────────────────────────────
  var titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.bg };
  titleSlide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:0.18, h:"100%", fill:{ color:COLORS.accent } });
  titleSlide.addText(topic, {
    x:0.5, y:1.6, w:8.8, h:1.4,
    fontSize:36, bold:true, color:COLORS.white, fontFace:"Arial", align:"left", wrap:true,
  });
  if (subject) {
    titleSlide.addText(subject, {
      x:0.5, y:3.1, w:8.8, h:0.5,
      fontSize:18, color:COLORS.accent, fontFace:"Arial", align:"left",
    });
  }
  titleSlide.addText("AulaXpro · Claude AI", {
    x:0.5, y:4.5, w:8.8, h:0.3,
    fontSize:11, color:COLORS.textMuted, fontFace:"Arial", align:"left",
  });
 
  // ── SLIDES DE CONTENIDO ──────────────────────────────────────
  var slides = parseSlides(content);
 
  for (var i = 0; i < slides.length; i++) {
    var sd = slides[i];
    var slide = pptx.addSlide();
    slide.background = { color: COLORS.bg };
 
    // Barra superior
    slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:"100%", h:0.07, fill:{ color:COLORS.accent } });
 
    // Número
    slide.addText((i + 1).toString(), {
      x:9.0, y:0.12, w:0.6, h:0.35,
      fontSize:11, color:COLORS.textMuted, fontFace:"Arial", align:"right",
    });
 
    // Título de slide
    slide.addText(sd.title, {
      x:0.4, y:0.12, w:8.4, h:0.55,
      fontSize:22, bold:true, color:COLORS.accent, fontFace:"Arial", align:"left", wrap:true,
    });
 
    // Línea separadora
    slide.addShape(pptx.ShapeType.line, {
      x:0.4, y:0.72, w:9.2, h:0,
      line: { color:COLORS.bgLight, width:1.5 },
    });
 
    // Bullets
    if (sd.bullets.length > 0) {
      var bulletRows = sd.bullets.map(function(b) {
        return { text: b, options: { bullet: { type:"bullet", indent:15 }, paraSpaceAfter:10, color:COLORS.text, fontSize:16, fontFace:"Arial" } };
      });
      slide.addText(bulletRows, {
        x:0.4, y:0.85, w:9.1, h:4.0,
        align:"left", valign:"top", wrap:true, lineSpacingMultiple:1.25,
      });
    }
 
    // Notas
    if (sd.notes) {
      slide.addNotes(sd.notes);
    }
  }
 
  // ── SLIDE DE CIERRE ──────────────────────────────────────────
  var closing = pptx.addSlide();
  closing.background = { color: COLORS.bg };
  closing.addShape(pptx.ShapeType.rect, { x:0, y:0, w:0.18, h:"100%", fill:{ color:COLORS.accent } });
  closing.addText("Gracias", {
    x:0.5, y:2.0, w:8.8, h:1.0,
    fontSize:44, bold:true, color:COLORS.white, fontFace:"Arial", align:"left",
  });
  closing.addText("Generado con AulaXpro · Claude AI", {
    x:0.5, y:3.2, w:8.8, h:0.4,
    fontSize:13, color:COLORS.accent, fontFace:"Arial", align:"left",
  });
 
  // Descargar
  var filename = (topic || "presentacion").replace(/[<>:"/\\|?*]/g, "").trim().slice(0, 50) || "presentacion";
  await pptx.writeFile({ fileName: filename + ".pptx" });
}
 