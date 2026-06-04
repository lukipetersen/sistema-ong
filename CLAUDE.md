# Sistema ONG — Documentación para Claude

> **IMPORTANTE:** No modificar las decisiones de arquitectura, stack tecnológico, ni estructura de carpetas sin pedir confirmación explícita al usuario antes de proceder.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma v5 |
| Base de datos | PostgreSQL (Supabase — cloud) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Validación | Zod (frontend y backend) |
| Formularios | React Hook Form + @hookform/resolvers |
| Queries frontend | TanStack React Query v5 |
| Gráficos | Recharts v3 |
| Exportes | jsPDF + jspdf-autotable (PDF), xlsx (Excel), HTML blob (Word), CSV nativo |
| Iconos | Lucide React |

---

## Estructura del repositorio

```
sistema-ong/                  ← raíz (npm workspaces)
├── frontend/                 ← workspace frontend (Vite + React)
│   └── src/
│       ├── pages/            ← páginas principales
│       ├── components/       ← componentes reutilizables
│       ├── contexts/         ← AuthContext
│       ├── types/            ← tipos TypeScript compartidos
│       └── utils/            ← exportes.ts, helpers
├── backend/                  ← workspace backend (Express)
│   └── src/
│       ├── routes/           ← endpoints REST
│       ├── middleware/        ← auth.ts, errores.ts
│       └── lib/              ← prisma.ts (cliente singleton)
│   └── prisma/
│       ├── schema.prisma     ← modelos y enums
│       └── migrations/       ← historial de migraciones SQL
├── CLAUDE.md                 ← este archivo
├── PROJECT_CONTEXT.md        ← log de progreso del proyecto
├── render.yaml               ← configuración deploy backend en Render
└── docker-compose.yml        ← PostgreSQL local para desarrollo
```

---

## Infraestructura / Deploy

| Servicio | Plataforma | Notas |
|----------|-----------|-------|
| Frontend | **Vercel** | Auto-deploy desde `main` |
| Backend | **Railway** (Web Service) | Docker, auto-deploy desde `main` |
| Base de datos | **Supabase** (PostgreSQL) | Migrada desde Neon en junio 2026 |

- `DATABASE_URL` en Railway → Session Pooler de Supabase (puerto 5432, `aws-1-us-west-2.pooler.supabase.com`)
- `VITE_API_URL` configurada en Vercel, apunta al backend de Railway
- El backend corre `npx prisma migrate deploy` al iniciar (via Dockerfile CMD)

---

## Modelos Prisma

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| Usuario | usuarios | Usuarios del sistema (roles: ADMINISTRADOR, COORDINADOR, OPERADOR, SOLO_LECTURA) |
| Sesion | sesiones | Refresh tokens activos |
| Gasto | gastos | Egresos financieros (categorías: FIJOS, VARIABLES, ADMINISTRACION, INVERSION) |
| Ingreso | ingresos | Ingresos financieros (tipos: VENTA, CUOTA, DONACION) |
| Asociado | asociados | Pacientes/socios con patología, estado de cuota y seguimientos |
| SeguimientoTerapeutico | seguimientos_terapeuticos | Seguimientos vinculados a asociado, genética, lote y planta |
| Genetica | geneticas | Variedades de cannabis |
| Lote | lotes | Lotes de cultivo por sala (SALA_1, SALA_2) |
| Planta | plantas | Plantas individuales dentro de un lote |
| HistorialLote | historial_lotes | Auditoría de cambios de estado en lotes |
| CuotaGlobal | cuotas_globales | Monto de cuota por mes |
| CuotaMes | cuotas_mensuales | Registro de cuota por asociado por mes |
| PagoAsociado | pagos_asociados | Pagos individuales vinculados a ingresos |
| Auditoria | auditoria | Log de acciones del sistema |
| Sede | sedes | Sucursales/sedes de la organización |
| ConfiguracionOrg | configuracion_org | Configuración clave-valor |

---

## Páginas implementadas

| Ruta | Componente | Estado |
|------|-----------|--------|
| `/` | Dashboard | ✅ Implementado |
| `/finanzas` | Finanzas | ✅ Implementado |
| `/asociados` | ListaAsociados | ✅ Implementado |
| `/asociados/:id` | FichaAsociado | ✅ Implementado |
| `/asociados/nuevo` | FormularioAsociado | ✅ Implementado |
| `/asociados/:id/editar` | FormularioAsociado | ✅ Implementado |
| `/geneticas` | Geneticas | ✅ Implementado (con drill-down: Genética → Lote → Plantas, filtro por sala) |
| `/reportes` | Reportes | ✅ Implementado (Dashboard, Financiero, Asociados, Productivo, Personalizado) |
| `/beneficiarios` | Proximamente | 🔜 Pendiente |
| `/voluntarios` | Proximamente | 🔜 Pendiente |
| `/donaciones` | Proximamente | 🔜 Pendiente |
| `/proyectos` | Proximamente | 🔜 Pendiente |
| `/inventario` | Proximamente | 🔜 Pendiente |
| `/eventos` | Proximamente | 🔜 Pendiente |
| `/socios` | Proximamente | 🔜 Pendiente |
| `/configuracion` | Proximamente | 🔜 Pendiente |

---

## Endpoints REST

Todos requieren `Authorization: Bearer <token>` excepto `/api/auth`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/gastos` | Listar gastos (filtros: desde, hasta, categoria) |
| POST | `/api/gastos` | Crear gasto |
| PUT | `/api/gastos/:id` | Editar gasto |
| DELETE | `/api/gastos/:id` | Eliminar gasto |
| GET | `/api/ingresos` | Listar ingresos (filtros: desde, hasta, tipo) |
| POST | `/api/ingresos` | Crear ingreso |
| PUT | `/api/ingresos/:id` | Editar ingreso |
| DELETE | `/api/ingresos/:id` | Eliminar ingreso |
| GET | `/api/asociados` | Listar asociados |
| POST | `/api/asociados` | Crear asociado |
| GET | `/api/asociados/:id` | Detalle asociado |
| PUT | `/api/asociados/:id` | Editar asociado |
| DELETE | `/api/asociados/:id` | Eliminar asociado |
| GET | `/api/geneticas` | Listar genéticas |
| POST | `/api/geneticas` | Crear genética |
| GET | `/api/geneticas/:id` | Detalle genética (con lotes y plantas) |
| PUT | `/api/geneticas/:id` | Editar genética |
| DELETE | `/api/geneticas/:id` | Eliminar genética |
| GET | `/api/lotes` | Listar lotes (filtros: geneticaId, sala, estado) |
| POST | `/api/lotes` | Crear lote (con plantas iniciales opcionales) |
| PUT | `/api/lotes/:id` | Editar lote |
| DELETE | `/api/lotes/:id` | Eliminar lote |
| GET | `/api/plantas` | Listar plantas (filtros: loteId, estado) |
| POST | `/api/plantas` | Crear planta |
| PUT | `/api/plantas/:id` | Editar planta |
| DELETE | `/api/plantas/:id` | Eliminar planta |
| GET | `/api/reportes/dashboard` | KPIs ejecutivos |
| GET | `/api/reportes/financiero` | Reporte financiero con evolución y desglose |
| GET | `/api/reportes/asociados` | Reporte de asociados |
| GET | `/api/reportes/productivo` | Reporte productivo (genéticas/lotes/plantas) |

---

## Convenciones de código

- **Idioma:** Todo en español (variables, funciones, comentarios, UI)
- **Componentes:** Funcionales con hooks, sin clases
- **Estado server:** TanStack React Query o fetch directo con useState
- **Validación:** Zod schemas tanto en frontend (React Hook Form) como en backend
- **Errores:** El middleware `manejadorErrores` captura errores no manejados; las rutas usan try/catch propios
- **Códigos autogenerados:** Lotes `LOT-ABBREV-YEAR-SEQ`, Plantas `PL-ABBREV-LSEQ-PSEQ`
- **Decimales:** `Decimal` de Prisma para montos, siempre convertir con `Number()` al procesar

---

## Desarrollo local

```bash
# Requiere Docker para PostgreSQL local
npm run dev          # levanta DB + backend + frontend simultáneamente
npm run dev:backend  # solo backend (puerto 3001)
npm run dev:frontend # solo frontend (puerto 5173)

# Base de datos
cd backend
npm run db:migrate   # correr migraciones pendientes
npm run db:studio    # Prisma Studio (GUI)
npm run db:seed      # cargar datos de prueba
```

---

## Rama de desarrollo

- Rama principal: `main`
- Rama de feature activa: `claude/finance-ingresos-module-jIvCf`
- Las features se desarrollan en la rama feature y se mergean a `main` al completar
