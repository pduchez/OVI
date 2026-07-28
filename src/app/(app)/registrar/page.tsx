import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const OPCIONES = [
  {
    href: "/registrar/visita",
    icon: "👀",
    titulo: "Visita",
    desc: "Un prospecto llegó al proyecto",
    color: "bg-sky-50 text-sky-700",
  },
  {
    href: "/registrar/negocio",
    icon: "🤝",
    titulo: "Reserva / Venta",
    desc: "Se apartó o se vendió un lote",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/registrar/abono",
    icon: "💵",
    titulo: "Abono / Pago",
    desc: "El cliente hizo un pago",
    color: "bg-blue-50 text-blue-700",
  },
  {
    href: "/registrar/novedad",
    icon: "📌",
    titulo: "Novedad / Problema",
    desc: "Algo que reportar del proyecto",
    color: "bg-amber-50 text-amber-700",
  },
];

const OK: Record<string, string> = {
  visita: "Visita registrada correctamente.",
};

export default function RegistrarHub({
  searchParams,
}: {
  searchParams: { ok?: string };
}) {
  return (
    <div>
      <PageHeader title="Registrar" subtitle="¿Qué quieres anotar?" />
      {searchParams.ok && OK[searchParams.ok] ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ {OK[searchParams.ok]}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {OPCIONES.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="card flex items-center gap-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl ${o.color}`}
            >
              {o.icon}
            </span>
            <span>
              <span className="block text-lg font-bold text-ovi-ink">{o.titulo}</span>
              <span className="block text-sm text-slate-500">{o.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
