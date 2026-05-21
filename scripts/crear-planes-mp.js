// scripts/crear-planes-mp.js
// Ejecutar UNA SOLA VEZ para crear los planes en MercadoPago
// node scripts/crear-planes-mp.js
 
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
 
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
  return data;
}
 
async function main() {
  console.log("Creando planes en MercadoPago...\n");
 
  // Plan Individual Mensual
  await crearPlan({
    reason: "EduAI Pro - Individual Mensual",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 10000, // en centavos ARS (= $100 ARS ejemplo)
      currency_id: "ARS",
    },
    back_url: "https://eduai-pro-nine.vercel.app",
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
    },
  });
 
  // Plan Individual Anual
  await crearPlan({
    reason: "EduAI Pro - Individual Anual",
    auto_recurring: {
      frequency: 12,
      frequency_type: "months",
      transaction_amount: 96000,
      currency_id: "ARS",
    },
    back_url: "https://eduai-pro-nine.vercel.app",
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
    },
  });
 
  // Plan Institucional Basico Mensual
  await crearPlan({
    reason: "EduAI Pro - Institucional Basico Mensual",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 80000,
      currency_id: "ARS",
    },
    back_url: "https://eduai-pro-nine.vercel.app",
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
    },
  });
 
  // Plan Institucional Pro Mensual
  await crearPlan({
    reason: "EduAI Pro - Institucional Pro Mensual",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 150000,
      currency_id: "ARS",
    },
    back_url: "https://eduai-pro-nine.vercel.app",
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
    },
  });
 
  console.log("\nGuarda los IDs de los planes en Supabase tabla plans (campo mp_plan_id)");
}
 
main().catch(console.error);
 