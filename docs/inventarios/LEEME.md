# Inventarios transcritos

Listas de precios que llegaron en **PDF escaneado** (una foto del papel, sin
texto que se pueda leer automáticamente) y que se transcribieron a CSV para
poder cargarlas en OVI.

Cada archivo se verificó **contra las filas de TOTAL del propio PDF** (área y
monto por polígono) antes de darlo por bueno.

| Archivo | Proyecto | Lotes | Área | Valor | Verificado |
|---|---|---|---|---|---|
| `GIC-17_Cumbres_de_Santiago.csv` | Cumbres de Santiago | 45 | 11,339.10 m² | $2,664,287.23 | ✅ contra los 5 totales por polígono |

## Cómo cargarlo

Inventario → (proyecto) → **Importar** → seleccionar el CSV.

## Nota importante

Estas listas **no traen el estado real** de cada lote (disponible / reservado /
vendido). Todos entran como **disponibles**: hay que validar con Grupo Chacón
cuáles ya están vendidos antes de usarlo en firme.
