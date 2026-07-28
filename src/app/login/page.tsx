"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

const initial = { error: "" as string | undefined };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, initial);
  return (
    <main className="flex min-h-screen items-center justify-center bg-ovi-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          {/* Árbol del Grupo Chacón (archivo estático liviano) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/_arbol.png"
            alt="Grupo Inmobiliario Chacón"
            width={96}
            height={96}
            className="mx-auto mb-3 h-24 w-24 rounded-2xl bg-white object-contain p-2 shadow-lg"
          />
          <h1 className="text-2xl font-black tracking-tight">OVI</h1>
          <h2 className="text-base font-semibold text-white/90">Grupo Inmobiliario Chacón</h2>
          <p className="text-sm text-slate-300">Central de ventas de lotes</p>
        </div>
        <form action={action} className="card space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              className="field"
              autoCapitalize="none"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              autoComplete="current-password"
              required
            />
          </div>
          {state?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {state.error}
            </p>
          ) : null}
          <SubmitBtn />
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Acceso restringido · OVI v0.1
        </p>
      </div>
    </main>
  );
}
