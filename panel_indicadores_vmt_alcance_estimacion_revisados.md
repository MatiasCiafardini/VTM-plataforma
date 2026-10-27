# Panel de indicadores VMT — alcance y estimación revisados

Fecha de revisión: 10 de septiembre de 2026

## 1. Conclusión ejecutiva

El trabajo solicitado es un módulo de indicadores para el administrador existente de VMT. No incluye CRM, gestión individual de prospectos ni automatizaciones comerciales.

La plataforma real ya resuelve una parte importante de la infraestructura: frontend Next.js, backend NestJS, PostgreSQL con Prisma, autenticación JWT, roles, configuración administrativa, componentes visuales y despliegue mediante Docker en un VPS. No corresponde reemplazar ese stack ni agregar Supabase o Vercel.

El prototipo `panel_vmt_v3.jsx` puede utilizarse como referencia funcional y visual para los indicadores, pero no como implementación directa. Mezcla interfaz, cálculos, almacenamiento e importaciones en un único componente y utiliza mecanismos que no pertenecen a la plataforma real.

Para cumplir el brief completo, la estimación probable es de **160 a 195 horas humanas con asistencia de Codex**, equivalentes a unas **6 a 7 semanas de trabajo** para una persona con una disponibilidad productiva de 28 a 32 horas semanales. Los tiempos de espera por accesos y validaciones del cliente se estiman aparte en **1 a 2 semanas calendario**.

Cobrar **ARS 800.000** implica una tarifa de entre **ARS 4.103 y ARS 5.000 por hora** en el escenario probable. El monto es ajustado para asumir todo el brief como precio fijo. Puede sostenerse con menor riesgo si la inspección inicial confirma fuentes estables, accesos inmediatos, datos completos en Notion, ausencia de reconstrucción histórica y una sola vía de ingreso para contabilidad y ventas.

## 2. Alcance

### Incluido

- Incorporación del módulo dentro del administrador actual.
- Contabilidad y ventas desde Google Sheets o, como alternativa, importación manual CSV.
- CASH sumado sin filtrar por Resultado.
- Cierres y distribución de estados de ventas.
- KPIs financieros, comerciales y operativos del brief.
- Integración con Notion para alumnos, estado, fecha de inicio, actividad y equipo.
- Sentimiento actual de alumnos.
- Casos de éxito en ventana móvil de 12 meses.
- Histórico anual de casos de éxito cuando existan datos suficientes.
- Capacidad y ocupación real por equipo.
- Reglas configurables de clasificación de gastos.
- Constantes de negocio editables y versionadas.
- Snapshots mensuales, cierre, reapertura y comparación de períodos.
- Validación de datos, estado de sincronización y errores visibles.
- Pruebas, revisión del código, validación con datos reales y despliegue.

### Excluido

- CRM o gestión individual de prospectos.
- Kanban, responsables comerciales, tareas o recordatorios.
- Automatizaciones de WhatsApp, email o Instagram.
- Configuración de pipeline y metas comerciales no solicitadas.
- Portal de alumnos.
- Facturación o contabilidad formal.
- Aplicación móvil.
- Funciones generativas de IA.

Mostrar conteos y estados provenientes de la planilla de ventas no requiere almacenar ni gestionar fichas comerciales.

## 3. Plataforma real verificada

### Stack y despliegue

- Frontend: Next.js 16.2.1, React 19.2.4 y TypeScript. Evidencia: `tattoo-platform-frontend/package.json`.
- Backend: NestJS 11, TypeScript, Prisma 7 y PostgreSQL. Evidencia: `tattoo-platform-backend/package.json`.
- Producción: frontend, backend, PostgreSQL y Nginx en Docker Compose sobre VPS. Evidencia: `docker-compose.prod.yml:1-56` y `DEPLOY.md:1-51`.
- El dominio respondió HTTP 200 sobre HTTPS el 10 de septiembre de 2026 y declaró Next.js como tecnología de respuesta. Esto confirma disponibilidad pública, pero no permite verificar funciones autenticadas ni que la base productiva coincida con el repositorio local.
- El repositorio incluye despliegue, migraciones Prisma, backup diario sugerido y renovación SSL. Evidencia: `DEPLOY.md:289-327`.

### Autenticación y permisos

- Ya existen autenticación JWT y roles ADMIN, MENTOR y STUDENT. Evidencia: `tattoo-platform-backend/prisma/schema.prisma:9-13`, `tattoo-platform-backend/src/modules/auth/auth.controller.ts:20-64` y `tattoo-platform-backend/src/common/guards/roles.guard.ts:12-41`.
- La página administrativa exige rol ADMIN antes de consultar datos. Evidencia: `tattoo-platform-frontend/src/app/admin/page.tsx:338`.
- El módulo de indicadores puede limitarse a ADMIN sin crear un sistema nuevo de usuarios o permisos.

### Administrador y componentes reutilizables

- La navegación administrativa ya incluye Dashboard, Alumnos, Logros, Onboarding y Config. Evidencia: `tattoo-platform-frontend/src/components/app-shell.tsx:68-90`.
- El administrador usa cards de métricas, listados, estados de error, navegación responsive y carga server-side. Evidencia: `tattoo-platform-frontend/src/app/admin/page.tsx:524-601`.
- Existen estilos de tarjetas, gráficos propios, barras, tooltips y variantes responsive en `tattoo-platform-frontend/src/app/globals.css`, especialmente desde las líneas 2185 a 2416 y 4363 a 4384.
- Puede agregarse una pestaña `Indicadores` al `AppShell` y una sección específica al `AdminPage`, conservando la identidad visual existente.

### Base de datos, períodos y configuración

- PostgreSQL y Prisma ya están disponibles; no hace falta incorporar otra base.
- Existe `AdminSetting` como JSON persistido y una interfaz administrativa para editar configuración. Evidencia: `tattoo-platform-backend/prisma/schema.prisma:186-191`, `tattoo-platform-backend/src/modules/admin-settings/admin-settings.service.ts:39-122` y `tattoo-platform-frontend/src/components/admin-operations-panel.tsx:177-219`.
- Existen períodos mensuales con estados DRAFT y CLOSED, autor de creación y actualización, más endpoints para cerrar y reabrir. Evidencia: `tattoo-platform-backend/prisma/schema.prisma:288-310` y `tattoo-platform-backend/src/modules/metrics/metric-periods/metric-periods.service.ts:130-207`.
- Esos períodos son métricas mensuales por alumno. No deben reutilizarse como snapshots globales del negocio, aunque sí puede reutilizarse el patrón de estados, permisos y endpoints.
- Existe el modelo `AuditLog`, pero no se encontró ningún uso de `prisma.auditLog` y `AuditModule` está vacío. Evidencia: `tattoo-platform-backend/prisma/schema.prisma:661-674` y `tattoo-platform-backend/src/modules/audit/audit.module.ts:1-4`.

### Integraciones y procesos programados

- `IntegrationsModule` existe, pero está vacío. Evidencia: `tattoo-platform-backend/src/modules/integrations/integrations.module.ts:1-4`.
- No se encontraron clientes de Google Sheets, Notion, CSV/XLSX ni un scheduler general en las dependencias del backend.
- Existen automatizaciones internas y scripts de recálculo, pero no una infraestructura de sincronización reutilizable para fuentes externas.
- El VPS ya es suficiente como destino lógico. Falta confirmar su capacidad disponible, variables de entorno productivas y procedimiento de despliegue efectivo.

## 4. Prototipo y planillas

### Qué puede reutilizarse del prototipo

- Organización funcional en Resumen, Costos, Ventas, Capacidad, Evolución e Historial.
- Fórmulas base de balance, ocupación, CAC, costo por alumno, margen y tasa de cierre.
- Sparklines, cards y códigos de color como referencia visual.
- Selección explícita del período.
- Intención de sumar todo CASH sin filtrar por estado.

### Qué debe reemplazarse

- Las constantes están hardcodeadas en `panel_vmt_v3.jsx:4-10`.
- Abril y sus resultados están hardcodeados en `panel_vmt_v3.jsx:12-37`.
- El historial usa `window.storage` en `panel_vmt_v3.jsx:165-235`, fuera de la arquitectura real.
- El análisis de gastos llama a Anthropic directamente desde frontend en `panel_vmt_v3.jsx:127-138` y `panel_vmt_v3.jsx:266-317`.
- Un XLSX seleccionado se trata como texto y no como libro binario.
- Ventas usa `split(',')` en `panel_vmt_v3.jsx:330-379`; no es un parser CSV seguro.
- Expresiones con `|| prev` impiden registrar ceros legítimos en `panel_vmt_v3.jsx:371-373`.
- Denominadores iguales a cero se reemplazan por uno en `panel_vmt_v3.jsx:393-394` y `panel_vmt_v3.jsx:423-425`.
- No hay integración con Notion ni visualizaciones de sentimiento y casos de éxito.

### Datos verificados

La planilla de prospectos disponible contiene hojas de enero a septiembre de 2026. En abril se verificaron 62 prospectos, 8 filas actualmente marcadas CERRADO y USD 8.800 en CASH. El brief y el objeto base del prototipo registran 7 cierres. Esto no prueba por sí solo un error: puede ser una versión posterior de la planilla. Antes de fijar el valor correcto se deben registrar fecha de corte, versión y criterio aplicado.

La planilla de contabilidad contiene datos utilizables de enero a agosto, septiembre parcial, octubre ausente y noviembre/diciembre vacíos. En abril, ingresos, egresos y balance coinciden con el brief. Las categorías manuales son incompletas e inconsistentes, por lo que no pueden utilizarse directamente como clasificación definitiva.

### Histórico realmente disponible

- Ventas: se pueden reconstruir agregados mensuales de enero a septiembre de 2026, sujeto a validar versiones y filas incompletas.
- Contabilidad: se pueden reconstruir enero a agosto de 2026; septiembre está incompleto y requiere confirmación.
- Snapshots globales: el brief exige guardarlos desde la puesta en marcha, pero no exige expresamente reconstruir todos los meses anteriores.
- Sentimiento mensual histórico: no puede reconstruirse con los archivos entregados. Requeriría historial de cambios de Estado en Notion o snapshots anteriores.
- Casos de éxito por año: puede calcularse si Notion contiene Fecha de inicio y Estado para todos los alumnos históricos. Ese contenido no fue proporcionado.
- Ocupación histórica por equipo: requiere Equipo asignado y una forma de conocer actividad/pausa en cada corte histórico; el estado actual no reconstruye automáticamente el pasado.

La carga histórica debe cotizarse y validarse por separado de la persistencia de nuevos meses.

## 5. Reglas y ambigüedades

### Reglas confirmadas por el brief

- CASH suma todos los valores numéricos sin filtrar por Resultado.
- Cierres cuentan filas cuyo Resultado es CERRADO.
- Gastos extraordinarios se excluyen de costo recurrente y CAC, pero continúan dentro de egresos totales y balance.
- Pausa se muestra en sentimiento y se excluye de alumnos activos para ocupación y costo por alumno.
- Ocupación por equipo debe usar asignación real.
- El período mensual es explícito y las fechas deben tratarse con zona horaria de Argentina.
- Casos de éxito actuales usan una ventana móvil de 12 meses.
- La tabla histórica anual usa años calendario.

### Decisiones que faltan

1. **Activo y Pausa:** para sentimiento, la consulta propuesta en el brief filtra Activo=true, pero también pide incluir Pausa. Se necesita definir si un alumno pausado conserva Activo=true o si sentimiento usa una condición distinta, por ejemplo activo administrativo o fecha de fin vigente.
2. **Clasificación múltiple:** se propone prioridad explícita por regla, una sola categoría efectiva y estado `SIN_CLASIFICAR` cuando ninguna coincide. Un administrador debe confirmar o corregir antes de cerrar el mes.
3. **Versionado:** constantes y reglas deben tener vigencia desde un período. Editar el valor actual no debe modificar snapshots cerrados.
4. **Cierre:** se propone DRAFT, CLOSED y REOPENED, con registro de usuario, fecha y motivo. Un mes cerrado no se recalcula automáticamente.
5. **Reapertura:** se debe confirmar quién puede reabrir y si el recálculo reemplaza el snapshot o genera una nueva versión.
6. **Prospectos con Resultado vacío:** se propone contarlos como prospectos si tienen nombre o fecha y mostrarlos como `SIN_ESTADO`.
7. **Sueldo de Juan:** el brief lo clasifica como CAC. Debe confirmarse si esto se mantiene para todos los períodos.
8. **Período contable:** se debe confirmar si prevalece la hoja/período declarado sobre la fecha del movimiento cuando difieren.
9. **Abril:** se debe identificar el corte utilizado por el brief y la fecha de la modificación que llevó de 7 a 8 cierres.

### Frecuencia propuesta

La propuesta técnica es:

- Google Sheets: sincronización automática cada 4 horas y botón `Actualizar ahora`.
- Notion: webhook para cambios de propiedades y sincronización completa nocturna como reconciliación.
- Dashboard: muestra última actualización y no presenta datos vencidos como actuales.
- Snapshot: cierre mensual manual por un ADMIN después de validar advertencias.

Esto es una propuesta, no una frecuencia aprobada por el cliente. Notion documenta que sus webhooks suelen entregarse dentro de un minuto y, como máximo esperado, dentro de cinco minutos. Por eso “inmediato” debe interpretarse como actualización casi en tiempo real, no instantánea. Referencia: https://developers.notion.com/reference/webhooks-events-delivery

## 6. Google Sheets frente a CSV

| Opción | Ventajas | Desventajas | Cumplimiento del objetivo |
| --- | --- | --- | --- |
| Google Sheets API | Sin carga mensual, lectura controlada, fuente única y actualización programada | Requiere credenciales, compartir archivos, mapeo y manejo de cuotas/errores | Cumple mejor la actualización automática del brief |
| CSV manual | Menor complejidad, fácil de auditar y sin credenciales de Google | Requiere intervención cada mes y permite archivos equivocados o desactualizados | Cumple la alternativa simple, pero no la automatización completa |
| XLSX manual | Conserva hojas y formatos | Mayor complejidad de lectura y no está exigido como tercera vía | No debe incluirse salvo pedido explícito |

No hace falta implementar las tres opciones. La estimación probable incluye **Google Sheets como vía única para contabilidad y ventas**. CSV puede reemplazarla en un alcance reducido. Agregar CSV como fallback adicional suma aproximadamente 8 a 14 horas. XLSX queda fuera.

Para Google Sheets se recomienda acceso de sólo lectura y credenciales guardadas en variables del backend. El uso estándar de la API no tiene costo adicional dentro de las cuotas publicadas; Google informa 300 lecturas por minuto por proyecto y recomienda backoff ante 429. Referencia: https://developers.google.com/workspace/sheets/api/limits

## 7. Arquitectura mínima sobre VMT

### Frontend

- Nueva pestaña `Indicadores` dentro del administrador existente.
- Panel responsive alineado con cards, tipografía, colores y navegación actuales.
- Selector de período, estado de actualización y advertencias.
- Vistas: Resumen, Costos, Ventas, Alumnos, Capacidad e Histórico.
- Pantalla de configuración integrada en Config, no un administrador separado.

### Backend

- Completar `IntegrationsModule` con conectores server-side para Google Sheets y Notion.
- Nuevo `BusinessIndicatorsModule` para cálculo, snapshots, consultas y cierre de período.
- Endpoints ADMIN protegidos con JWT y `RolesGuard` existentes.
- Jobs programados y endpoint seguro para webhooks de Notion.
- Reintentos limitados, paginación, idempotencia y registro de ejecuciones.

### Datos

Modelos mínimos recomendados:

- `BusinessIndicatorPeriod`: período, estado, versión de cálculo y fechas de cierre/reapertura.
- `BusinessIndicatorSnapshot`: valores calculados y distribuciones del período.
- `FinanceSourceRow`: referencia de fila, detalle, importe, categoría y regla aplicada.
- `CostCategoryRule`: palabras clave, categoría, prioridad y vigencia.
- `BusinessConstantVersion`: valor, unidad, vigencia y usuario que modificó.
- `ExternalStudentIndicator`: ID de Notion, inicio, estado, activo y equipo, limitado a los campos del brief.
- `IntegrationRun`: fuente, período, estado, conteos, errores, hash y timestamps.

No se necesita una tabla de prospectos ni entidades de CRM. Para ventas alcanza con agregados mensuales, conteos por estado, CASH y evidencia de la corrida de origen.

### Cálculo y seguridad

- Clasificación determinística en backend por reglas ordenadas; sin IA.
- Tokens de Notion y Google sólo en variables de entorno del backend.
- Fórmulas puras y testeables, con `null` o `no disponible` cuando falta un denominador.
- Snapshot cerrado conserva valores, reglas y constantes aplicadas.
- Reutilizar el modelo `AuditLog`, implementando escrituras para sincronizar, configurar, cerrar, reabrir y recalcular.

## 8. Tabla de tareas y horas

Las horas son dedicación humana asistida por Codex. Incluyen revisión del código generado; no suponen aceptación automática de propuestas de IA.

| Requisito | Estado actual y evidencia | Reutilización | Trabajo necesario | Dependencias y supuestos | Horas |
| --- | --- | --- | --- | --- | ---: |
| Cierre funcional | Brief y archivos disponibles; faltan accesos reales | Brief, planillas y prototipo | Resolver reglas, diccionario de datos y aceptación | Respuesta rápida del cliente | 6–10 |
| Integración visual | Admin y componentes responsive existentes | AppShell, cards, CSS, patrones de carga | Agregar navegación, estructura del módulo y estados | Una ronda principal de diseño | 8–12 |
| Modelo de datos | PostgreSQL/Prisma operativos; no hay modelos globales del panel | Prisma, migraciones y patrones de períodos | Nuevos modelos, relaciones, índices y migración | Esquema productivo igual al repo | 10–16 |
| Google Sheets | Sin cliente ni credenciales | IntegrationsModule como ubicación | Conexión read-only, mapeo de hojas, paginación/batches y errores | Dos documentos estables y compartidos | 12–20 |
| Notion | No implementado | Backend, secretos y VPS | Cliente, queries, paginación, webhook, reconciliación y mapeo | Una base con campos completos | 14–22 |
| Reglas y constantes | AdminSetting y UI de Config existentes | Servicio y formulario de configuración | Reglas ordenadas, categorías, prioridades, vigencias y constantes | Definiciones aprobadas | 14–20 |
| Motor de KPIs | Fórmulas sólo en prototipo | Definiciones del brief | Servicios puros, redondeo, nulos, zonas horarias y pruebas de borde | Fórmulas confirmadas | 12–18 |
| Snapshots mensuales | Patrón DRAFT/CLOSED por alumno | Estados, permisos y endpoints como patrón | Período global, cierre, reapertura, versiones y recálculo | Política de corrección aprobada | 10–16 |
| Dashboard completo | Prototipo visual y componentes existentes | Cards, barras, gráficos y responsive | Seis vistas, donuts, evolución, tabla anual y ayudas | Sin rediseño general del admin | 18–28 |
| Validación y errores | Validación global de DTO; no hay sync status | ValidationPipe y patrones de error | Conciliación, no clasificados, datos faltantes y freshness | Fuentes con identificadores estables | 8–14 |
| Auditoría | Modelo presente, módulo vacío | `AuditLog` | Servicio y eventos mínimos del panel | No se pide visor avanzado de auditoría | 4–8 |
| Pruebas | Cuatro suites localizadas; nada para integraciones | Jest y prueba e2e existentes | Unitarias, integración con fixtures y flujos críticos | Entorno de test disponible | 16–24 |
| Datos reales iniciales | Excel disponibles, Notion no | Archivos como fixtures | Validación, conciliación y carga del período inicial | No incluye limpieza histórica extensa | 8–14 |
| Despliegue y entrega | Docker/VPS documentados | Pipeline y scripts actuales | Variables, migración, smoke test, documentación y estabilización | Acceso al VPS y backup verificado | 8–12 |
| **Rango total técnico** |  |  |  |  | **148–234** |

El rango técnico no incluye una reconstrucción histórica amplia. Si se solicita reconstruir históricos, deben agregarse las horas luego de auditar Notion y acordar períodos.

## 9. Escenarios de estimación

### Escenario favorable

**115 a 140 horas.**

Condiciones:

- Se elige CSV en lugar de Google Sheets, o la integración con Sheets resulta trivial y estable.
- Notion ya contiene todos los campos y valores del brief.
- No se reconstruyen meses anteriores.
- Se reutiliza el diseño actual sin iteraciones relevantes.
- Accesos y decisiones llegan al inicio.
- No aparecen diferencias entre producción y repositorio.

Plazo de trabajo: 4 a 5 semanas. Esperas externas: 2 a 5 días hábiles.

### Escenario probable

**160 a 195 horas.**

Condiciones:

- Google Sheets automático para las dos fuentes.
- Notion con webhook y reconciliación programada.
- Clasificación configurable con revisión de no clasificados.
- Snapshots, reapertura, versionado y todas las visualizaciones del brief.
- Pruebas con datos reales y correcciones normales de integración.

Plazo de trabajo: 6 a 7 semanas. Esperas externas: 1 a 2 semanas calendario, no incluidas en horas.

### Escenario con complicaciones

**220 a 280 horas.**

Motivos posibles:

- Google o Notion requieren OAuth, verificación adicional o cambios de permisos.
- Las hojas cambian de estructura entre meses.
- Notion no tiene fechas, estados o equipos completos.
- Se solicita reconstrucción histórica o reparación de datos.
- Producción difiere del repositorio o no tiene capacidad suficiente.
- Se agregan varias rondas de diseño, permisos nuevos o mecanismos adicionales de importación.

Plazo de trabajo: 8 a 10 semanas. Esperas externas: 2 a 4 semanas calendario.

## 10. Evaluación de ARS 800.000

| Escenario | Horas humanas | Tarifa implícita con ARS 800.000 |
| --- | ---: | ---: |
| Favorable | 115–140 | ARS 6.957–5.714 por hora |
| Probable | 160–195 | ARS 5.000–4.103 por hora |
| Con complicaciones | 220–280 | ARS 3.636–2.857 por hora |

Estas cifras son ingresos brutos por hora de trabajo. No descuentan impuestos, administración, soporte posterior ni riesgo de precio fijo. No se comparan con tarifas de mercado ni se convierten a otra moneda.

### Evaluación

ARS 800.000 puede ser sostenible si el resultado real queda cerca del escenario favorable y esa tarifa implícita cubre los costos y el margen esperado del desarrollador. Para el escenario probable, el precio es ajustado. No es recomendable comprometerlo como precio fijo del brief completo antes de comprobar accesos, datos y reglas.

Supuestos mínimos para sostener ARS 800.000:

- Precio neto para el desarrollador o tratamiento fiscal conocido.
- Alcance cerrado luego de una validación inicial.
- Una sola vía para contabilidad y ventas: Google Sheets o CSV, no ambas.
- XLSX fuera.
- Accesos a Google, Notion y VPS entregados al inicio.
- Estructura estable y documentada en las hojas.
- Campos completos y homogéneos en Notion.
- Sin reconstrucción histórica previa a la puesta en marcha.
- Sin reparación manual masiva de datos.
- Módulo visible sólo para ADMIN.
- Una ronda principal de ajustes visuales.
- Soporte posterior limitado y cotizado aparte.

### Primera etapa acotada posible por ARS 800.000

Si esos supuestos no pueden garantizarse, se recomienda vender ARS 800.000 como una primera etapa explícita de 95 a 125 horas:

- Integración visual dentro del administrador.
- CSV manual como única vía para contabilidad y ventas.
- Clasificación determinística y configuración mínima de reglas y constantes.
- KPIs del período actual.
- Sincronización manual de Notion para sentimiento y capacidad.
- Snapshot desde la puesta en marcha.
- Comparación básica cuando existan al menos dos snapshots.
- Pruebas esenciales y despliegue.

Requisitos originales pendientes en esa etapa:

- Integración automática con Google Sheets.
- Webhook y actualización casi inmediata desde Notion.
- Reconciliación programada y monitoreo avanzado de sincronizaciones.
- Reconstrucción de períodos anteriores.
- Histórico anual completo si Notion no contiene los datos necesarios.
- Política avanzada de versiones y recálculo de snapshots reabiertos.
- CSV adicional como fallback si luego se adopta Google Sheets.

Esta primera etapa no debe presentarse como cumplimiento completo del brief.

## 11. Costos operativos

La arquitectura recomendada utiliza el VPS, PostgreSQL, dominio, Google Workspace y Notion que VMT ya opera o debe confirmar que opera. No se propone contratar otra base de datos ni otro hosting.

Costos adicionales posibles:

- Consumo adicional del VPS si los recursos actuales no alcanzan.
- Cuenta o proyecto de Google Cloud si VMT no dispone de uno.
- Plan de Notion o permisos necesarios para la integración, si el actual no los cubre.
- Monitoreo externo, almacenamiento adicional de backups o correo de alertas, sólo si se decide incorporarlos.

El uso estándar de Google Sheets API está publicado sin costo adicional dentro de las cuotas actuales. Los demás costos no pueden calcularse sin conocer contratos y capacidad de los servicios que VMT ya paga.

## 12. Hallazgos que pueden modificar materialmente la estimación

- Ausencia o desactualización del repositorio que corresponde a producción.
- Esquema real y volumen de la base productiva.
- Capacidad y backups comprobados del VPS.
- Tipo de autenticación requerido por Google y propiedad de las hojas.
- Estructura real de la base Notion y disponibilidad de webhooks.
- Porcentaje de alumnos sin Fecha de inicio, Estado, Activo o Equipo.
- Variaciones de columnas y formatos entre hojas mensuales.
- Requerimiento de backfill de 2026 o años anteriores.
- Necesidad de mostrar auditoría en UI en lugar de sólo registrarla.
- Cantidad de revisiones visuales y usuarios que deben validar.

## 13. Dudas para el cliente

1. ¿Se elige Google Sheets automático o CSV manual para contabilidad y ventas?
2. Si se elige Google Sheets, ¿ambos documentos pertenecen a una cuenta que puede compartirlos con una credencial de sólo lectura?
3. ¿Cuál es la base exacta de Notion y qué porcentaje de registros tiene completos Fecha de inicio, Estado, Activo y Equipo asignado?
4. ¿Un alumno en Pausa conserva Activo=true? Si no, ¿qué condición define su inclusión en sentimiento?
5. ¿Qué versión y fecha de corte sustentan los 7 cierres de abril?
6. ¿Los prospectos con Resultado vacío cuentan en el denominador de tasa de cierre?
7. ¿La hoja mensual define el período contable aunque la fecha del movimiento sea del mes anterior?
8. ¿Quién puede cerrar, reabrir y recalcular un mes?
9. ¿Al reabrir se reemplaza el snapshot o se conserva cada versión?
10. ¿Se deben reconstruir enero-agosto de 2026 o los snapshots comienzan con la implementación?
11. ¿Existe historial de cambios en Notion que permita reconstruir sentimiento y ocupación anteriores?
12. ¿La actualización “inmediata” de Notion acepta una demora esperada de uno a cinco minutos?
13. ¿ARS 800.000 es precio neto o incluye impuestos y soporte posterior?

## 14. Criterios de aceptación

- El módulo se abre desde el administrador y respeta autenticación, navegación y diseño responsive existentes.
- Un usuario no ADMIN no puede acceder a endpoints ni datos del módulo.
- Cada pantalla muestra período y hora de última actualización.
- CASH coincide con la suma de todos los valores numéricos de la columna, sin filtrar Resultado.
- Los cierres coinciden con filas CERRADO y los estados suman el universo acordado, incluyendo `SIN_ESTADO` cuando corresponda.
- Gastos extraordinarios permanecen en egresos y balance, pero no ingresan en costo recurrente ni CAC.
- Cada gasto muestra categoría y regla aplicada; los no clasificados bloquean el cierre o requieren confirmación explícita.
- Cambiar una regla o constante no altera períodos cerrados.
- Ceros se conservan como cero; datos faltantes y división por cero se muestran como no disponibles.
- Pausa aparece en sentimiento y se excluye de métricas operativas según la regla acordada.
- La ocupación por equipo usa Equipo asignado real.
- Casos de éxito usa desde hoy menos 12 meses hasta hoy y no año calendario.
- El histórico anual usa Fecha de inicio y año calendario.
- Un proceso repetido no duplica filas ni snapshots.
- Un mes cerrado sólo cambia después de reapertura autorizada y deja evidencia de usuario, fecha y motivo.
- Fallas de Google o Notion conservan el último dato válido, lo marcan como desactualizado y no generan un snapshot silencioso.
- Las fórmulas principales cuentan con pruebas unitarias y se validan contra meses reales acordados.
- Migración, despliegue y rollback se prueban sobre backup.

## 15. Qué falta comprobar antes de comprometer ARS 800.000

Antes de ofrecer ARS 800.000 como precio fijo por el panel completo falta comprobar:

1. Que el repositorio local coincide con producción y que las migraciones pendientes están controladas.
2. Acceso al VPS, estado de backups y capacidad disponible.
3. Acceso read-only a las dos fuentes de Google Sheets o decisión formal de usar CSV en su lugar.
4. Acceso y esquema real de Notion, cobertura de campos y viabilidad del histórico.
5. Regla definitiva de Activo/Pausa, prospectos sin estado, prioridades de costos y períodos contables.
6. Política de cierre, reapertura, recálculo y versionado.
7. Si habrá backfill y cuántos períodos abarca.
8. Qué entregables y soporte quedan incluidos en el monto.

Sin esas comprobaciones, ARS 800.000 sólo puede defenderse como presupuesto condicionado o como primera etapa acotada. No es todavía un precio fijo seguro para todo el brief.
