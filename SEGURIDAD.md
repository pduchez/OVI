# Seguridad de OVI

Resumen de las defensas de la plataforma y de las revisiones hechas. Sirve como
referencia para auditorías futuras y para quien mantenga el sistema.

---

## Cómo se protege el acceso

| Riesgo | Defensa |
|---|---|
| Robo/forja de sesión | Cookie firmada con HMAC-SHA256 + expiración embebida. `AUTH_SECRET` obligatorio en producción (32+ caracteres): si falta, la app **falla cerrado**, nunca usa un valor por defecto. |
| Robo de cookie por JavaScript | Cookie `httpOnly` (el navegador no la expone a scripts), `secure` en producción (solo HTTPS) y `sameSite=lax`. |
| Adivinar contraseñas (fuerza bruta) | Bloqueo de 15 minutos tras 5 intentos fallidos, por usuario+IP. El mensaje de error no revela si el usuario existe o está inactivo. |
| Contraseñas expuestas si se filtra la base | Hash **scrypt** con sal única por usuario (nunca se guarda la contraseña). |
| Usuario dado de baja que sigue entrando | Cada petición revalida el usuario contra la base: un inactivo pierde el acceso al instante, aunque tenga sesión abierta. |
| Contraseña inicial compartida | Alta con `password` + **cambio obligatorio** en el primer ingreso. |

## Quién puede ver y hacer qué

- **Alcance por rol** (`src/lib/permissions.ts`): cada consulta se filtra por los
  proyectos y la fuerza de venta del usuario. Un vendedor no puede consultar
  datos de otra fuerza aunque manipule la URL.
- **Jerarquía**: solo se administra a usuarios de **rango inferior** (una
  asistente no puede editar ni desactivar a su gerente) y nadie se auto-modifica
  desde el panel de usuarios.
- **Precios**: solo gerentes de ventas y dirección los cambian; el vendedor
  toma el precio bloqueado del inventario.
- **Autorización por objeto**: los archivos (boletas, documentos) verifican que
  el usuario tenga acceso al negocio/proyecto asociado — no basta con conocer
  el identificador.
- **Bitácora de seguridad**: toda acción sensible (altas/bajas de usuarios,
  reset de contraseñas, cambios de precio, cargas y descargas de inventario)
  queda registrada con su responsable.

## Archivos subidos (boletas y documentos)

Es la superficie más expuesta, porque la alimenta el usuario:

1. **Se valida el contenido real** (firma binaria del archivo), no la extensión
   ni el tipo que declara el navegador —ambos se pueden falsificar—.
2. **Se rechazan** HTML, SVG, ejecutables y ZIP que no sean Excel. Un HTML o SVG
   con JavaScript servido desde nuestro dominio podría robar la sesión de quien
   lo abriera.
3. Un CSV debe **parecer una tabla**: se rechazan scripts y comandos.
4. Límite de **8 MB** por archivo.
5. Al servirlos: se usa el tipo verificado, con `nosniff`, `CSP sandbox` y
   **descarga forzada** para lo que no sea imagen o PDF.
6. **Inyección de fórmulas**: los textos que empiezan con `=`, `+`, `-` o `@` se
   neutralizan al exportar, para que Excel no los ejecute al abrir el archivo.

## Cabeceras de seguridad

`Content-Security-Policy` (con `frame-ancestors 'none'` contra clickjacking),
`X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`,
`Referrer-Policy` y `Permissions-Policy`. Se oculta `X-Powered-By`.

## Dependencias

Se mantienen al mínimo — en producción solo: `next`, `react`, `react-dom`,
`@prisma/client` y `zod`.

- La lectura/escritura de Excel es **propia** (`src/lib/xlsx.ts`), sin
  dependencias externas y con límites contra archivos maliciosos ("zip bomb",
  XML gigante). Se hizo así porque las librerías populares arrastraban
  vulnerabilidades explotables justo al leer archivos subidos.
- Consultas siempre vía Prisma con parámetros: **no hay SQL construido a mano**,
  por lo que no hay inyección SQL.
- React escapa el contenido por defecto y no se usa `dangerouslySetInnerHTML`.

**Avisos residuales de `npm audit`:** quedan 3 avisos en paquetes internos de
Next (`postcss` y `sharp`). **No son alcanzables en OVI**: `postcss` procesa
únicamente nuestro propio CSS en el build, y `sharp` solo lo usa `next/image`,
que esta aplicación no utiliza. Solo el equipo de Next puede actualizarlos.

## Recomendaciones de operación

1. **`AUTH_SECRET` largo y único** (`openssl rand -hex 32`). Si se cambia, se
   cierran todas las sesiones abiertas — útil ante una sospecha.
2. **Cambiar las contraseñas iniciales** de todos los usuarios al arrancar.
3. **Dar de baja** (no borrar) a quien se retire: conserva la trazabilidad.
4. **Respaldos** automáticos activos en el proveedor de PostgreSQL.
5. Revisar periódicamente **Administración → Bitácora de seguridad**.
6. Ejecutar `npm audit` y actualizar Next cuando haya versiones nuevas.

## Auditoría de agosto 2026

Revisión formal por capas (autenticación, autorización, entrada, base de
datos, transporte y dependencias). Ocho hallazgos, todos corregidos y
verificados con pruebas reales contra la aplicación en modo producción.

### Crítico — páginas de administración sin control de acceso

`/admin`, `/admin/seguridad`, `/admin/proyectos`, `/admin/vendedores` y
`/usuarios` solo comprobaban que hubiera **sesión**, no **permiso**. El menú
escondía el enlace, pero esconder un enlace no es control de acceso: cualquier
vendedor que escribiera la URL entraba y leía la bitácora de seguridad
completa y el padrón con los correos y celulares de las 47 personas.

Corregido con guardias explícitas (`src/lib/guards.ts`) en cada página.
Verificado: un usuario `ventasViabypass` rebota al tablero en las cinco rutas.

### Crítico — la base de datos quedaba expuesta por la API de Supabase

Supabase publica el esquema `public` por su API REST con la llave `anon`, que
es pública por diseño. Las tablas que crea Prisma nacen **sin Row Level
Security** y con permisos para ese rol. Se comprobó en una base equivalente:
sin blindaje, el rol público **leía todos los usuarios con sus hashes** y
**podía convertir a un vendedor en director con un solo UPDATE**.

Corregido con `scripts/harden-db.mjs`, que corre en cada despliegue: activa
RLS en todas las tablas y revoca los permisos de `anon`/`authenticated`,
también para las tablas futuras. OVI se conecta como dueño de las tablas, así
que no le afecta. Verificado antes y después: de leer todo, a
`permission denied`.

### Alto — una contraseña robada seguía sirviendo tras cambiarla

El token de sesión solo llevaba usuario y vencimiento, así que cambiar la
contraseña no cerraba las sesiones abiertas: quien tuviera la cookie seguía
dentro hasta 12 horas. Ahora el token lleva la **generación** del usuario
(`sessionEpoch`), que sube al cambiar o restablecer la contraseña y al dar de
baja. Verificado con dos navegadores: al cambiar la contraseña, el segundo
queda fuera al instante y el titular sigue trabajando.

### Alto — el freno de fuerza bruta no frenaba

Vivía en memoria del proceso. En Vercel cada petición puede caer en una
instancia distinta, así que el contador se reiniciaba solo. Peor: la IP se
tomaba del primer valor de `x-forwarded-for`, que lo escribe quien envía la
petición, así que bastaba con cambiar esa cabecera en cada intento.

Ahora vive en la base (tabla `LoginAttempt`), cuenta por **usuario y por IP**,
y la IP sale de las cabeceras que pone la plataforma y el cliente no puede
falsificar. Verificado: bloquea al quinto intento y sigue bloqueando aunque se
falsifique la IP y se mande la contraseña correcta.

### Medio — `/api/health` era público y detallado

Decía a cualquiera si la base conectaba, con qué tipo de conexión y **cuántos
usuarios hay**. Ahora en público responde solo tres booleanos; el detalle
exige sesión de Dirección o el `HEALTH_TOKEN`, que es la vía que sirve cuando
nadie puede entrar precisamente porque la base está caída.

### Medio — se podía averiguar qué usuarios existen por el tiempo de respuesta

Si el usuario no existía, no se llegaba a verificar la contraseña y la
respuesta volvía mucho antes. Ahora se hace igualmente el trabajo de un
scrypt aunque no exista.

### Medio — política de contraseñas insuficiente

El mínimo era 6 caracteres y se aceptaba `password`, que es justo la clave
inicial que reparte OVI. Ahora exige 10, rechaza una lista de claves obvias,
no deja que contenga el nombre de usuario, ni repetir un solo carácter, ni
reutilizar la anterior. El coste de scrypt subió de N=16384 a N=65536, con
formato versionado: las contraseñas existentes se siguen aceptando y se
actualizan solas al siguiente ingreso.

### Medio — dependencias y cabeceras

Tres vulnerabilidades altas heredadas de Next.js (`postcss`, `sharp`).
Resueltas subiendo a Next 16.3.0: `npm audit` en cero.

La CSP llevaba `script-src 'unsafe-inline'`, que anula buena parte de su
utilidad. Ahora se arma por petición con un **nonce** distinto cada vez
(`src/middleware.ts`), y se añadieron `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy` y `Cache-Control: private, no-store` en páginas
y API, para que ninguna caché intermedia guarde la pantalla de un usuario y se
la sirva a otro.

### Endurecimientos menores del mismo paso

- El formulario de usuarios ya no acepta ids de proyecto inventados ni un
  superior inexistente, y valida el formato del nombre de usuario.
- La búsqueda de usuario al ingresar es determinista si hubiera dos que solo
  difieren en mayúsculas.

### Lo que sigue en manos del Grupo

- **Respaldos.** El plan gratuito de Supabase no los hace. Es el riesgo mayor
  que queda y no se arregla desde el código.
- **`AUTH_SECRET` y `HEALTH_TOKEN`** deben estar definidos en Vercel. Sin
  `AUTH_SECRET` de 32+ caracteres, OVI se niega a arrancar en producción.
- **Revisar la bitácora.** Registrar sin que nadie lea es solo generar datos.

## Qué se revisó y corrigió (auditoría)

7 hallazgos corregidos y verificados con pruebas de ataque: secreto de sesión
con valor por defecto, XSS almacenado vía archivos, lectura de archivos ajenos
(IDOR), fuerza bruta en el login, dependencia con contaminación de prototipos,
escalada de privilegios entre roles y ausencia de cabeceras de seguridad.
Además se actualizó Next.js 14 → 16, cerrando 22 avisos de seguridad.
