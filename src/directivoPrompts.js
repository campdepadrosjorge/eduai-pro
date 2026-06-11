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