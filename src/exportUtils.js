// src/exportUtils.js
import { Document, Paragraph, TextRun, Packer, AlignmentType, BorderStyle } from "docx";
 
const F="Arial",SZ_H1=40,SZ_H2=32,SZ_H3=26,SZ_H4=24,SZ_TXT=22,SZ_SUB=18;
 
function sanitize(name){return(name||"documento").replace(/[<>:"/\\|?*]/g,"").trim().slice(0,60)||"documento";}
 
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
 
function parseInline(text,size=SZ_TXT,color){
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(part=>{
    const bold=part.startsWith("**")&&part.endsWith("**");
    return new TextRun({text:bold?part.slice(2,-2):part,bold,font:F,size,color});
  });
}
 
function mdToDocx(text){
  const paras=[];
  for(const line of text.split("\n")){
    const t=line.trim();
    if(!t){paras.push(new Paragraph({children:[new TextRun({text:"",font:F,size:SZ_TXT})],spacing:{after:80}}));continue;}
    if(t.startsWith("# "))      paras.push(new Paragraph({children:[new TextRun({text:t.slice(2).replace(/\*\*/g,""),bold:true,font:F,size:SZ_H1,color:"1a2640"})],spacing:{before:480,after:240}}));
    else if(t.startsWith("## ")) paras.push(new Paragraph({children:[new TextRun({text:t.slice(3).replace(/\*\*/g,""),bold:true,font:F,size:SZ_H2,color:"243350"})],spacing:{before:360,after:120},border:{bottom:{style:BorderStyle.SINGLE,size:4,color:"f59e0b",space:4}}}));
    else if(t.startsWith("### "))paras.push(new Paragraph({children:[new TextRun({text:t.slice(4).replace(/\*\*/g,""),bold:true,font:F,size:SZ_H3,color:"1e3a5f"})],spacing:{before:280,after:120}}));
    else if(t.startsWith("#### "))paras.push(new Paragraph({children:[new TextRun({text:t.slice(5).replace(/\*\*/g,""),bold:true,font:F,size:SZ_H4})],spacing:{before:200,after:80}}));
    else if(t.startsWith("- ")||t.startsWith("* "))paras.push(new Paragraph({children:parseInline(t.slice(2)),bullet:{level:0},spacing:{after:80}}));
    else if(/^\d+\.\s/.test(t))paras.push(new Paragraph({children:parseInline(t.replace(/^\d+\.\s/,"")),numbering:{reference:"eduai-num",level:0},spacing:{after:80}}));
    else if(t==="---")paras.push(new Paragraph({children:[new TextRun({text:"",font:F,size:SZ_TXT})],border:{top:{style:BorderStyle.SINGLE,size:4,color:"cccccc",space:4}},spacing:{before:200,after:200}}));
    else if(t.startsWith("> "))paras.push(new Paragraph({children:[new TextRun({text:t.slice(2),font:F,size:SZ_TXT,italics:true,color:"555555"})],indent:{left:480},border:{left:{style:BorderStyle.SINGLE,size:6,color:"f59e0b",space:8}},spacing:{after:120}}));
    else paras.push(new Paragraph({children:parseInline(t),spacing:{after:120}}));
  }
  return paras;
}
 
function buildDoc(topic,typeName,subject,content){
  return new Document({
    styles:{default:{document:{run:{font:F,size:SZ_TXT},paragraph:{spacing:{after:120}}}}},
    numbering:{config:[{reference:"eduai-num",levels:[{level:0,format:"decimal",text:"%1.",alignment:AlignmentType.START,style:{paragraph:{indent:{left:440,hanging:280}}}}]}]},
    sections:[{
      properties:{page:{margin:{top:1440,bottom:1440,left:1800,right:1440}}},
      children:[
        new Paragraph({children:[new TextRun({text:topic,bold:true,font:F,size:SZ_H1,color:"1a2640"})],spacing:{before:0,after:200}}),
        new Paragraph({children:[
          new TextRun({text:typeName||"",font:F,size:SZ_SUB,italics:true,color:"888888"}),
          new TextRun({text:subject?`  ·  ${subject}`:"",font:F,size:SZ_SUB,italics:true,color:"888888"}),
          new TextRun({text:"  ·  EduAI Pro",font:F,size:SZ_SUB,color:"f59e0b"}),
        ],border:{bottom:{style:BorderStyle.SINGLE,size:6,color:"f59e0b",space:4}},spacing:{after:480}}),
        ...mdToDocx(content),
      ],
    }],
  });
}
 
function mdToHtml(text){
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g,"<em>$1</em>")
    .replace(/^#### (.+)$/gm,"<h4>$1</h4>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr/>")
    .replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm,"<li>$1</li>")
    .replace(/^\* (.+)$/gm,"<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`)
    .replace(/\n\n+/g,"</p><p>")
    .replace(/\n/g,"<br/>");
}
 
export async function exportDocx(topic,typeName,subject,content){
  const doc=buildDoc(topic,typeName,subject,content);
  const blob=await Packer.toBlob(doc);
  downloadBlob(blob,`${sanitize(topic)}.docx`);
}
 
export function exportPdf(topic,typeName,subject,content){
  const html=`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${topic}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#1a2640;padding:2cm;line-height:1.65}
.titulo{font-size:20pt;font-weight:bold;color:#1a2640;margin-bottom:6px}
.meta{font-size:9pt;color:#888;font-style:italic;padding-bottom:10px;border-bottom:2px solid #f59e0b;margin-bottom:20px}
h1{font-size:16pt;color:#1a2640;margin:18px 0 8px;border-bottom:1px solid #f59e0b;padding-bottom:4px}
h2{font-size:13pt;color:#243350;margin:14px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
h3{font-size:11pt;color:#1e3a5f;margin:12px 0 4px;font-weight:bold}
h4{font-size:11pt;color:#333;margin:10px 0 4px;font-weight:bold}
p{margin:6px 0;color:#222}
ul{padding-left:22px;margin:6px 0}
li{margin:3px 0;color:#222}
hr{border:none;border-top:1px solid #ccc;margin:12px 0}
blockquote{border-left:3px solid #f59e0b;padding:4px 10px;margin:8px 0;color:#555;font-style:italic;background:#fefce8}
strong{font-weight:bold}
em{font-style:italic}
@media print{body{padding:1.5cm}h1,h2,h3{page-break-after:avoid}}
</style>
</head>
<body>
<div class="titulo">${topic}</div>
<div class="meta">${typeName||""}${subject?" · "+subject:""} · EduAI Pro</div>
<p>${mdToHtml(content)}</p>
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;
  const win=window.open("","_blank");
  if(win){win.document.write(html);win.document.close();}
}
 
export async function exportZip(items){
  const{default:JSZip}=await import("jszip");
  const zip=new JSZip();
  for(const item of items){
    try{
      const doc=buildDoc(item.topic,item.type_name,item.subject_name,item.content);
      const blob=await Packer.toBlob(doc);
      zip.file(`${sanitize(item.topic)}.docx`,blob);
    }catch{}
  }
  const blob=await zip.generateAsync({type:"blob"});
  downloadBlob(blob,"EduAIPro_Biblioteca.zip");
}
 