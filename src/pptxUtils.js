// src/pptxUtils.js
// Genera presentaciones PowerPoint desde el contenido generado por Claude
 
import PptxGenJS from "pptxgenjs";
 
const COLORS = {
  bg: "1a2640",
  bgLight: "243350",
  accent: "f59e0b",
  accentDark: "b45309",
  text: "e8edf5",
  textMuted: "94a3b8",
  white: "FFFFFF",
};
 
// Parsea el texto markdown generado por Claude y extrae slides
function parseSlides(content) {
  var slides = [];
  var lines = content.split("\n");
  var currentSlide = null;
  var currentContent = [];
  var currentNotes = [];
  var inNotes = false;
 
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
 
    // Nueva slide cuando encuentra ## o "Slide" o "Diapositiva"
    if (line.match(/^##\s+/) || line.match(/^(Slide|Diapositiva)\s+\d+/i) || line.match(/^\d+\.\s+(Slide|Diapositiva|Titulo)/i)) {
      if (currentSlide) {
        currentSlide.content = currentContent.join("\n").trim();
        currentSlide.notes = currentNotes.join("\n").trim();
        slides.push(currentSlide);
      }
      var title = line.replace(/^##\s+/, "").replace(/^(Slide|Diapositiva)\s+\d+[:\.\-\s]*/i, "").replace(/^\d+\.\s+/, "").trim();
      currentSlide = { title: title, content: "", notes: "" };
      currentContent = [];
      currentNotes = [];
      inNotes = false;
    } else if (currentSlide) {
      // Detectar sección de notas del orador
      if (line.match(/^(Notas|Nota del orador|Notes|Speaker|Lo que dice)/i)) {
        inNotes = true;
      } else if (line.startsWith("###")) {
        // Subtitulo dentro de slide
        if (!inNotes) currentContent.push(line.replace(/^###\s*/, ""));
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!inNotes) currentContent.push(line);
        else currentNotes.push(line);
      } else if (line && !line.startsWith("#")) {
        if (!inNotes) currentContent.push(line);
        else currentNotes.push(line);
      }
    }
  }
 
  // Última slide
  if (currentSlide) {
    currentSlide.content = currentContent.join("\n").trim();
    currentSlide.notes = currentNotes.join("\n").trim();
    slides.push(currentSlide);
  }
 
  return slides;
}
 
// Limpia markdown del texto
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[-\*]\s+/gm, "• ")
    .replace(/^#+\s+/gm, "")
    .trim();
}
 
// Extrae bullets de un bloque de texto
function extractBullets(text) {
  if (!text) return [];
  var lines = text.split("\n");
  var bullets = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
      bullets.push(cleanText(line.replace(/^[-\*•]\s+/, "")));
    } else if (line && !line.match(/^#+/) && !line.match(/^(Notas|Nota|Notes|Speaker)/i)) {
      bullets.push(cleanText(line));
    }
  }
  return bullets.filter(function(b) { return b.length > 0; }).slice(0, 7);
}
 
export async function generatePptx(topic, subject, content) {
  var pptx = new PptxGenJS();
 
  pptx.layout = "LAYOUT_16x9";
  pptx.title = topic;
  pptx.subject = subject || "";
  pptx.author = "EduAI Pro";
 
  // Slide de titulo
  var titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.bg };
 
  // Rectangulo decorativo lateral
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: "100%",
    fill: { color: COLORS.accent },
  });
 
  titleSlide.addText(topic, {
    x: 0.5, y: 1.8, w: 8.5, h: 1.2,
    fontSize: 36,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial",
    align: "left",
    wrap: true,
  });
 
  if (subject) {
    titleSlide.addText(subject, {
      x: 0.5, y: 3.2, w: 8.5, h: 0.5,
      fontSize: 18,
      color: COLORS.accent,
      fontFace: "Arial",
      align: "left",
    });
  }
 
  titleSlide.addText("Generado con EduAI Pro", {
    x: 0.5, y: 4.5, w: 8.5, h: 0.3,
    fontSize: 11,
    color: COLORS.textMuted,
    fontFace: "Arial",
    align: "left",
  });
 
  // Parsear slides del contenido
  var slides = parseSlides(content);
 
  // Si no se pudieron parsear slides, crear slides genéricas desde el contenido
  if (slides.length === 0) {
    var paragraphs = content.split("\n\n").filter(function(p) { return p.trim().length > 20; });
    for (var i = 0; i < Math.min(paragraphs.length, 10); i++) {
      var lines2 = paragraphs[i].split("\n");
      slides.push({
        title: cleanText(lines2[0]) || ("Slide " + (i + 1)),
        content: lines2.slice(1).join("\n"),
        notes: "",
      });
    }
  }
 
  // Generar cada slide
  for (var idx = 0; idx < slides.length; idx++) {
    var slideData = slides[idx];
    var slide = pptx.addSlide();
    slide.background = { color: COLORS.bg };
 
    // Barra superior decorativa
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.08,
      fill: { color: COLORS.accent },
    });
 
    // Numero de slide
    slide.addText((idx + 1).toString(), {
      x: 9.0, y: 0.15, w: 0.6, h: 0.35,
      fontSize: 11,
      color: COLORS.textMuted,
      fontFace: "Arial",
      align: "right",
    });
 
    // Titulo de la slide
    var slideTitle = cleanText(slideData.title).slice(0, 80);
    slide.addText(slideTitle, {
      x: 0.4, y: 0.15, w: 8.4, h: 0.55,
      fontSize: 22,
      bold: true,
      color: COLORS.accent,
      fontFace: "Arial",
      align: "left",
      wrap: true,
    });
 
    // Linea separadora
    slide.addShape(pptx.ShapeType.line, {
      x: 0.4, y: 0.75, w: 9.2, h: 0,
      line: { color: COLORS.bgLight, width: 1 },
    });
 
    // Contenido - bullets
    var bullets = extractBullets(slideData.content);
 
    if (bullets.length > 0) {
      var bulletText = bullets.map(function(b) {
        return { text: b, options: { bullet: { type: "bullet" }, paraSpaceAfter: 8 } };
      });
 
      slide.addText(bulletText, {
        x: 0.4, y: 0.9, w: 9.0, h: 4.0,
        fontSize: 16,
        color: COLORS.text,
        fontFace: "Arial",
        align: "left",
        valign: "top",
        wrap: true,
        lineSpacingMultiple: 1.3,
      });
    }
 
    // Notas del orador
    if (slideData.notes) {
      slide.addNotes(cleanText(slideData.notes));
    }
  }
 
  // Slide de cierre
  var closingSlide = pptx.addSlide();
  closingSlide.background = { color: COLORS.bg };
 
  closingSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: "100%",
    fill: { color: COLORS.accent },
  });
 
  closingSlide.addText("Gracias", {
    x: 0.5, y: 2.0, w: 8.5, h: 1.0,
    fontSize: 40,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial",
    align: "left",
  });
 
  closingSlide.addText("Generado con EduAI Pro · Claude AI", {
    x: 0.5, y: 3.2, w: 8.5, h: 0.4,
    fontSize: 13,
    color: COLORS.accent,
    fontFace: "Arial",
    align: "left",
  });
 
  // Descargar
  var filename = (topic || "presentacion").replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]/g, "").trim().slice(0, 50) || "presentacion";
  await pptx.writeFile({ fileName: filename + ".pptx" });
}
 