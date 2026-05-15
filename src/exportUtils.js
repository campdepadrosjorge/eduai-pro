// src/exportUtils.js
// Exporta contenido generado como DOCX (Arial), PDF o ZIP

import {
  Document, Paragraph, TextRun, Packer,
  AlignmentType, BorderStyle,
} from "docx";

// ── CONFIG ───────────────────────────────────────────────────
const F      = "Arial";
const SZ_H1  = 40;   // 20pt
const SZ_H2  = 32;   // 16pt
const SZ_H3  = 26;   // 13pt
const SZ_H4  = 24;   // 12pt
const SZ_TXT = 22;   // 11pt
const SZ_SUB = 18;   // 9pt

// ── HELPERS ──────────────────────────────────────────────────

function sanitize(name) {
  return (name || "documento")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim().slice(0, 60) || "documento";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Parse **bold** inline text into TextRun array
function parseInline(text, size = SZ_TXT, color) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map(part => {
    const bold = part.startsWith("**") && part.endsWith("**");
    return new TextRun({
      text: bold ? part.slice(2, -2) : part,
      bold,
      font: F,
      size: size,
      color: color,
    });
  });
}

// Convert markdown string to array of docx Paragraph objects
function mdToDocx(text) {
  const paras = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      paras.push(new Paragraph({ children: [new TextRun({ text: "", font: F, size: SZ_TXT })], spacing: { after: 80 } }));
      continue;
    }

    if (t.startsWith("# ")) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: t.slice(2).replace(/\*\*/g, ""), bold: true, font: F, size: SZ_H1, color: "1a2640" })],
        spacing: { before: 480, after: 240 },
      }));
    } else if (t.startsWith("## ")) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: t.slice(3).replace(/\*\*/g, ""), bold: true, font: F, size: SZ_H2, color: "243350" })],
        spacing: { before: 360, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "f59e0b", space: 4 } },
      }));
    } else if (t.startsWith("### ")) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: t.slice(4).replace(/\*\*/g, ""), bold: true, font: F, size: SZ_H3, color: "1e3a5f" })],
        spacing: { before: 280, after: 120 },
      }));
    } else if (t.startsWith("#### ")) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: t.slice(5).replace(/\*\*/g, ""), bold: true, font: F, size: SZ_H4 })],
        spacing: { before: 200, after: 80 },
      }));
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      paras.push(new Paragraph({
        children: parseInline(t.slice(2)),
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
    } else if (/^\d+\.\s/.test(t)) {
      paras.push(new Paragraph({
        children: parseInline(t.replace(/^\d+\.\s/, "")),
        numbering: { reference: "eduai-num", level: 0 },
        spacing: { after: 80 },
      }));
    } else if (t === "---") {
      paras.push(new Paragraph({
        children: [new TextRun({ text: "", font: F, size: SZ_TXT })],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "cccccc", space: 4 } },
        spacing: { before: 200, after: 200 },
      }));
    } else if (t.startsWith("> ")) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: t.slice(2), font: F, size: SZ_TXT, italics: true, color: "555555" })],
        indent: { left: 480 },
        border: { left: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 8 } },
        spacing: { after: 120 },
      }));
    } else {
      paras.push(new Paragraph({
        children: parseInline(t),
        spacing: { after: 120 },
      }));
    }
  }

  return paras;
}

function buildDoc(topic, typeName, subject, content) {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: F, size: SZ_TXT },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    numbering: {
      config: [{
        reference: "eduai-num",
        levels: [{
          level: 0,
          format: "decimal",
          text: "%1.",
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 440, hanging: 280 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 } },
      },
      children: [
        // Título principal
        new Paragraph({
          children: [new TextRun({ text: topic, bold: true, font: F, size: SZ_H1, color: "1a2640" })],
          spacing: { before: 0, after: 200 },
        }),
        // Metadata
        new Paragraph({
          children: [
            new TextRun({ text: typeName || "", font: F, size: SZ_SUB, italics: true, color: "888888" }),
            new TextRun({ text: subject ? `  ·  ${subject}` : "", font: F, size: SZ_SUB, italics: true, color: "888888" }),
            new TextRun({ text: "  ·  EduAI Pro", font: F, size: SZ_SUB, color: "f59e0b" }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 4 } },
          spacing: { after: 480 },
        }),
        // Contenido
        ...mdToDocx(content),
      ],
    }],
  });
}

// ── EXPORTS ──────────────────────────────────────────────────

export async function exportDocx(topic, typeName, subject, content) {
  const doc = buildDoc(topic, typeName, subject, content);
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${sanitize(topic)}.docx`);
}

export async function exportPdf(topic, typeName, subject, content) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 20, maxW = W - M * 2;
  let y = M;

  const newPage = () => { pdf.addPage(); y = M; };
  const check = (h) => { if (y + h > 285) newPage(); };

  // Título
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(26, 38, 64);
  const titleLines = pdf.splitTextToSize(topic, maxW);
  check(titleLines.length * 8);
  pdf.text(titleLines, M, y);
  y += titleLines.length * 8 + 3;

  // Metadata
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(136, 136, 136);
  pdf.text(`${typeName || ""}${subject ? "  ·  " + subject : ""}  ·  EduAI Pro`, M, y);
  y += 5;
  pdf.setDrawColor(245, 158, 11);
  pdf.setLineWidth(0.8);
  pdf.line(M, y, W - M, y);
  y += 8;

  // Contenido
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t) { y += 2; continue; }

    const clean = t
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/^[\-\*] /, "• ")
      .replace(/^> /, "  ");

    if (t.startsWith("## ")) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(26, 38, 64);
      const w = pdf.splitTextToSize(clean, maxW);
      check(w.length * 6 + 6);
      y += 4;
      pdf.text(w, M, y);
      y += w.length * 6 + 2;
      pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
      pdf.line(M, y, W - M, y);
      y += 4;
    } else if (t.startsWith("###") || t.startsWith("# ")) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(30, 58, 95);
      const w = pdf.splitTextToSize(clean, maxW);
      check(w.length * 5.5 + 4);
      y += 3;
      pdf.text(w, M, y);
      y += w.length * 5.5 + 3;
    } else if (t === "---") {
      y += 2; pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);
      pdf.line(M, y, W - M, y); y += 4;
    } else {
      const indent = (t.startsWith("- ") || t.startsWith("* ") || /^\d+\./.test(t)) ? 5 : 0;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
      const w = pdf.splitTextToSize(clean, maxW - indent);
      check(w.length * 5 + 2);
      pdf.text(w, M + indent, y);
      y += w.length * 5 + 1.5;
    }
  }

  pdf.save(`${sanitize(topic)}.pdf`);
}

export async function exportZip(items) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const item of items) {
    try {
      const doc = buildDoc(item.topic, item.type_name, item.subject_name, item.content);
      const blob = await Packer.toBlob(doc);
      zip.file(`${sanitize(item.topic)}.docx`, blob);
    } catch {}
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "EduAIPro_Biblioteca.zip");
}
