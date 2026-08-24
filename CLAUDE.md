# OVI — reglas del proyecto

Plataforma central de administración de ventas de lotes del **Grupo Inmobiliario
Chacón**. Estas son las reglas que rigen el proyecto. No son sugerencias: cuando
una decisión técnica choque con una de ellas, manda la regla.

## Independencia

OVI es un proyecto **separado** de `destinopropiedades` y de `finca el salto`.
Nunca se mezclan ni se relacionan. Se puede mirar cómo se construyeron aquellos
para aprender, **nunca modificarlos ni traer código de ellos**. OVI tiene su
propia base de datos y sus propias credenciales.

## Inventario: manda quien está en el campo

**El archivo que sube la usuaria REEMPLAZA el inventario del proyecto. No se
suma a él.**

Los proyectos vienen con lotes precargados que casi nunca coinciden con la
realidad del terreno. Cuando la asesora sube su archivo, ese archivo es la
verdad: los lotes que estaban cargados y **no** vienen en él se retiran. Si se
conservaran, quedarían mezclados y OVI ofrecería lotes que no existen.

Una sola excepción, y no se negocia:

> **Un lote con historial no se borra jamás.** Si está reservado, vendido,
> bloqueado, o tiene un negocio colgando, se conserva aunque no venga en el
> archivo. Borrarlo destruiría el registro de una venta y el respaldo de un
> dinero recibido.

Esos sobrantes conservados se cuentan, se registran en la bitácora con su número
de lote y se le avisan en pantalla a quien importó, para que Gerencia los revise
a mano.

Implementado en `importarInventario` (`src/app/(app)/inventario/actions.ts`).

## Tiempo real, nunca datos viejos

OVI vale por ser en tiempo real. **El Service Worker no cachea información**:
solo el «casco» de la aplicación. Un lote que apareciera disponible sin serlo
causaría una doble venta, que es peor que no tener aplicación. Cuando no hay
señal se avisa con claridad en vez de mostrar algo desactualizado.

Además, **la pantalla abierta se pone al día sola cada minuto**
(`src/components/AlDia.tsx`, montado en el layout de `(app)`). Sin eso, dos
personas con OVI abierta a la vez pueden ver inventarios distintos: una aparta
un lote y la otra lo sigue ofreciendo. Se actualiza solo con la pantalla a la
vista, se pone al día de inmediato al volver de segundo plano o al recuperar la
señal, y no interrumpe a quien está escribiendo en un campo.

## Toda página se renderiza por petición

`export const dynamic = "force-dynamic"` vive en el layout raíz y **no se quita**.
La CSP de `src/middleware.ts` usa un nonce distinto en cada petición; una página
pregenerada llevaría el nonce de otro momento y el navegador bloquearía todos sus
scripts, dejándola sin JavaScript.

## Operaciones de una sola vez

El arranque (`ensureBootstrap`) corre en **cada despliegue**. Una acción puntual
—restablecer la contraseña de alguien— nunca va suelta ahí: se repetiría siempre
y le borraría a la persona la contraseña que acababa de escoger. Va con
`restablecerClaveInicial(usuario, marca)`, que la anota en `OperacionUnica`. Para
repetirla se agrega una línea con **marca nueva**; no se edita la anterior.

## Pilotos

`PILOTOS` en `src/lib/bootstrap.ts` es la lista de proyectos que entran antes que
el resto. Su gente arranca con `modoPiloto`: carga su propio inventario y bloquea
y desbloquea lotes sin adjuntar boleta, para que la implementación no se trabe.
Sumar un proyecto es agregar una entrada a esa lista. El cupo genérico del
proyecto se retira cuando ya hay una persona con nombre propio.

## Seguridad

- Contraseñas con **scrypt N=65536**, formato `scrypt$<N>$<sal>$<hash>`.
- `sessionEpoch` sube al cambiar o restablecer una contraseña: invalida al
  instante toda sesión abierta.
- El límite de intentos vive **en la base** (`LoginAttempt`), no en memoria: en
  serverless cada petición puede caer en otro proceso.
- Las tablas de Supabase van con RLS (`scripts/harden-db.mjs`, dentro de
  `vercel-build`). El esquema `public` queda cerrado a `anon`.
- Toda página bajo `/admin` y `/usuarios` exige **autorización**, no solo sesión.

## Guías

Fuente en `docs/guias/*.html`, PDF con `npm run guias`. `_base.css` para las
guías sin adorno; `_marca.css` para las de marca. Playwright **no** es
dependencia de OVI: se instala solo para generar los PDF, y `OVI_CHROMIUM`
permite apuntar a un Chromium ya presente en la máquina.

## Producción

<https://ovi-eta.vercel.app/> — despliega desde `main`.
