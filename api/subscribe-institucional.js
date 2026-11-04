// api/subscribe-institucional.js
// Crea una suscripción institucional con PRECIO DINÁMICO en MercadoPago.
// El colegio elige cuántas cuentas docente/directivo quiere; el precio se
// calcula SERVER-SIDE (nunca se confía en el precio que manda el cliente)
// y se crea un preapproval con monto custom.

// ------------------------------------------------------------
// TARIFAS (editar acá si cambian los precios o los tramos)
// ------------------------------------------------------------
// Tarifas por pais (deben coincidir con la tabla visual del frontend).
// doc/dir = precio mensual por cuenta; sym/suf = como se muestra la moneda.
var TARIFAS = {
  AR: { doc: 12000, dir: 16000, sym: "$",   suf: " ARS", currency: "ARS" },
  MX: { doc: 249,   dir: 329,   sym: "$",   suf: " MXN", currency: "MXN" },
  CL: { doc: 9900,  dir: 12900, sym: "$",   suf: " CLP", currency: "CLP" },
  CO: { doc: 39900, dir: 52900, sym: "$",   suf: " COP", currency: "COP" },
  PE: { doc: 39,    dir: 52,    sym: "S/ ", suf: " PEN", currency: "PEN" },
  UY: { doc: 11,    dir: 15,    sym: "$",   suf: " USD", currency: "USD" },
  OT: { doc: 11,    dir: 15,    sym: "US$ ",suf: "",     currency: "USD" },
};
function tarifaPais(pais) { return TARIFAS[pais] || TARIFAS.AR; }

// Descuento por volumen según el TOTAL de cuentas (docente + directivo)
function descuentoPorVolumen(totalCuentas) {
  if (totalCuentas >= 21) return 0.25;
  if (totalCuentas >= 11) return 0.17;
  if (totalCuentas >= 5)  return 0.10;
  return 0;
}

// Calcula el precio mensual final en la moneda del pais. Devuelve el detalle.
function calcularPrecio(qDocentes, qDirectivos, pais) {
  var t = tarifaPais(pais);
  var totalCuentas = qDocentes + qDirectivos;
  var subtotal = (qDocentes * t.doc) + (qDirectivos * t.dir);
  var desc = descuentoPorVolumen(totalCuentas);
  var total = Math.round(subtotal * (1 - desc));
  return {
    totalCuentas: totalCuentas,
    subtotal: subtotal,
    descuento: desc,
    total: total,
    moneda: t.currency,
    sym: t.sym,
    suf: t.suf,
    pais: (TARIFAS[pais] ? pais : "AR"),
  };
}

export default async function handler(req, res) {
  // Endpoint de cálculo (GET): el formulario lo usa para mostrar el precio en vivo.
  if (req.method === "GET") {
    var qd = parseInt(req.query.docentes) || 0;
    var qdir = parseInt(req.query.directivos) || 0;
    var paisCalc = req.query.pais || "AR";
    if (qd + qdir < 1) return res.status(400).json({ error: "Indicá al menos una cuenta" });
    if (qd + qdir > 200) return res.status(400).json({ error: "Máximo 200 cuentas por institución" });
    return res.status(200).json(calcularPrecio(qd, qdir, paisCalc));
  }

  if (req.method !== "POST") return res.status(405).end();

  var institutionName = req.body.institution_name;
  var payerEmail = req.body.payer_email;
  var userId = req.body.user_id;
  var qDocentes = parseInt(req.body.docentes) || 0;
  var qDirectivos = parseInt(req.body.directivos) || 0;

  if (!institutionName || !payerEmail || !userId) {
    return res.status(400).json({ error: "institution_name, payer_email y user_id son requeridos" });
  }
  var totalCuentas = qDocentes + qDirectivos;
  if (totalCuentas < 1) return res.status(400).json({ error: "Indicá al menos una cuenta" });
  if (totalCuentas > 200) return res.status(400).json({ error: "Máximo 200 cuentas por institución" });

  // Precio calculado SIEMPRE en el server (fuente de verdad).
  // El pago online por MercadoPago es solo Argentina (ARS).
  var precio = calcularPrecio(qDocentes, qDirectivos, "AR");

  // external_reference institucional: el webhook lo reconoce por el prefijo INST|
  // Formato: INST|{userId}|{qDocentes}|{qDirectivos}|{maxUsers}
  var externalRef = "INST|" + userId + "|" + qDocentes + "|" + qDirectivos + "|" + totalCuentas;

  var baseUrl = process.env.APP_URL || "https://app.aulaxpro.com";

  try {
    var body = {
      reason: "AulaXpro Institucional - " + institutionName + " (" + totalCuentas + " cuentas)",
      external_reference: externalRef,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: precio.total,
        currency_id: "ARS",
      },
      back_url: baseUrl + "/?inst=ok",
      status: "pending",
    };

    var mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
    });

    var data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP preapproval error:", JSON.stringify(data));
      return res.status(502).json({ error: "No se pudo crear la suscripción en MercadoPago", detail: data.message || "" });
    }

    // init_point: la URL donde el directivo autoriza el débito recurrente
    return res.status(200).json({
      init_point: data.init_point,
      preapproval_id: data.id,
      precio: precio,
    });
  } catch (e) {
    console.error("subscribe-institucional error:", e.message);
    return res.status(500).json({ error: "Error interno", detail: e.message });
  }
}
