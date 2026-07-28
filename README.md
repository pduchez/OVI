# OVI — Central de ventas del Grupo Inmobiliario Chacón

**OVI** centraliza toda la información de venta de lotes de los proyectos del
Grupo Chacón: visitas, reservas, ventas, abonos, caídas y novedades. Reemplaza
el reporteo desordenado (por WhatsApp, llamadas y hojas sueltas) por **una sola
plataforma en línea** con dashboard, reportes y control de acceso por rol.

> **Proyecto independiente.** OVI es una aplicación totalmente separada, con su
> **propia base de datos**. No comparte código ni datos con ningún otro proyecto.

---

## ¿Qué resuelve?

- **Un solo lugar de la verdad.** El líder de cada proyecto registra lo que pasa;
  gerentes y directores lo ven al instante, sin perseguir a nadie.
- **Menos error humano.** Todo lo capturable es un **menú desplegable** (proyecto,
  vendedor, fuerza, motivo, método…). Campos grandes, formularios cortos.
- **Funciona en PC vieja e internet lento.** Render en el servidor, ~96 kB de
  JavaScript, sin librerías pesadas. Se ve igual de bien en celular.
- **Batería de reportes** exportables a CSV e imprimibles a PDF.

## Roles (4 niveles de acceso)

| Rol | Ve / hace |
|-----|-----------|
| **Director** (Director 1 y 2) | Todo. Administra proyectos, usuarios y vendedores. |
| **Gerente de ventas** | Todos los proyectos, filtrado a **su fuerza** (Oficina = Lic. Claudia · UCOES = Lic. Max). |
| **Líder de central** | Solo los **proyectos asignados** (varios a la vez). |
| **Líder de sitio** | Solo **su proyecto**. Registra el día a día. |

## Módulos

- **Tablero** — KPIs, embudo, ventas por fuerza y actividad reciente.
- **Registrar** — Visita · Reserva/Venta · Abono/Pago · Novedad/Problema.
- **Negocios** — cada venta con su ciclo de vida (reserva → venta → abonos →
  escritura, o caída con motivo) e historial de pagos.
- **Proyectos** — inventario y avance por proyecto.
- **Novedades** — bitácora de problemas con prioridad y estado.
- **Reportes** — Resumen ejecutivo · por proyecto · por vendedor · por fuerza ·
  análisis de caídas · cartera y cobranza. (CSV + Imprimir/PDF)
- **Administración** — alta/edición de proyectos, usuarios (con asignación de
  proyectos y contraseñas) y vendedores.

---

## Stack

Next.js 14 (App Router, Server Actions) · Prisma · PostgreSQL · Tailwind ·
TypeScript. Autenticación propia (scrypt + cookie firmada HMAC), **sin servicios
externos de login**.

## Puesta en marcha (local)

```bash
cp .env.example .env          # y pon tu DATABASE_URL de una BD Postgres NUEVA
npm install
npm run setup                 # prisma generate + db push + seed (datos demo)
npm run dev                   # http://localhost:3000
```

Usuarios de arranque (contraseña inicial `password`, cámbiala en Administración):

| Usuario | Rol |
|---------|-----|
| `director1`, `director2` | Director |
| `claudia` | Gerente (Interna/Oficina) |
| `max` | Gerente (UCOES) |
| `central1` | Líder de central (3 proyectos) |
| `sitio1` | Líder de sitio (1 proyecto) |

Los **15 proyectos** que se siembran son un punto de partida; el Director los
edita/reemplaza por los reales desde **Administración → Proyectos**.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena Postgres **exclusiva de OVI** (Neon, Supabase o Vercel Postgres). |
| `AUTH_SECRET` | Secreto largo y aleatorio para firmar sesiones. |

## Despliegue y migración

Ver [`DEPLOY.md`](./DEPLOY.md). OVI es un repositorio autónomo, listo para
**migrar fácil**: se despliega hoy en Vercel + Neon/Supabase y mañana se puede
mover a cualquier servidor Node + Postgres sin cambiar el código.
