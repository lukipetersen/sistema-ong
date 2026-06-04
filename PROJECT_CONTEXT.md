# Project Context — Log de progreso

> Este archivo se actualiza al final de cada sesión o cambio de tema importante.
> Sirve para retomar el trabajo rápidamente en una nueva conversación.

---

## Estado actual del sistema (junio 2026)

### Deploy
- **Frontend:** Vercel → `sistema-ong-frontend-nine.vercel.app` ✅ funcionando
- **Backend:** Railway (Web Service, Docker) — migrando desde Render
- **Base de datos:** **Supabase** (PostgreSQL) ✅ migrada y funcionando

### Login
- Usuario admin creado y funcionando ✅
- JWT auth operativo ✅

---

## Módulos completados

### ✅ Finanzas (`/finanzas`)
- CRUD de ingresos (tipos: VENTA, CUOTA, DONACION)
- CRUD de gastos (categorías: FIJOS, VARIABLES, ADMINISTRACION, INVERSION; subcategorías: ALQUILER, INSUMOS, SUELDOS, SERVICIOS, MANTENIMIENTO, OTROS)
- Filtros por período, tipo/categoría
- Resumen mensual con totales

### ✅ Asociados (`/asociados`)
- Lista con búsqueda y filtros por estado y cuota
- Ficha completa del asociado (datos personales, patología, cuotas, seguimientos)
- Formulario crear/editar con validación Zod
- Gestión de cuotas mensuales y pagos

### ✅ Genéticas/Lotes/Plantas (`/geneticas`)
- Lista de genéticas con conteo de lotes y plantas
- Drill-down: Genética → Lote → Plantas individuales
- Filtro persistente por Sala 1 / Sala 2
- Vista de inventario por sala (todos los lotes de esa sala)
- Códigos autogenerados: `LOT-ABBREV-YEAR-SEQ` y `PL-ABBREV-LSEQ-PSEQ`
- CRUD completo para genéticas, lotes y plantas

### ✅ Reportes y Analítica (`/reportes`)
- **Tab Dashboard:** KPIs ejecutivos (financiero, asociados, productivo), alertas, mini charts
- **Tab Financiero:** Evolución 12 meses (AreaChart), desglose por tipo ingreso y subcategoría gasto, cuotas pendientes/vencidas. Filtro por período.
- **Tab Asociados:** Distribución por patología (BarChart), altas por mes, lista filtrable, asociados sin seguimiento reciente
- **Tab Productivo:** Stats genéticas/lotes/plantas, desglose por estado y sala
- **Tab Personalizado:** Constructor de reportes custom (elegir módulo, preview, exportar)
- **Exportes:** PDF (jsPDF), Excel (xlsx), CSV, Word (HTML blob)

---

## Historial de cambios importantes

### Junio 2026 — Migración a Supabase + Railway
- Base de datos migrada de Neon a **Supabase** (por costos)
- Backend migrado de Render a **Railway** (ya tenía `backend/Dockerfile` y `backend/railway.toml`)
- `DATABASE_URL` en Railway → Session Pooler Supabase (puerto 5432, `aws-1-us-west-2.pooler.supabase.com`)
- Datos exportados con `pg_dump` (PostgreSQL 18) desde Neon e importados con `psql` a Supabase

### Junio 2026 — Migración a Neon
- Base de datos migrada de Render PostgreSQL a **Neon**
- `DATABASE_URL` actualizada en Render env vars
- Datos exportados con `pg_dump` desde Render e importados con `psql` a Neon
- App verificada funcionando correctamente post-migración

### Junio 2026 — Fix migración ingresos
- **Bug:** `ingresos.tipo does not exist in the current database` — error 500 en Reportes Financiero
- **Causa:** La tabla `ingresos` en producción fue creada sin las columnas `tipo`, `categoria`, `estado` (schema drift entre la migración y lo que se aplicó en producción)
- **Fix:** Nueva migración `20260603000000_add_ingresos_tipo_categoria_estado` que agrega las columnas faltantes con `IF NOT EXISTS` y defaults
- Diagnóstico hecho agregando campo `detalle` temporalmente en respuestas 500 (luego removido)

### Mayo–Junio 2026 — Módulo Reportes
- Creado `frontend/src/pages/Reportes.tsx` (~1000 líneas)
- Creado `backend/src/routes/reportes.ts` (4 endpoints)
- Creado `frontend/src/utils/exportes.ts` (CSV, Excel, PDF, Word)
- Dependencias agregadas: `recharts`, `jspdf`, `jspdf-autotable`

### Mayo 2026 — Módulo Genéticas/Lotes/Plantas
- Creados `backend/src/routes/lotes.ts` y `plantas.ts`
- Creados `frontend/src/components/geneticas/Modal*.tsx`
- Filtro por sala con `VistaLotesPorSala` en la página Genéticas
- Migración `20260529205239_add_geneticas_lotes_plantas`

### Mayo 2026 — Módulo Asociados
- CRUD completo con seguimientos terapéuticos
- Gestión de cuotas (CuotaGlobal, CuotaMes, PagoAsociado)
- Migraciones: `add_asociados`, `pago_ingreso_id`, `cuota_mensual`, `cuotas_mensuales`, `cuotas_globales`

### Mayo 2026 — Módulo Finanzas
- CRUD ingresos y gastos
- Migración `add_gastos` y `add_ingresos`

---

## Pendiente / Próximas funcionalidades

Las siguientes rutas muestran "Próximamente":
- `/beneficiarios`
- `/voluntarios`
- `/donaciones`
- `/proyectos`
- `/inventario`
- `/eventos`
- `/socios`
- `/configuracion`

---

## Notas técnicas importantes

- **Supabase (Prisma config):** `DATABASE_URL` apunta al Session Pooler (puerto 5432, `aws-1-us-west-2.pooler.supabase.com`). Session pooler soporta DDL, por lo que no se necesita `directUrl`.
- **Railway:** backend deployado con Docker (`backend/Dockerfile` + `backend/railway.toml`). La única var de DB necesaria es `DATABASE_URL`.
- **Prisma migrate deploy** corre automáticamente al iniciar el backend (definido en `startCommand` de render.yaml)
- **Decimal de Prisma:** Los campos `monto` son `Decimal` en Prisma — siempre usar `Number(v)` o `num(v)` al operar con ellos en JavaScript
- El campo `VITE_API_URL` en Vercel debe apuntar a la URL del backend de Render (sin trailing slash)
