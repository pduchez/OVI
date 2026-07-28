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

## Qué se revisó y corrigió (auditoría)

7 hallazgos corregidos y verificados con pruebas de ataque: secreto de sesión
con valor por defecto, XSS almacenado vía archivos, lectura de archivos ajenos
(IDOR), fuerza bruta en el login, dependencia con contaminación de prototipos,
escalada de privilegios entre roles y ausencia de cabeceras de seguridad.
Además se actualizó Next.js 14 → 16, cerrando 22 avisos de seguridad.
