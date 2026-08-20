# Despliegue y migración de OVI

OVI es un **repositorio autónomo**. No depende de ningún otro proyecto.
Necesita solo dos cosas: un runtime **Node** y una base **PostgreSQL** propia.

---

## Dirección en producción

**https://ovi-eta.vercel.app/**

Es la que se reparte al equipo y la que va en los manuales. La asigna Vercel al
proyecto y es estable: no cambia con cada despliegue.

No repartir las direcciones largas de un despliegue puntual
(`ovi-<hash>-....vercel.app`, `ovi-git-main-....vercel.app`): quedan
congeladas en una versión vieja o dejan de servir en el siguiente deploy.

---

## Opción A — Vercel + Neon/Supabase (rápida, recomendada para empezar)

1. **Base de datos (nueva y exclusiva de OVI):**
   - Crea un proyecto gratis en [Neon](https://neon.tech) o [Supabase](https://supabase.com).
   - Copia la cadena de conexión (`postgresql://…?sslmode=require`).
   > No reutilices la base de otro proyecto. OVI debe tener la suya.

2. **Vercel:**
   - Importa este repositorio (`pduchez/OVI`). **Root Directory = `/`** (raíz, por defecto).
   - Framework: Next.js (se detecta solo).
   - Variables de entorno:
     - `DATABASE_URL` = la cadena del paso 1.
     - `AUTH_SECRET` = un texto largo aleatorio (ej. `openssl rand -hex 32`).
   - Deploy. El build corre `prisma db push` y crea las tablas solo.

3. **Primer ingreso:** el primer login crea automáticamente los usuarios base
   (`director1` / `password`). Cámbiale la contraseña en Administración.
   Para cargar datos de demostración: `npm run db:seed` (opcional, solo pruebas).

## Opción B — Cualquier servidor Node + Postgres (para migrar sin Vercel)

```bash
# En el servidor, con Node 20+ y una BD Postgres accesible:
export DATABASE_URL="postgresql://usuario:pass@host:5432/ovi"
export AUTH_SECRET="…secreto largo…"
npm ci
npm run build          # genera cliente Prisma, aplica esquema y compila
npm start              # sirve en el puerto $PORT (default 3000)
```

Ponlo detrás de Nginx/Caddy o un `systemd`/PM2 y listo. Como todo el estado vive
en Postgres, **migrar = apuntar `DATABASE_URL` a la nueva base** y redeployar.

## Portar los datos de una plataforma a otra

Al ser Postgres estándar, se migra con herramientas comunes:

```bash
pg_dump "$ORIGEN_DATABASE_URL"  > ovi.sql
psql    "$DESTINO_DATABASE_URL" < ovi.sql
```

No hay archivos en disco que respaldar: imágenes, sesiones y catálogos están en
la base. Esto hace la salida de Vercel/GitHub trivial cuando llegue el momento.

## Notas de operación

- **Backups:** activa los snapshots automáticos de tu proveedor de Postgres.
- **Seguridad:** `AUTH_SECRET` fuerte; las contraseñas se guardan con scrypt.
- **Rendimiento en sitio:** la app es liviana; si el internet del proyecto es muy
  lento, igual carga porque casi todo se renderiza en el servidor.
