// api/generar-horario.js
// Generador de horarios escolares — backtracking con heurísticas.
// NO usa IA. Resuelve restricciones duras. Devuelve solución (parcial o total) + reporte.
//
// Entrada (POST): { user_id }
// Lee de Supabase las tablas hor_* del owner, genera el horario y lo guarda en hor_horario.

import { createClient } from "@supabase/supabase-js";

var supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

var TIEMPO_MAX_MS = 25000; // tope de seguridad (bajo el límite de Vercel)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  var uid = req.body.user_id;
  if (!uid) return res.status(400).json({ error: "user_id requerido" });

  try {
    // 1) Cargar todos los datos del owner
    var [jorn, mods, cursos, docentes, espacios, asigs] = await Promise.all([
      sel("hor_jornadas", uid),
      sel("hor_modulos", uid),
      sel("hor_cursos", uid),
      sel("hor_docentes", uid),
      sel("hor_espacios", uid),
      sel("hor_asignaciones", uid),
    ]);

    if (asigs.length === 0) return res.status(400).json({ error: "No hay asignaciones cargadas. Cargá al menos una asignación." });
    if (jorn.length === 0) return res.status(400).json({ error: "No configuraste la jornada (días y módulos)." });

    // 2) Construir la lista de slots (día + módulo de clase) por turno
    //    slotsPorTurno[turno] = [ {dia, modOrden, idx} ... ]
    var slotsPorTurno = {};
    jorn.forEach(function (j) {
      var dias = (j.dias || "").split(",").map(function (d) { return d.trim(); }).filter(Boolean);
      var modsClase = mods.filter(function (m) { return m.jornada_id === j.id && m.tipo === "clase"; })
                          .sort(function (a, b) { return a.orden - b.orden; });
      var lista = [];
      dias.forEach(function (dia) {
        modsClase.forEach(function (m, i) {
          lista.push({ dia: dia, modOrden: m.orden, idxClase: i, turno: j.turno });
        });
      });
      slotsPorTurno[j.turno] = lista;
    });

    // Mapa curso -> turno
    var turnoDeCurso = {};
    cursos.forEach(function (c) { turnoDeCurso[c.id] = c.turno || "manana"; });

    // Mapa disponibilidad docente -> set de "Dia-idxClase" (vacío = todos)
    var dispDocente = {};
    docentes.forEach(function (d) {
      if (!d.disponibilidad) { dispDocente[d.id] = null; return; } // null = todos
      var set = {};
      d.disponibilidad.split(";").filter(Boolean).forEach(function (sl) { set[sl.trim()] = true; });
      dispDocente[d.id] = set;
    });

    // 3) Expandir asignaciones en "clases sueltas" (una por hora semanal)
    var clases = [];
    asigs.forEach(function (a) {
      for (var h = 0; h < (a.horas_semanales || 1); h++) {
        clases.push({
          asignacion_id: a.id,
          materia_id: a.materia_id,
          curso_id: a.curso_id,
          docente_id: a.docente_id,
          espacio_id: a.espacio_id || null,
          espacio_tipo: a.espacio_tipo || null,
          turno: turnoDeCurso[a.curso_id] || "manana",
        });
      }
    });

    // 4) Heurística: ordenar por dificultad (docente con poca disponibilidad primero,
    //    y clases con espacio específico primero porque son más rígidas)
    clases.forEach(function (cl) {
      var disp = dispDocente[cl.docente_id];
      cl.libertad = disp === null ? 9999 : Object.keys(disp).length; // menos = más difícil
      if (cl.espacio_id) cl.libertad -= 1000; // forzar que vaya primero
    });
    clases.sort(function (a, b) { return a.libertad - b.libertad; });

    // 5) Estructuras de ocupación
    //    ocupado por: curso, docente, espacio -> set "turno|dia|modOrden"
    var ocupCurso = {}, ocupDoc = {}, ocupEsp = {};
    function key(turno, dia, mod) { return turno + "|" + dia + "|" + mod; }

    var espaciosPorTipo = {};
    espacios.forEach(function (e) { (espaciosPorTipo[e.tipo] = espaciosPorTipo[e.tipo] || []).push(e.id); });

    var resultado = [];   // clases ubicadas
    var noUbicadas = [];  // clases que no entraron
    var t0 = Date.now();

    // Verificar si una clase cabe en un slot (y devolver espacio asignado si aplica)
    function cabe(cl, slot) {
      var k = key(slot.turno, slot.dia, slot.modOrden);
      if (ocupCurso[cl.curso_id + "|" + k]) return null;         // curso ocupado
      if (ocupDoc[cl.docente_id + "|" + k]) return null;         // docente ocupado
      // disponibilidad docente
      var disp = dispDocente[cl.docente_id];
      if (disp !== null) {
        var slotKey = slot.dia + "-" + slot.idxClase;
        if (!disp[slotKey]) return null;
      }
      // espacio
      if (cl.espacio_id) {
        if (ocupEsp[cl.espacio_id + "|" + k]) return null;
        return { espacio_id: cl.espacio_id };
      }
      if (cl.espacio_tipo) {
        var candidatos = espaciosPorTipo[cl.espacio_tipo] || [];
        for (var i = 0; i < candidatos.length; i++) {
          if (!ocupEsp[candidatos[i] + "|" + k]) return { espacio_id: candidatos[i] };
        }
        return null; // necesita ese tipo y no hay libre
      }
      return { espacio_id: null }; // sin requisito de espacio
    }

    function asignar(cl, slot, espId) {
      var k = key(slot.turno, slot.dia, slot.modOrden);
      ocupCurso[cl.curso_id + "|" + k] = true;
      ocupDoc[cl.docente_id + "|" + k] = true;
      if (espId) ocupEsp[espId + "|" + k] = true;
      resultado.push({ cl: cl, slot: slot, espacio_id: espId });
    }
    function desasignar() {
      var r = resultado.pop();
      var k = key(r.slot.turno, r.slot.dia, r.slot.modOrden);
      delete ocupCurso[r.cl.curso_id + "|" + k];
      delete ocupDoc[r.cl.docente_id + "|" + k];
      if (r.espacio_id) delete ocupEsp[r.espacio_id + "|" + k];
      return r;
    }

    // 6) Backtracking
    var mejorParcial = 0;
    function resolver(idx) {
      if (Date.now() - t0 > TIEMPO_MAX_MS) return "timeout";
      if (idx >= clases.length) return true; // todas ubicadas
      var cl = clases[idx];
      var slots = slotsPorTurno[cl.turno] || [];
      for (var i = 0; i < slots.length; i++) {
        var esp = cabe(cl, slots[i]);
        if (esp) {
          asignar(cl, slots[i], esp.espacio_id);
          if (resultado.length > mejorParcial) mejorParcial = resultado.length;
          var r = resolver(idx + 1);
          if (r === true) return true;
          if (r === "timeout") return "timeout";
          desasignar();
        }
      }
      return false; // no se pudo ubicar esta clase en ningún slot
    }

    var estado = resolver(0);

    // Si falló o timeout, hacer un pase "greedy" para ubicar lo más posible sin backtracking
    if (estado !== true) {
      // reset y greedy
      ocupCurso = {}; ocupDoc = {}; ocupEsp = {}; resultado = []; noUbicadas = [];
      clases.forEach(function (cl) {
        var slots = slotsPorTurno[cl.turno] || [];
        var puesto = false;
        for (var i = 0; i < slots.length; i++) {
          var esp = cabe(cl, slots[i]);
          if (esp) { asignar(cl, slots[i], esp.espacio_id); puesto = true; break; }
        }
        if (!puesto) noUbicadas.push(cl);
      });
    }

    // 7) Guardar resultado en hor_horario (reemplaza el anterior)
    await supabase.from("hor_horario").delete().eq("owner_id", uid);
    if (resultado.length > 0) {
      var filas = resultado.map(function (r) {
        return {
          owner_id: uid,
          asignacion_id: r.cl.asignacion_id,
          curso_id: r.cl.curso_id,
          docente_id: r.cl.docente_id,
          materia_id: r.cl.materia_id,
          espacio_id: r.espacio_id,
          dia: r.slot.dia,
          modulo_orden: r.slot.modOrden,
          turno: r.slot.turno,
        };
      });
      // insertar en lotes de 500
      for (var b = 0; b < filas.length; b += 500) {
        await supabase.from("hor_horario").insert(filas.slice(b, b + 500));
      }
    }

    // 8) Armar reporte de lo no ubicado (agrupado por asignación)
    var reporte = armarReporte(noUbicadas, asigs, cursos, docentes, materiasMap(await sel("hor_materias", uid)));

    return res.status(200).json({
      ok: true,
      total_clases: clases.length,
      ubicadas: resultado.length,
      no_ubicadas: noUbicadas.length,
      completo: estado === true && noUbicadas.length === 0,
      timeout: estado === "timeout",
      reporte: reporte,
    });
  } catch (e) {
    console.error("generar-horario error:", e.message);
    return res.status(500).json({ error: "Error interno", detail: e.message });
  }
}

async function sel(tabla, uid) {
  var r = await supabase.from(tabla).select("*").eq("owner_id", uid);
  return r.data || [];
}
function materiasMap(arr) { var m = {}; arr.forEach(function (x) { m[x.id] = x.nombre; }); return m; }

function armarReporte(noUbicadas, asigs, cursos, docentes, materias) {
  if (noUbicadas.length === 0) return [];
  var cursoN = {}; cursos.forEach(function (c) { cursoN[c.id] = c.nombre; });
  var docN = {}; docentes.forEach(function (d) { docN[d.id] = d.nombre; });
  // agrupar por asignacion
  var porAsig = {};
  noUbicadas.forEach(function (cl) { porAsig[cl.asignacion_id] = (porAsig[cl.asignacion_id] || 0) + 1; });
  return Object.keys(porAsig).map(function (aid) {
    var cl = noUbicadas.find(function (x) { return x.asignacion_id === aid; });
    var mat = materias[cl.materia_id] || "Materia";
    var cur = cursoN[cl.curso_id] || "curso";
    var doc = docN[cl.docente_id] || "docente";
    return {
      texto: "No se pudieron ubicar " + porAsig[aid] + " hora(s) de " + mat + " en " + cur +
             " (" + doc + "). Revisá la disponibilidad del docente o la carga de horas.",
      materia: mat, curso: cur, docente: doc, horas: porAsig[aid],
    };
  });
}
