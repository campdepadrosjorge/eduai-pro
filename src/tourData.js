// src/tourData.js
export const TOURS = {
  dashboard: [
    {
      selector: null,
      title: "¡Bienvenido a AulaXpro! 👋",
      text: "Esta es tu pantalla de inicio. Desde acá podés ver un resumen de tus materias, biblioteca y accesos rapidos a las funciones principales.",
      position: "center",
    },
    {
      selector: "[data-tour='subjects-grid']",
      title: "Tus Materias",
      text: "Cada materia que cargues puede tener su programa, nivel y bibliografia en PDF. La IA usa ese contexto para generar material mas preciso.",
      position: "bottom",
    },
    {
      selector: "[data-tour='quick-access']",
      title: "Acceso Rapido",
      text: "Los 4 botones de acceso rapido te llevan directo a las funciones que mas vas a usar: Generador, Chat, Multimedia y Corrector.",
      position: "top",
    },
    {
      selector: "[data-tour='add-subject-btn']",
      title: "Crea tu primera materia",
      text: "Hace clic aca para crear una materia. Podes cargar el programa completo y PDFs de bibliografia para que la IA tenga contexto real.",
      position: "bottom",
    },
  ],

  generator: [
    {
      selector: "[data-tour='gen-types']",
      title: "Tipos de Contenido",
      text: "Elegi que queres generar: Actividad Completa, Rubrica, Evaluacion, Material Didactico, Presentacion, Guia de Estudio o Contenido NEE.",
      position: "right",
    },
    {
      selector: "[data-tour='gen-params']",
      title: "Nivel y Dificultad",
      text: "Selecciona el nivel educativo y la dificultad. Esto afecta el vocabulario, la complejidad de las consignas y los ejemplos que usa la IA.",
      position: "right",
    },
    {
      selector: "[data-tour='gen-form']",
      title: "Tema y configuracion",
      text: "Escribi el tema especifico. En 'Instrucciones adicionales' podes pedir: grupos de 4, enfoque por proyectos, incluir tecnologia, etc.",
      position: "left",
    },
    {
      selector: "[data-tour='gen-diff']",
      title: "Diferenciacion Automatica",
      text: "Con un clic generas 3 versiones: Básica, Estandar y Avanzada. Ideal para atender distintos ritmos de aprendizaje en el aula.",
      position: "top",
    },
  ],

  multimedia: [
    {
      selector: "[data-tour='mm-types']",
      title: "Tipos de Multimedia",
      text: "Genera Guiones de Podcast, Infografias para Canva, Guiones de Video, Presentaciones slide por slide, o Imagenes con IA.",
      position: "right",
    },
    {
      selector: "[data-tour='mm-form']",
      title: "Genera tu contenido",
      text: "Ingresa el tema y las instrucciones opcionales. Para imagenes, describi lo que queres: 'diagrama del ciclo del agua', 'mapa conceptual de la celula', etc.",
      position: "left",
    },
  ],

  chat: [
    {
      selector: "[data-tour='chat-sessions']",
      title: "Sesiones de Chat",
      text: "Cada conversacion se guarda con un titulo automatico. Podes tener multiples conversaciones en paralelo y retomar cualquiera cuando quieras.",
      position: "right",
    },
    {
      selector: "[data-tour='chat-context']",
      title: "Contexto de Materia",
      text: "Selecciona una materia para que el Chat tenga acceso a tu programa. Asi las respuestas son mas especificas a tu contexto real.",
      position: "bottom",
    },
    {
      selector: "[data-tour='chat-input']",
      title: "Chat con busqueda web",
      text: "Este chat tiene acceso a internet en tiempo real. Podes preguntar sobre por ejemplo noticias, clima, o combinar búsqueda web con preguntas pedagogicas.",
      position: "top",
    },
  ],

  corrector: [
    {
      selector: "[data-tour='corr-rubric']",
      title: "La Rubrica",
      text: "Pega o carga la rubrica desde tu Biblioteca. La IA evalua cada criterio por separado y genera una devolucion completa para el alumno.",
      position: "right",
    },
    {
      selector: "[data-tour='corr-photo']",
      title: "Fotografiar Examen",
      text: "¿El alumno entrego en papel? Sacale una foto desde aca. AulaXpro extrae el texto de la imagen y lo usa para la correccion automatica.",
      position: "bottom",
    },
    {
      selector: "[data-tour='corr-batch']",
      title: "Correccion en Batch",
      text: "Subi un Excel con Nombre (col A) y texto del trabajo (col B). La IA corrige todos en secuencia y guarda las notas en 'Mis Alumnos' automaticamente.",
      position: "top",
    },
  ],

  library: [
    {
      selector: "[data-tour='lib-filters']",
      title: "Filtra tu Biblioteca",
      text: "Filtra por tipo de contenido o busca por tema y materia. Todos los materiales que guardas desde el Generador quedan aca.",
      position: "bottom",
    },
    {
      selector: "[data-tour='lib-export']",
      title: "Exportar todo",
      text: "Descarga toda tu biblioteca en un ZIP con todos los documentos, ideal para hacer un backup completo.",
      position: "bottom",
    },
  ],

  bank: [
    {
      selector: null,
      title: "Banco de Preguntas",
      text: "Aca se guardan las evaluaciones que marcaste como 'Banco'. Desde el Banco Inteligente podés extraer preguntas individuales para reutilizarlas.",
      position: "center",
    },
  ],

  smartbank: [
    {
      selector: "[data-tour='smartbank-import']",
      title: "Importar del Banco",
      text: "Selecciona una evaluación guardada y Claude extrae todas las preguntas clasificadas por tema, tipo y dificultad.",
      position: "right",
    },
    {
      selector: "[data-tour='smartbank-list']",
      title: "Selecciona y arma",
      text: "Marca preguntas de distintas evaluaciones y genera una nueva evaluacion lista para imprimir con clave de respuestas.",
      position: "left",
    },
  ],

  sequences: [
    {
      selector: "[data-tour='seq-form']",
      title: "Generar Secuencia Didactica",
      text: "Ingresa el tema y elegi entre 4, 6 u 8 clases. La IA genera una progresion con objetivos, inicio/desarrollo/cierre y evaluacion para cada clase.",
      position: "right",
    },
    {
      selector: "[data-tour='seq-list']",
      title: "Secuencias Guardadas",
      text: "Todas tus secuencias quedan aca. Podes verlas, exportarlas a Word o PDF y organizarlas por materia.",
      position: "right",
    },
  ],

  students: [
    {
      selector: "[data-tour='students-list']",
      title: "Lista de Alumnos",
      text: "Agrega alumnos uno por uno o importa un Excel. Al hacer clic en un alumno ves su historial, promedio y devoluciones.",
      position: "right",
    },
  ],