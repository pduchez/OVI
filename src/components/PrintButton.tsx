"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-ghost no-print">
      🖨️ Imprimir / PDF
    </button>
  );
}
