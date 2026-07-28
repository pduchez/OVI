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

## Roles y accesos

| Rol | Usuario | Ve / hace |
|-----|---------|-----------|
| **Director** | `director1`, `director2` | Todo. Administra proyectos, usuarios y seguridad. |
| **Gerente de ventas** | `gerente_interna`, `gerente_ucoes` | Toda la actividad de todos los proyectos. **Fija los precios** y carga inventario. |
| **Asistente ejecutiva** | `asist_interna`, `asist_ucoes`, `asist_dp` | Igual que el gerente pero **sin tocar precios**. Administra los usuarios de su fuerza. |
| **Ventas de sitio** | `ventas<Proyecto>` | **Su** proyecto: registra el día a día y **marca los lotes que se reservan o se venden**. |
| **UCOES** | `vucoes1` … `vucoes10` | Ven el inventario de **todos** los proyectos y venden en cualquiera. Su actividad queda en su fuerza. |
| **Destinopropiedades.com** | `vdp1` … `vdp10` | Igual que UCOES, en la fuerza DP. Su actividad no se mezcla con la de Chacón. |

El usuario de sitio se llama como su proyecto para recordarlo sin lista:
`ventasBypass`, `ventasCondadovillalourdes`, `ventasCumbresdesantiago`… El
ingreso **no distingue mayúsculas**.

### Dos reglas duras

1. **El precio del lote lo fija solo Grupo Chacón** (gerentes y dirección).
   Nadie más lo puede alterar, ni al reservar ni al vender.
2. **Toda reserva o venta va amarrada a un depósito con su boleta.** Sin la
   foto de la boleta no se puede marcar un lote. Solo la capa de mando puede
   registrar sin ella, y esa excepción queda anotada en la bitácora de
   seguridad con quién la hizo.

## Módulos

- **Tablero** — KPIs, embudo, ventas por fuerza y actividad reciente.
- **Registrar** — Visita · Reserva/Venta · Abono/Pago · Novedad/Problema.
- **Negocios** — cada venta con su ciclo de vida (reserva → venta → abonos →
  escritura, o caída con motivo) e historial de pagos.
- **Inventario** — lotes, precios y **estado real de cada lote**. Desde aquí
  el vendedor marca en el momento lo que se reserva o se vende, con la boleta
  del depósito; el lote queda bloqueado para todos al instante.
- **Novedades** — bitácora de problemas con prioridad y estado.
- **Reportes** — Resumen ejecutivo · por proyecto · por vendedor · por fuerza ·
  análisis de caídas · cartera y cobranza. (CSV + Imprimir/PDF)
- **Administración** — alta/edición de proyectos, usuarios (con asignación de
  proyectos y contraseñas) y vendedores.

---

## Stack

Next.js 16 (App Router, Server Actions) · Prisma · PostgreSQL · Tailwind ·
TypeScript. Autenticación propia (scrypt + cookie firmada HMAC), **sin servicios
externos de login**.

## Puesta en marcha (local)

```bash
cp .env.example .env          # y pon tu DATABASE_URL de una BD Postgres NUEVA
npm install
npm run setup                 # prisma generate + db push + seed (datos demo)
npm run dev                   # http://localhost:3000
```

Todos los usuarios nacen con la contraseña `password` y **la deben cambiar en
el primer ingreso**. Ver la tabla de roles arriba para los nombres de usuario.

Los **20 proyectos** del Grupo Chacón se siembran solos; cada proyecto nuevo
genera además su usuario `ventas<Proyecto>` sin tocar el código.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena Postgres **exclusiva de OVI** (Neon, Supabase o Vercel Postgres). |
| `AUTH_SECRET` | Secreto largo y aleatorio para firmar sesiones. |

## Carga de inventario

Desde **Inventario → (proyecto) → Importar**, con Excel (.xlsx, .xlsm), CSV, texto
tabulado o **PDF**. El lector acepta las distintas formas en que los programas generan un
Excel, así que no importa con qué herramienta se haya creado el archivo.

- Si el Excel trae **varias hojas**, OVI elige sola la que contiene los lotes y
  te dice cuál usó e cuántas ignoró.
- Los encabezados se reconocen de forma flexible (con o sin acentos):
  - **Número**: `Lote` o `Número`. Si además hay `Polígono` (o manzana/bloque),
    se combinan: polígono `A` + lote `12` → **A-12**.
  - **Área**: prefiere **m²** sobre v² (vara²).
  - **Precio**: prefiere el **precio de contado**; nunca toma el precio por
    vara²/m² (que es unitario).
  - **Estado**: reconoce vendido / reservado / bloqueado; lo que no reconoce
    (p. ej. "No especificado") queda **disponible**.
  - **Notas**: junta `Uso / categoría` y `Observaciones`.
- Lo que **no** se importa por ser calculado o redundante: área en v² (es la
  conversión de m²), prima y saldo a financiar (OVI los calcula con los abonos
  reales) y el precio unitario por vara².
- Un lote existente se **actualiza** por su número; si ya está reservado o
  vendido, la importación **no le cambia el estado**.

### PDF

OVI lee **listas de precios en PDF que tengan texto** (los que se exportan desde
Excel o Word). Reconoce el formato por polígono: detecta el encabezado
"POLÍGONO X" y luego cada fila de lote, tomando número, área en m² y precio de
contado.

**PDF escaneado (una foto del papel):** no se puede leer porque no contiene
texto. OVI lo detecta y lo dice claramente, en vez de adivinar cifras — un
precio mal leído se convertiría en una venta con precio equivocado. En ese caso:
pide la lista en Excel/CSV, o transcríbela (ver `docs/inventarios/`).

### Si un archivo no se puede leer

OVI dice **qué hojas encontró y qué columnas tenía cada una**, para saber al
instante qué corregir. Casos conocidos:

- **.xls (Excel 97-2003)**: no se puede leer. Ábrelo en Excel y guárdalo como
  **.xlsx**.
- **Falta la columna de lote o de precio**: revisa que la hoja tenga al menos
  una columna de lote (o polígono + lote) y una de precio o área.

## Aplicación en el celular

OVI se instala en el teléfono como una aplicación (PWA): al abrirla desde el
navegador aparece **“Instalar OVI”**; en iPhone, con “Compartir → Agregar a
inicio”. Queda con su ícono, a pantalla completa y sin barra del navegador.

**Los datos siempre se leen en vivo.** El caché guarda únicamente el “casco” de
la aplicación —íconos, logos y los archivos con hash de Next— nunca páginas ni
respuestas de `/api/`, donde viajan las boletas. Sin señal, OVI **avisa** en vez
de mostrar información vieja: un lote que apareciera disponible sin serlo
causaría una doble venta.

**Actualización automática:** cada día a las **8:00 AM hora de El Salvador** la
aplicación revisa si hay versión nueva y la aplica sola, de modo que todos los
usuarios corran la misma. Si el teléfono estuvo apagado a esa hora, se pone al
día la próxima vez que se abre. Esto actualiza la *aplicación*, no los datos:
esos ya son en tiempo real.

## Guías de uso

En [`docs/guias/`](./docs/guias) hay tres guías en PDF, con su fuente en HTML:

| Archivo | Para quién |
|---|---|
| `OVI-direccion.pdf` | Dirección — vista estratégica de las capacidades y los controles. |
| `OVI-mandos.pdf` | Gerentes y asistentes — todo lo que configuran y lo que requiere su autorización. |
| `OVI-vendedores.pdf` | Vendedores — paso a paso práctico del uso diario. |

Para regenerarlas después de editar el HTML: `npm run guias`.

## Seguridad

Ver [`SEGURIDAD.md`](./SEGURIDAD.md): modelo de acceso por rol, protección de
archivos subidos, cabeceras, y recomendaciones de operación.

## Despliegue y migración

Ver [`DEPLOY.md`](./DEPLOY.md). OVI es un repositorio autónomo, listo para
**migrar fácil**: se despliega hoy en Vercel + Neon/Supabase y mañana se puede
mover a cualquier servidor Node + Postgres sin cambiar el código.
