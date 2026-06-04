// src/tourData.js
export const TOURS = {
  dashboard: [
    {
      selector: null,
      title: "¡Bienvenido a AulaXpro! 👋",
      text: "Esta es tu pantalla de inicio. Desde acá podés ver un resumen de tus materias, biblioteca y accesos rápidos a las funciones principales.",
      position: "center",
    },
    {
      selector: "[data-tour='subjects-grid']",
      title: "Tus Materias",
      text: "Cada materia que cargues puede tener su programa, nivel y bibliografía en PDF. La IA usa ese contexto para generar material más preciso.",
      position: "bottom",
    },
    {
      selector: "[data-tour='quick-access']",
      title: "Acceso Rápido",
      text: "Los 4 botones de acceso rápido te llevan directo a las funciones que más vas a usar: Generador, Chat, Multimedia y Corrector.",
      position: "top",
    },
    {
      selector: "[data-tour='add-subject-btn']",
      title: "Creá tu primera materia",
      text: "Hacé clic acá para crear una materia. Podés cargar el programa completo y PDFs de bibliografía para que la IA tenga contexto real.",
      position: "bottom",
    },
  ],

  generator: [
    {
      selector: "[data-tour='gen-types']",
      title: "Tipos de Contenido",
      text: "Elegí qué querés generar: Actividad Completa, Rúbrica, Evaluación, Material Didáctico, Presentación, Guía de Estudio o Contenido NEE.",
      position: "right",
    },
    {
      selector: "[data-tour='gen-params']",
      title: "Nivel y Dificultad",
      text: "Seleccioná el nivel educativo y la dificultad. Esto afecta el vocabulario, la complejidad de las consignas y los ejemplos que usa la IA.",
      position: "right",
    },
    {
      selector: "[data-tour='gen-form']",
      title: "Tema y configuración",
      text: "Escribí el tema específico. En 'Instrucciones adicionales' podés pedir: grupos de 4, enfoque por proyectos, incluir tecnología, etc.",
      position: "left",
    },
    {
      selector: "[data-tour='gen-diff']",
      title: "Diferenciación Automática",
      text: "Con un clic generás 3 versiones: Básica, Estándar y Avanzada. Ideal para atender distintos ritmos de aprendizaje en el aula.",
      position: "top",
    },
  ],

  multimedia: [
    {
      selector: "[data-tour='mm-types']",
      title: "Tipos de Multimedia",
      text: "Generá Guiones de Podcast, Infografías para Canva, Guiones de Video, Presentaciones slide por slide, o Imágenes con IA.",
      position: "right",
    },
    {
      selector: "[data-tour='mm-form']",
      title: "Generá tu contenido",
      text: "Ingresá el tema y las instrucciones opcionales. Para imágenes, describí lo que querés: 'diagrama del ciclo del agua', 'mapa conceptual de la célula', etc.",
      position: "left",
    },
  ],

  chat: [
    {
      selector: "[data-tour='chat-sessions']",
      title: "Sesiones de Chat",
      text: "Cada conversación se guarda con un título automático. Podés tener múltiples conversaciones en paralelo y retomar cualquiera cuando quieras.",
      position: "right",
    },
    {
      selector: "[data-tour='chat-context']",
      title: "Contexto de Materia",
      text: "Seleccioná una materia para que el Chat tenga acceso a tu programa. Así las respuestas son más específicas a tu contexto real.",
      position: "bottom",
    },
    {
      selector: "[data-tour='chat-input']",
      title: "Chat con búsqueda web",
      text: "Este chat tiene acceso a internet en tiempo real. Podés preguntar sobre noticias, clima, o combinar búsqueda web con preguntas pedagógicas.",
      position: "top",
    },
  ],

  corrector: [
    {
      selector: "[data-tour='corr-rubric']",
      title: "La Rúbrica",
      text: "Pegá o cargá la rúbrica desde tu Biblioteca. La IA evalúa cada criterio por separado y genera una devolución completa para el alumno.",
      position: "right",
    },
    {
      selector: "[data-tour='corr-photo']",
      title: "Fotografiar Examen",
      text: "¿El alumno entregó en papel? Sacale una foto desde acá. Claude extrae el texto de la imagen y lo usa para la corrección automática.",
      position: "bottom",
    },
    {
      selector: "[data-tour='corr-batch']",
      title: "Corrección en Batch",
      text: "Subí un Excel con Nombre (col A) y texto del trabajo (col B). La IA corrige todos en secuencia y guarda las notas en 'Mis Alumnos' automáticamente.",
      position: "top",
    },
  ],

  library: [
    {
      selector: "[data-tour='lib-filters']",
      title: "Filtrá tu Biblioteca",
      text: "Filtrá por tipo de contenido o buscá por tema y materia. Todos los materiales que guardás desde el Generador quedan acá.",
      position: "bottom",
    },
    {
      selector: "[data-tour='lib-export']",
      title: "Exportar todo",
      text: "Descargá toda tu biblioteca en un ZIP con todos los documentos, ideal para hacer un backup completo.",
      position: "bottom",
    },
  ],

  bank: [
    {
      selector: null,
      title: "Banco de Preguntas",
      text: "Acá se guardan las evaluaciones que marcaste como 'Banco'. Desde el Banco Inteligente podés extraer preguntas individuales para reutilizarlas.",
      position: "center",
    },
  ],

  smartbank: [
    {
      selector: "[data-tour='smartbank-import']",
      title: "Importar del Banco",
      text: "Seleccioná una evaluación guardada y Claude extrae todas las preguntas clasificadas por tema, tipo y dificultad.",
      position: "right",
    },
    {
      selector: "[data-tour='smartbank-list']",
      title: "Seleccioná y armá",
      text: "Marcá preguntas de distintas evaluaciones y generá una nueva evaluación lista para imprimir con clave de respuestas.",
      position: "left",
    },
  ],

  sequences: [
    {
      selector: "[data-tour='seq-form']",
      title: "Generar Secuencia Didáctica",
      text: "Ingresá el tema y elegí entre 4, 6 u 8 clases. La IA genera una progresión con objetivos, inicio/desarrollo/cierre y evaluación para cada clase.",
      position: "right",
    },
    {
      selector: "[data-tour='seq-list']",
      title: "Secuencias Guardadas",
      text: "Todas tus secuencias quedan acá. Podés verlas, exportarlas a Word o PDF y organizarlas por materia.",
      position: "right",
    },
  ],

  students: [
    {
      selector: "[data-tour='students-list']",
      title: "Lista de Alumnos",
      text: "Agregá alumnos uno por uno o importá un Excel. A