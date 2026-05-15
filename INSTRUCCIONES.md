# 🚀 EduAI Pro — Instrucciones de Deployment
## Stack: GitHub + Vercel + Supabase

---

## PASO 1 — Crear el proyecto en Supabase (base de datos y auth)

1. Entrá a **https://supabase.com** y creá una cuenta gratuita
2. Hacé click en **"New Project"**
   - Nombre: `eduai-pro`
   - Contraseña de base de datos: elegí una segura y guardala
   - Región: `South America (São Paulo)` — la más cercana a Argentina
3. Esperá ~2 minutos a que se cree el proyecto
4. Ir a **SQL Editor** (menú izquierdo) → **New Query**
5. Copiar y pegar todo el contenido de `schema.sql` → **Run**
   - Vas a ver "Success" en verde
6. Ir a **Settings → API** y copiar:
   - `Project URL` → la vas a necesitar después
   - `anon public` key → la vas a necesitar después

### Activar el email de confirmación (opcional pero recomendado)
- **Authentication → Settings → Email**
  - Podés desactivar "Confirm email" para que los usuarios entren directo sin confirmar
  - O dejarlo activado si querés mayor seguridad

---

## PASO 2 — Subir el proyecto a GitHub

1. Creá una cuenta en **https://github.com** si no tenés
2. Creá un **New Repository** (privado o público, como prefieras)
   - Nombre: `eduai-pro`
3. En tu computadora, abrí una terminal/consola en la carpeta del proyecto y ejecutá:

```bash
git init
git add .
git commit -m "Initial commit - EduAI Pro"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/eduai-pro.git
git push -u origin main
```

> Si no tenés Git instalado, descargalo de https://git-scm.com
> Si preferís, podés usar **GitHub Desktop** (interfaz gráfica): https://desktop.github.com

---

## PASO 3 — Obtener tu API Key de Anthropic

1. Entrá a **https://console.anthropic.com**
2. Ir a **API Keys** → **Create Key**
3. Copiá la clave (empieza con `sk-ant-...`) — guardala en un lugar seguro

> ⚠️ Esta clave tiene costo por uso. Anthropic ofrece créditos gratuitos al comenzar.
> Podés configurar límites de gasto en console.anthropic.com → Billing

---

## PASO 4 — Hacer el deployment en Vercel

1. Entrá a **https://vercel.com** y creá una cuenta (podés entrar con GitHub)
2. Hacé click en **"Add New → Project"**
3. Seleccioná el repositorio `eduai-pro` de tu GitHub
4. Vercel va a detectar automáticamente que es un proyecto Vite/React
5. En la sección **"Environment Variables"** agregá las siguientes 3 variables:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | La URL de tu proyecto Supabase (ej: `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | La `anon public` key de Supabase |
| `ANTHROPIC_API_KEY` | Tu clave de Anthropic (`sk-ant-...`) |

6. Hacé click en **"Deploy"**
7. Esperá ~1 minuto
8. ✅ Tu app va a estar disponible en una URL como `https://eduai-pro-xxxxx.vercel.app`

---

## PASO 5 — Configurar el dominio (opcional)

Si querés un dominio propio (ej: `eduai.tuescuela.edu.ar`):
1. En Vercel → tu proyecto → **Settings → Domains**
2. Agregá tu dominio y seguí las instrucciones para configurar el DNS

---

## ACTUALIZAR LA APP EN EL FUTURO

Cada vez que quieras hacer cambios en el código:
1. Modificá los archivos localmente
2. Ejecutá en la terminal:
```bash
git add .
git commit -m "Descripción del cambio"
git push
```
3. Vercel va a detectar el push y redesplegar automáticamente en ~1 minuto

---

## ESTRUCTURA DEL PROYECTO

```
eduai-pro/
├── api/
│   └── generate.js          ← API Route de Vercel (proxy a Anthropic)
├── src/
│   ├── App.jsx              ← App principal con toda la UI
│   ├── supabase.js          ← Cliente de Supabase
│   └── main.jsx             ← Entry point de React
├── index.html               ← HTML raíz
├── package.json             ← Dependencias
├── vite.config.js           ← Configuración de Vite
├── schema.sql               ← Schema de la base de datos
├── .env.example             ← Ejemplo de variables de entorno
├── .gitignore               ← Archivos excluidos de Git
└── INSTRUCCIONES.md         ← Este archivo
```

---

## PROBAR LOCALMENTE (antes de deployar)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables locales
cp .env.example .env.local
# Completar los valores reales en .env.local

# 3. Iniciar servidor de desarrollo
npm run dev

# La app abre en http://localhost:5173
```

> Para que el API proxy funcione localmente necesitás instalar Vercel CLI:
> ```bash
> npm install -g vercel
> vercel dev   # en lugar de npm run dev
> ```

---

## COSTOS APROXIMADOS

| Servicio | Plan gratuito incluye |
|----------|----------------------|
| **Vercel** | Hosting ilimitado para proyectos personales |
| **Supabase** | 500 MB DB, 50.000 usuarios auth, 2 GB storage |
| **Anthropic** | Créditos iniciales gratuitos (~$5 USD) |

Para uso en una sola institución escolar el plan gratuito es más que suficiente.
Para uso con muchos docentes, el costo de Anthropic depende del volumen de generaciones.

---

## SOPORTE

Si algo no funciona, los mensajes de error más comunes son:

- **"Error 401"** en generaciones → revisá que `ANTHROPIC_API_KEY` esté bien cargada en Vercel
- **"Error de conexión a Supabase"** → revisá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- **La app no carga datos** → verificar que el schema.sql se ejecutó correctamente en Supabase

---

*EduAI Pro — Desarrollado con Claude AI y React*
