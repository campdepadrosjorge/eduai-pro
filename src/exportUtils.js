// src/exportUtils.js
import {
  Document, Paragraph, TextRun, Packer, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType, LevelFormat, ImageRun
} from "docx";
 
const F="Arial", SZ_H1=40, SZ_H2=32, SZ_H3=26, SZ_H4=24, SZ_TXT=22, SZ_SUB=18, SZ_CODE=18;
const TABLE_WIDTH = 9026;
 
function sanitize(name){
  return (name||"documento").replace(/[<>:"/\\|?*]/g,"").trim().slice(0,60)||"documento";
}
 
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
 
function parseInline(text, size, color){
  if (!size) size = SZ_TXT;
  text = text.replace(/\[ \]/g, "☐").replace(/\[x\]/gi, "☑");
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^\n*]+\*)/g).filter(Boolean);
  return parts.map(part => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2,-2), bold: true, font: F, size, color });
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return new TextRun({ text: part.slice(1,-1), italics: true, font: F, size, color });
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return new TextRun({ text: part.slice(1,-1), font: "Courier New", size: SZ_CODE, color: "2d7d46" });
    }
    return new TextRun({ text: part, font: F, size, color });
  });
}
 
function parseMdTable(tableLines) {
  return tableLines
    .filter(l => !l.trim().match(/^\|[\s\-:|]+\|$/))
    .map(l => l.trim().replace(/^\||\|$/g,"").split("|").map(c => c.trim()));
}
 
function buildDocxTable(rows) {
  if (!rows || rows.length === 0) return null;
  const colCount = rows[0].length;
  const colWidth = Math.floor(TABLE_WIDTH / colCount);
  const colWidths = rows[0].map(() => colWidth);
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
 
  const tableRows = rows.map((row, rowIdx) => {
    while (row.length < colCount) row.push("");
    const cells = row.slice(0, colCount).map((cell, colIdx) => {
      return new TableCell({
        borders,
        width: { size: colWidths[colIdx], type: WidthType.DXA },
        shading: rowIdx === 0 ? { fill: "D5E8F0", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: parseInline(cell, SZ_TXT - 2, rowIdx === 0 ? "1a2640" : undefined),
        })],
      });
    });
    return new TableRow({ children: cells, tableHeader: rowIdx === 0 });
  });
 
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: tableRows,
  });
}
 
function mdToDocx(text) {
  const result = [];
  const lines = text.split("\n");
  let i = 0;
 
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
 
    // Code block
    if (t.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (codeLines.length === 0) codeLines.push("");
      codeLines.forEach(cl => {
        result.push(new Paragraph({
          children: [new TextRun({ text: cl || " ", font: "Courier New", size: SZ_CODE, color: "2d7d46" })],
          spacing: { after: 40 },
          shading: { fill: "F5F5F0", type: ShadingType.CLEAR },
          indent: { left: 360 },
        }));
      });
      i++;
      continue;
    }
 
    // Table
    if (t.startsWith("|") && t.endsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseMdTable(tableLines);
      if (rows.length > 0) {
        const tbl = buildDocxTable(rows);
        if (tbl) {
          result.push(tbl);
          result.push(new Paragraph({ children: [new TextRun({ text: "", font: F, size: SZ_TXT })], spacing: { after: 120 } }));
        }
      }
      continue;
    }
 
    // Empty line
    if (!t) {
      result.push(new Paragraph({ children: [new TextRun({ text: "", font: F, size: SZ_TXT })], spacing: { after: 80 } }));
      i++; continue;
    }
 
    // H1
    if (t.startsWith("# ")) {
      result.push(new Paragraph({
        children: [new TextRun({ text: t.slice(2).replace(/\*\*/g,""), bold: true, font: F, size: SZ_H1, color: "1a2640" })],
        spacing: { before: 480, after: 240 },
      })); i++; continue;
    }
 
    // H2
    if (t.startsWith("## ")) {
      result.push(new Paragraph({
        children: [new TextRun({ text: t.slice(3).replace(/\*\*/g,""), bold: true, font: F, size: SZ_H2, color: "0d5c8c" })],
        spacing: { before: 360, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "0d9488", space: 4 } },
      })); i++; continue;
    }
 
    // H3
    if (t.startsWith("### ")) {
      result.push(new Paragraph({
        children: [new TextRun({ text: t.slice(4).replace(/\*\*/g,""), bold: true, font: F, size: SZ_H3, color: "1e3a5f" })],
        spacing: { before: 280, after: 120 },
      })); i++; continue;
    }
 
    // H4/H5
    if (t.startsWith("#### ") || t.startsWith("##### ")) {
      const sliceLen = t.startsWith("##### ") ? 6 : 5;
      result.push(new Paragraph({
        children: [new TextRun({ text: t.slice(sliceLen).replace(/\*\*/g,""), bold: true, font: F, size: SZ_H4 })],
        spacing: { before: 200, after: 80 },
      })); i++; continue;
    }
 
    // Checkbox
    if (/^\[[ xX]\]/.test(t)) {
      const checked = !t.startsWith("[ ]");
      result.push(new Paragraph({
        children: [
          new TextRun({ text: checked ? "☑ " : "☐ ", font: F, size: SZ_TXT, color: checked ? "059669" : "555555" }),
          ...parseInline(t.slice(3).trim()),
        ],
        spacing: { after: 80 },
        indent: { left: 360 },
      })); i++; continue;
    }
 
    // Bullet
    if (t.startsWith("- ") || t.startsWith("* ")) {
      result.push(new Paragraph({
        children: parseInline(t.slice(2)),
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 80 },
      })); i++; continue;
    }
 
    // Numbered list
    if (/^\d+\.\s/.test(t)) {
      result.push(new Paragraph({
        children: parseInline(t.replace(/^\d+\.\s/, "")),
        numbering: { reference: "numbers", level: 0 },
        spacing: { after: 80 },
      })); i++; continue;
    }
 
    // HR
    if (t === "---" || t === "***") {
      result.push(new Paragraph({
        children: [new TextRun({ text: "", font: F, size: SZ_TXT })],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "cccccc", space: 4 } },
        spacing: { before: 200, after: 200 },
      })); i++; continue;
    }
 
    // Blockquote
    if (t.startsWith("> ")) {
      result.push(new Paragraph({
        children: parseInline(t.slice(2), SZ_TXT, "555555"),
        indent: { left: 480 },
        border: { left: { style: BorderStyle.SINGLE, size: 6, color: "0d9488", space: 8 } },
        spacing: { after: 120 },
        shading: { fill: "E6F7F5", type: ShadingType.CLEAR },
      })); i++; continue;
    }
 
    // Regular paragraph
    result.push(new Paragraph({
      children: parseInline(t),
      spacing: { after: 120 },
    }));
    i++;
  }
 
  return result;
}
 
function buildDoc(topic, typeName, subject, content, imageBase64) {
  return new Document({
    styles: {
      default: {
        document: { run: { font: F, size: SZ_TXT }, paragraph: { spacing: { after: 120 } } },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 440, hanging: 280 } } } }],
        },
        {
          reference: "numbers",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 440, hanging: 280 } } } }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: topic, bold: true, font: F, size: SZ_H1, color: "1a2640" })],
          spacing: { before: 0, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: typeName||"", font: F, size: SZ_SUB, italics: true, color: "888888" }),
            new TextRun({ text: subject ? "  \u00b7  " + subject : "", font: F, size: SZ_SUB, italics: true, color: "888888" }),
            new TextRun({ text: "  \u00b7  AulaXpro", font: F, size: SZ_SUB, color: "0d9488" }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "0d9488", space: 4 } },
          spacing: { after: 480 },
        }),
        ...mdToDocx(content),
        ...(imageBase64 ? [
          new Paragraph({ children: [], spacing: { before: 200 } }),
          new Paragraph({
            children: [new ImageRun({
              data: imageBase64.split(",")[1],
              transformation: { width: 500, height: 350 },
              type: "png",
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }),
        ] : []),
      ],
    }],
  });
}
 
function buildPdfHtml(topic, typeName, subject, content) {
  const segments = [];
  let remaining = content;
 
  remaining = remaining.replace(/```[\w]*\n([\s\S]*?)```/g, (match, code) => {
    const id = `PLACEHOLDER_CODE_${segments.length}_END`;
    segments.push({ id, html: `<pre>${code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>` });
    return id;
  });
 
  remaining = remaining.replace(/((?:\|[^\n]+\|\n?)+)/g, (match) => {
    const rows = match.trim().split("\n").filter(l => !l.trim().match(/^\|[\s\-:|]+\|$/));
    if (!rows.length) return match;
    const html = rows.map((row, i) => {
      const cells = row.replace(/^\||\|$/g,"").split("|").map(c => c.trim());
      const tag = i === 0 ? "th" : "td";
      return `<tr>${cells.map(c => `<${tag}>${c.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code>$1</code>")}</${tag}>`).join("")}</tr>`;
    }).join("");
    const id = `PLACEHOLDER_TABLE_${segments.length}_END`;
    segments.push({ id, html: `<table>${html}</table>` });
    return id;
  });
 
  let html = remaining
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/\[ \]/g,"&#9744;").replace(/\[x\]/gi,"&#9745;")
    .replace(/^#### (.+)$/gm,"<h4>$1</h4>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr/>")
    .replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm,"<li>$1</li>")
    .replace(/^\* (.+)$/gm,"<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n+/g,"</p><p>")
    .replace(/\n/g,"<br/>");
 
  segments.forEach(seg => {
    html = html.replace(seg.id, seg.html);
  });
 
  return html;
}
 
export async function exportDocx(topic, typeName, subject, content, imageBase64) {
  const doc = buildDoc(topic, typeName, subject, content, imageBase64);
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${sanitize(topic)}.docx`);
}
 
export function exportPdf(topic, typeName, subject, content, imageBase64) {
  const bodyHtml = buildPdfHtml(topic, typeName, subject, content);
  const imgHtml = imageBase64 ? `<div style="text-align:center;margin:20px 0"><img src="${imageBase64}" style="max-width:100%;border-radius:8px;border:1px solid #ddd" alt="Imagen ilustrativa"/></div>` : "";
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${topic}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#1a2640;padding:2cm;line-height:1.7;max-width:21cm;margin:0 auto}
.titulo{font-size:20pt;font-weight:bold;color:#1a2640;margin-bottom:6px}
.meta{font-size:9pt;color:#888;font-style:italic;padding-bottom:10px;border-bottom:2px solid #0d9488;margin-bottom:20px}
h1{font-size:16pt;color:#1a2640;margin:20px 0 8px;border-bottom:1px solid #0d9488;padding-bottom:4px}
h2{font-size:13pt;color:#0d5c8c;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
h3{font-size:11pt;color:#1e3a5f;margin:14px 0 5px;font-weight:bold}
h4,h5{font-size:11pt;color:#333;margin:10px 0 4px;font-weight:bold}
p{margin:6px 0;color:#222}
ul,ol{padding-left:24px;margin:6px 0}
li{margin:4px 0;color:#222}
hr{border:none;border-top:1px solid #ccc;margin:14px 0}
blockquote{border-left:3px solid #0d9488;padding:6px 12px;margin:10px 0;color:#555;font-style:italic;background:#e6f7f5;border-radius:0 4px 4px 0}
strong{font-weight:bold;color:#1a2640}
em{font-style:italic}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:10pt}
th{background:#d5e8f0;font-weight:bold;padding:8px 12px;border:1px solid #b0cce0;color:#1a2640;text-align:left}
td{padding:7px 12px;border:1px solid #ddd;color:#222;vertical-align:top}
tr:nth-child(even) td{background:#f8fbff}
pre{background:#f5f5f0;padding:12px 16px;border-radius:6px;font-family:'Courier New',monospace;font-size:9.5pt;color:#2d7d46;margin:10px 0;border-left:4px solid #0d9488;white-space:pre-wrap;word-break:break-all}
code{background:#e6f7f5;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:9pt;color:#0d7a60}
@media print{body{padding:1.5cm}h1,h2,h3{page-break-after:avoid}table,pre{page-break-inside:avoid}}
</style>
</head>
<body>
<div class="titulo">${topic}</div>
<div class="meta">${typeName||""}${subject?" · "+subject:""} · AulaXpro</div>
<p>${bodyHtml}</p>${imgHtml}
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;
  const win = window.open("","_blank");
  if (win) { win.document.write(html); win.document.close(); }
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
  downloadBlob(blob, "AulaXpro_Biblioteca.zip");
}
 async function buildInformeMarcadoBlob(nombreAlumno, textoOriginal, sugerencias) {
  const children = [];

  // Título
  children.push(new Paragraph({
    children: [new TextRun({ text: "Informe revisado: " + nombreAlumno, bold: true, size: SZ_H1, font: F, color: "1a2640" })],
    spacing: { after: 200 },
  }));

  // Aviso
  children.push(new Paragraph({
    children: [new TextRun({ text: "Documento con sugerencias del equipo directivo. Las observaciones están resaltadas al final.", italics: true, size: SZ_SUB, font: F, color: "888888" })],
    spacing: { after: 300 },
    border: { bottom: { color: "0d9488", space: 4, style: BorderStyle.SINGLE, size: 12 } },
  }));

  // Texto original del informe
  children.push(new Paragraph({
    children: [new TextRun({ text: "INFORME ORIGINAL", bold: true, size: SZ_H3, font: F, color: "0d5c8c" })],
    spacing: { before: 200, after: 150 },
  }));

  textoOriginal.split("\n").forEach(function(linea) {
    if (linea.trim()) {
      children.push(new Paragraph({
        children: [new TextRun({ text: linea, size: SZ_TXT, font: F, color: "222222" })],
        spacing: { after: 100 },
      }));
    }
  });

  // Sugerencias
  children.push(new Paragraph({
    children: [new TextRun({ text: "SUGERENCIAS PARA CORREGIR", bold: true, size: SZ_H3, font: F, color: "0d5c8c" })],
    spacing: { before: 400, after: 150 },
    border: { top: { color: "0d9488", space: 4, style: BorderStyle.SINGLE, size: 12 } },
  }));

  if (!sugerencias || !sugerencias.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "El informe no requiere modificaciones. Está listo para enviar a las familias.", size: SZ_TXT, font: F, color: "059669" })],
      spacing: { after: 100 },
    }));
  } else {
    sugerencias.forEach(function(s, i) {
      // Fragmento citado
      children.push(new Paragraph({
        children: [
          new TextRun({ text: (i+1) + ". Sobre: ", bold: true, size: SZ_TXT, font: F, color: "1a2640" }),
          new TextRun({ text: "\u201C" + (s.fragmento || "") + "\u201D", italics: true, size: SZ_TXT, font: F, color: "555555", shading: { type: ShadingType.CLEAR, fill: "fff3cd" } }),
        ],
        spacing: { before: 150, after: 60 },
      }));
      // Sugerencia
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Sugerencia: ", bold: true, size: SZ_TXT, font: F, color: "0d7a60" }),
          new TextRun({ text: s.sugerencia || "", size: SZ_TXT, font: F, color: "222222" }),
        ],
        spacing: { after: 120 },
      }));
    });
  }

  const doc = new Document({ sections: [{ children: children }] });
  return await Packer.toBlob(doc);
}

export async function exportInformeMarcado(nombreAlumno, textoOriginal, sugerencias) {
  const blob = await buildInformeMarcadoBlob(nombreAlumno, textoOriginal, sugerencias);
  downloadBlob(blob, sanitize(nombreAlumno) + " - revisado.docx");
}
export async function exportInformesZip(informes) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const inf of informes) {
    const blob = await buildInformeMarcadoBlob(inf.nombre, inf.texto, inf.sugerencias);
    zip.file(sanitize(inf.nombre) + " - revisado.docx", blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, "informes-revisados.zip");
}
async function buildInformeCorregidoBlob(nombreAlumno, textoCorregido) {
  const children = [];
  textoCorregido.split("\n").forEach(function(linea) {
    if (linea.trim()) {
      children.push(new Paragraph({
        children: [new TextRun({ text: linea, size: SZ_TXT, font: F, color: "222222" })],
        spacing: { after: 120 },
      }));
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: "", size: SZ_TXT, font: F })] }));
    }
  });
  const doc = new Document({ sections: [{ children: children }] });
  return await Packer.toBlob(doc);
}

export async function exportInformeCorregido(nombreAlumno, textoCorregido) {
  const blob = await buildInformeCorregidoBlob(nombreAlumno, textoCorregido);
  downloadBlob(blob, sanitize(nombreAlumno) + " - corregido.docx");
}

export async function exportInformesCorregidosZip(informes) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const inf of informes) {
    const blob = await buildInformeCorregidoBlob(inf.nombre, inf.textoCorregido);
    zip.file(sanitize(inf.nombre) + " - corregido.docx", blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, "informes-corregidos.zip");
}