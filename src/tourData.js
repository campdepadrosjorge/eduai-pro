export const TOURS = {
  dashboard: [
    {
      selector: null,
      title: "Bienvenido a AulaXpro",
      text: "Esta es tu pantalla de inicio. Desde aca podes ver un resumen de tus materias, biblioteca y accesos rapidos a las funciones principales.",
      position: "center",
    },
    {
      selector: "[data-tour='subjects-grid']",
      title: "Tus Materias",
      text: "Cada materia puede tener su programa, nivel y bibliografia en PDF. La IA usa ese contexto para generar material mas preciso.",
      position: "bottom",
    },
    {
      selector: "[data-tour='quick-access']",
      title: "Acceso Rapido",
      text: "Los 4 botones te llevan directo a las funciones principales: Generador, Chat, Multimedia y Corrector.",
      position: "top",
    },
    {
      selector: "[data-tour='add-subject-btn']",
      title: "Crea tu primera materia",
      text: "Hace clic aca para crear una materia. Podes cargar el programa completo y PDFs de bibliografia.",
      position: "bottom",
    },
  ],
  generator: [
    {
      selector: "[data-tour='gen-types']",
      title: "Tipos de Contenido",
      text: "Elegí que queres generar: Actividad Completa, Rubrica, Evaluacion, Material Didactico, Presentacion, Guia de Estudio o Contenido NEE.",
      position: "right",
    },
    {
      selector: "[data-tour='gen-params']",
      title: "Nivel y Dificultad",
      text: "Selecciona el nivel educativo y la dificultad. Esto afecta el vocabulario y la complejidad de las consignas.",
      position: "right",
    },
    {
      selector: "[data-tour='gen-form']",
      title: "Tema y configuracion",
      text: "Escribi el tema especifico. En instrucciones adicionales podes pedir: grupos de 4, enfoque por proyectos, incluir tecnologia, etc.",
      position: "left",
    },
    {
      selector: "[data-tour='gen-diff']",
      title: "Diferenciacion Automatica",
      text: "Con un clic generás 3 versiones: Basica, Estandar y Avanzada. Ideal para atender distintos ritmos de aprendizaje.",
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
      text: "Ingresa el tema y las instrucciones opcionales. Para imagenes, describe lo que queres: diagrama del ciclo del agua, mapa conceptual de la celula, etc.",
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
      text: "Este chat tiene acceso a internet en tiempo real. Podes preguntar sobre noticias, clima, o combinar busqueda web con preguntas pedagogicas.",
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
      text: "El alumno entrego en papel? Sacale una foto desde aca. Claude extrae el texto de la imagen y lo usa para la correccion automatica.",
      position: "bottom",
    },
    {
      selector: "[data-tour='corr-batch']",
      title: "Correccion en Batch",
      text: "Subi un Excel con Nombre en col A y texto del trabajo en col B. La IA corrige todos y guarda las notas en Mis Alumnos automaticamente.",
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
      text: "Aca se guardan las evaluaciones que marcaste como Banco. Desde el Banco Inteligente podes extraer preguntas individuales para reutilizarlas.",
      position: "center",
    },
  ],
  smartbank: [
    {
      selector: "[data-tour='smartbank-import']",
      title: "Importar del Banco",
      text: "Selecciona una evaluacion guardada y Claude extrae todas las preguntas clasificadas por tema, tipo y dificultad.",
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
      text: "Ingresa el tema y elegi entre 4, 6 u 8 clases. La IA genera una progresion con objetivos, inicio, desarrollo, cierre y evaluacion para cada clase.",
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
  publiclib: [
    {
      selector: null,
      title: "Biblioteca Publica",
      text: "Contenido compartido por docentes de toda la plataforma. Podes guardar cualquier material en tu Biblioteca personal o exportarlo a Word.",
      position: "center",
    },
  ],
  projects: [
    {
      selector: null,
      title: "Proyectos Colaborativos",
      text: "Crea proyectos interdisciplinarios e invita colegas por email. Cada docente genera contenido desde su materia y todo queda centralizado.",
      position: "center",
    },
  ],
  pricing: [
    {
      selector: null,
      title: "Planes y Precios",
      text: "Tenes 7 dias de prueba gratuita. Los planes institucionales permiten cargar multiples docentes desde un Excel con duracion configurable.",
      position: "center",
    },
  ],
};