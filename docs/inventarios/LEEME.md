# Inventarios transcritos

Listas de precios que llegaron en **PDF escaneado** (una foto del papel, sin
texto que se pueda leer automáticamente) y que se transcribieron a CSV para
poder cargarlas en OVI.

Cada archivo se verifica **contra el propio PDF** antes de darlo por bueno: si
la lista trae filas de TOTAL, se cuadran área y monto por polígono; si no las
trae, se comprueba lote por lote que el precio sea exactamente el área en v²
por el precio unitario, y que la conversión m² ↔ v² dé el factor correcto.

| Archivo | Proyecto | Lotes | Área | Valor | Verificado |
|---|---|---|---|---|---|
| `GIC-17_Cumbres_de_Santiago.csv` | Cumbres de Santiago | 45 | 11,339.10 m² | $2,664,287.23 | ✅ contra los 5 totales por polígono |
| `GIC-18_Panamerican_City.csv` | Panamerican City | 60 | 12,812.91 m² | $2,520,747.73 | ✅ las 60 filas cuadran a $137.50/v² y con la conversión m²↔v² |

### Panamerican City

Lista de GESCOSAL, S.A. de C.V. (Ciudad El Triunfo, Usulután), escaneada con
CamScanner: 2 páginas, 8 polígonos (A–H), 60 lotes. Todos los lotes se venden
al mismo precio unitario, **$137.50 por vara²**; el precio de cada lote es esa
tarifa por su área en v².

En el documento unos polígonos encabezan la columna como «PRECIO UCOES» (A, B,
C, D, F, H) y otros como «PRECIO NORMAL» (E, G). El monto sale igual en ambos
casos, pero la etiqueta se conserva en la columna `notas` de cada lote junto
con el área en v², por si en el futuro se separan tarifas por fuerza de venta.

La numeración de lotes **tiene huecos** (p. ej. el polígono B va 4, 5, 6, 8, 11):
así viene la lista original, no es un error de transcripción.

## Cómo cargarlo

Inventario → (proyecto) → **Importar** → seleccionar el CSV.

## Nota importante

Estas listas **no traen el estado real** de cada lote (disponible / reservado /
vendido). Todos entran como **disponibles**: hay que validar con Grupo Chacón
cuáles ya están vendidos antes de usarlo en firme.
