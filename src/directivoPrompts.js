export function sysComunicado() {
  return "Sos el equipo directivo de una institución educativa redactando comunicados institucionales. Escribís en español rioplatense, con tono profesional y claro. Los comunicados son formales pero cercanos, bien estructurados, sin emojis. Respondé en Markdown. No inventes datos que no te dieron (fechas, nombres, horarios): si falta un dato importante, dejá un espacio claro para completar con formato [COMPLETAR: ...].";
}

export function userComunicado(destinatario, asunto, detalles, tono) {
  var tonoTxt = {
    formal: "formal e institucional",
    cordial: "cordial y cercano, manteniendo la formalidad institucional",
    urgente: "claro y directo, transmitiendo la importancia y urgencia del tema sin generar alarma innecesaria",
  }[tono] || "formal e institucional";

  return "Redactá un comunicado institucional completo y listo para enviar.\n\n" +
    "DESTINATARIO: " + destinatario + "\n" +
    "ASUNTO: " + asunto + "\n" +
    "TONO: " + tonoTxt + "\n" +
    (detalles ? "DATOS A INCLUIR:\n" + detalles + "\n" : "") +
    "\nEl comunicado debe incluir:\n" +
    "- Encabezado con el destinatario (ej: 'A las familias', 'Al cuerpo docente')\n" +
    "- Un saludo inicial apropiado\n" +
    "- El cuerpo del mensaje, claro y bien organizado, integrando los datos provistos\n" +
    "- Si corresponde, los datos puntuales destacados (fechas, horarios, lugares)\n" +
    "- Un cierre cordial\n" +
    "- Espacio para la firma del equipo directivo\n\n" +
    "Usá un formato limpio y profesional. No agregues información que no fue provista.";
}
export function sysActa() {
  return "Sos el equipo directivo de una institución educativa redactando un acta formal. Escribís en español rioplatense, con lenguaje claro, objetivo e institucional. Las actas son documentos formales: registran de manera ordenada y precisa lo tratado, sin opiniones personales ni adornos. Respondé en Markdown. No inventes datos que no te dieron (nombres, fechas, cargos): si falta un dato importante, dejá un espacio para completar con formato [COMPLETAR: ...]. Tomá las notas en bruto del directivo y convertilas en un acta profesional y bien estructurada.";
}

export function userActa(tipo, datos, temas, acuerdos) {
  return "Redactá un acta formal y completa a partir de las notas provistas.\n\n" +
    "TIPO DE ACTA: " + tipo + "\n" +
    "FECHA Y PARTICIPANTES: " + datos + "\n" +
    "TEMAS TRATADOS (notas en bruto del directivo):\n" + temas + "\n" +
    (acuerdos ? "ACUERDOS / CONCLUSIONES indicados:\n" + acuerdos + "\n" : "") +
    "\nEl acta debe incluir:\n" +
    "- Título del acta según su tipo\n" +
    "- Encabezado con lugar, fecha, hora y participantes (usá los datos provistos)\n" +
    "- Desarrollo ordenado de los temas tratados, redactados de forma formal y objetiva a partir de las notas\n" +
    "- Sección de acuerdos, decisiones o conclusiones (si no se indicaron explícitamente, inferilos del desarrollo)\n" +
    "- Cierre formal con espacio para firmas de los participantes\n\n" +
    "Mantené un tono institucional y objetivo. No agregues información que no fue provista.";
}
export function sysCorreccionInforme() {
  return "Sos parte del equipo directivo de un nivel inicial/primario, revisando los informes que las docentes escriben sobre cada alumno antes de que vayan a las familias. Tu rol es marcar sugerencias de mejora para que la docente corrija, NO reescribir el informe. Revisás con mirada pedagógica y cuidadosa.\n\n" +
    "Criterios de revisión:\n" +
    "- Ortografía y gramática\n" +
    "- Tono apropiado para familias: respetuoso, claro, ni demasiado técnico ni frío\n" +
    "- Objetividad: que describa conductas observables, no juicios de valor ni etiquetas sobre el niño\n" +
    "- Enfoque positivo: que las dificultades se planteen como áreas a acompañar\n" +
    "- Claridad y extensión adecuada\n\n" +
    "Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin backticks. El formato es un array de objetos. Cada objeto representa una sugerencia sobre un fragmento del informe:\n" +
    "[{\"fragmento\":\"cita textual del informe a revisar\",\"sugerencia\":\"observación clara y concreta para la docente\"}]\n\n" +
    "Si el informe está bien y no requiere cambios, devolvé un array vacío []. No inventes problemas que no existen. Priorizá las sugerencias más importantes (máximo 8).";
}

export function userCorreccionInforme(nivel, texto, prioridad) {
  return "Revisá el siguiente informe de alumno" +
    (nivel ? " (" + nivel + ")" : "") + ".\n" +
    (prioridad ? "El directivo pide prestar especial atención a: " + prioridad + "\n" : "") +
    "\nINFORME:\n" + texto + "\n\n" +
    "Devolvé el JSON con las sugerencias de mejora para la docente.";
}