import { logoProyecto } from "@/lib/brand";

/**
 * Logo del proyecto. Si el proyecto aún no tiene logo, muestra un recuadro
 * con su código para que la interfaz no quede vacía ni descuadrada.
 */
export default function LogoProyecto({
  codigo,
  nombre,
  size = 56,
  className = "",
}: {
  codigo: string;
  nombre?: string;
  size?: number;
  className?: string;
}) {
  const src = logoProyecto(codigo);
  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-ovi-soft text-xs font-bold text-ovi-primary ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {codigo?.slice(-2) || "··"}
      </div>
    );
  }
  return (
    // Archivo estático liviano (~8 KB): <img> normal, sin optimizador.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={nombre ? `Logo de ${nombre}` : `Logo ${codigo}`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200 ${className}`}
      style={{ width: size, height: size, padding: 4 }}
    />
  );
}
