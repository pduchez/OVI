"use client";

import { useFormState, useFormStatus } from "react-dom";

type ActionState = { error?: string } | undefined;
type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

export default function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      <Submit label={submitLabel} />
    </form>
  );
}
