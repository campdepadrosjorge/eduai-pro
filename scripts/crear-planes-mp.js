// scripts/crear-planes-mp.js
// Ejecutar UNA SOLA VEZ: node scripts/crear-planes-mp.js

const ACCESS_TOKEN = "TEST-8953457601925021-052021-ac2facf04bc481480384ba15a941c4a5-725828321"; // pegá tu token directamente

async function crearPlan(plan) {
  const res = await fetch("https://api.mercadopago.com/preapproval_plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ACCESS_TOKEN,
    },
    body: JSON.stringify(plan),
  });
  const data = await res.json();
  console.log("Plan creado:", plan.reason, "→ ID:", data.id);
  if(data.message) console.log("Error:", data.message);
  return data;
}

async function main() {
  console.log("Creando planes en MercadoPago...\n");

  await crearPlan({
    reason: "AulaXpro - Individual Mensual",
    auto_recurring: { frequency:1, frequency_type:"months", transaction_amount:12000, currency_id:"ARS" },
    back_url: "https://app.aulaxpro.com",
    payment_methods_allowed: { payment_types: [{ id:"credit_card" },{ id:"debit_card" }] },
  });

  await crearPlan({
    reason: "AulaXpro - Individual Anual",
    auto_recurring: { frequency:12, frequency_type:"months", transaction_amount:102000, currency_id:"ARS" },
    back_url: "https://app.aulaxpro.com",
    payment_methods_allowed: { payment_types: [{ id:"credit_card" },{ id:"debit_card" }] },
  });

  await crearPlan({
    reason: "AulaXpro - Institucional Basico",
    auto_recurring: { frequency:1, frequency_type:"months", transaction_amount:100000, currency_id:"ARS" },
    back_url: "https://app.aulaxpro.com",
    payment_methods_allowed: { payment_types: [{ id:"credit_card" },{ id:"debit_card" }] },
  });

  await crearPlan({
    reason: "AulaXpro - Institucional Pro",
    auto_recurring: { frequency:1, frequency_type:"months", transaction_amount:255000, currency_id:"ARS" },
    back_url: "https://app.aulaxpro.com",
    payment_methods_allowed: { payment_types: [{ id:"credit_card" },{ id:"debit_card" }] },
  });

  console.log("\nListo — copiá los IDs y actualizalos en App.jsx");
}

main().catch(console.error);