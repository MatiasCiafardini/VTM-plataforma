# Auditoría del panel administrativo y evolución a CRM de VMT

Fecha de análisis: 10 de septiembre de 2026

## Resumen ejecutivo

El panel actual sirve como prototipo visual de indicadores mensuales, pero no puede considerarse todavía un panel administrativo de producción ni un CRM. Su estructura está centrada en cargar archivos, calcular métricas agregadas y guardar snapshots mensuales. No administra prospectos individuales, tareas, responsables, historial de contactos ni permisos de usuarios.

La recomendación es conservar el lenguaje visual y la lógica válida de KPIs, pero reconstruir la solución sobre una base de datos central y un backend seguro. El CRM debe ser el núcleo operativo. Finanzas, alumnos, capacidad e indicadores deben leer datos del mismo modelo y no depender de información hardcodeada, archivos interpretados por IA ni almacenamiento propio del navegador.

La propuesta recomendada es una versión CRM v1 de 10 a 12 semanas, por un precio fijo estimado de USD 14.900 más impuestos y servicios de terceros. Antes de comprometer el precio definitivo debe realizarse una fase corta de definición y acceso al repositorio real, porque el material entregado contiene un único componente JSX y no permite verificar un backend, infraestructura o aplicación productiva existente.

## Material revisado

- Brief funcional del cliente con fuentes, KPIs, reglas de negocio, integración con Notion y snapshots mensuales.
- Gestión de prospectos 2026, con hojas de enero a septiembre, datos individuales, CASH y estados comerciales.
- Ingresos y gastos 2026, con gastos, ingresos, balances mensuales y categorías de calidad variable.
- Prototipo panel_vmt_v3.jsx, con resumen, costos, ventas, capacidad, evolución e historial.

## Hallazgos de los archivos

### Gestión de prospectos

La planilla ya contiene la materia prima para un CRM: nombre, teléfono, Instagram, fecha, notas, CASH y resultado. Sin embargo, funciona como una sucesión de hojas mensuales. Esto duplica estructura, dificulta encontrar una persona en el tiempo y no conserva una historia de cambios confiable.

Se verificaron los siguientes registros actuales:

| Mes | Prospectos | Cierres actuales | CASH |
| --- | ---: | ---: | ---: |
| Enero | 130 | 19 | USD 5.088 |
| Febrero | 118 | 11 | USD 10.415 |
| Marzo | 70 | 7 | USD 3.700 |
| Abril | 62 | 8 | USD 8.800 |
| Mayo | 79 | 7 | USD 6.400 |
| Junio | 84 | 11 | USD 8.694 |
| Julio | 77 | 6 | USD 2.975 |
| Agosto | 103 | 3 | USD 1.800 |
| Septiembre | 29 | 1 | USD 600 |

Problemas observados:

- El brief y el panel base indican 7 cierres en abril, mientras la planilla actual contiene 8. El sistema debe registrar la fecha de importación, el origen y la versión del cálculo.
- Enero y mayo tienen al menos un prospecto sin Resultado. Esos registros deben contar como prospectos, pero quedar señalados como incompletos.
- Los teléfonos aparecen con formatos distintos y, en meses anteriores, algunos se muestran en notación científica. Deben almacenarse como texto normalizado, no como número.
- Hay saltos de línea, notas con comas y valores monetarios localizados. Un parser que separa el CSV con split por coma puede desplazar columnas y calcular mal.
- CASH debe sumarse sin filtrar por Resultado, como especifica el brief. El sistema también debe identificar pagos parciales, anticipos y pagos sin cierre actualizado.

### Ingresos y gastos

El archivo contiene el detalle y los cierres mensuales necesarios, pero las categorías no son una fuente normalizada. Hay categorías vacías, faltas de ortografía y usos inconsistentes de servicio, app, plataforma, publicidad, impuesto, sueldo y bono.

En abril, los totales coinciden con el brief: ingresos por USD 17.969, egresos por USD 7.532,68 y balance por USD 10.436,32. Aun así, la clasificación automática requiere control porque una misma categoría escrita manualmente no identifica correctamente su efecto sobre costo de servicio, CAC o gasto extraordinario.

Problemas observados:

- Palabras como publicidadd, mastertook, skooll y distintas variantes de nombres requieren reglas normalizadas y revisión humana.
- Existen movimientos fechados al cierre del mes anterior dentro de la hoja siguiente. El período contable no puede inferirse sólo desde la fecha del movimiento.
- Gastos extraordinarios aparecen mezclados con gastos recurrentes. Deben mantener su importe en egresos totales, pero excluirse de costo fijo y CAC cuando corresponda.
- Octubre no está presente y noviembre y diciembre están vacíos. El sistema debe distinguir entre período futuro, período sin datos y período cerrado en cero.
- La hoja ejemplo contiene datos históricos ajenos al período 2026 y debe quedar excluida explícitamente.

## Auditoría del panel actual

### Fortalezas reutilizables

- Lenguaje visual coherente y compacto.
- Navegación simple por resumen, costos, ventas, capacidad, evolución e historial.
- KPIs principales alineados con el brief.
- Confirmación antes de guardar un mes.
- CASH se intenta sumar sin filtrar por estado.
- El período se elige de forma explícita.
- Los snapshots mensuales permiten iniciar una comparación histórica.

### Problemas críticos

1. No existe CRM. Sólo se guardan totales mensuales. No hay ficha de prospecto, historial, próxima acción, responsable, etiquetas, búsqueda, filtros ni pipeline operativo.
2. Las constantes del negocio y las reglas están hardcodeadas. El administrador no puede configurar capacidad, duración, precio, ventana de éxito, metas, estados ni palabras clave.
3. Los alumnos activos se cargan manualmente. No está implementada la integración con Notion ni la nueva sección de sentimiento y casos de éxito.
4. La persistencia usa window.storage y un único JSON. No hay modelo relacional, concurrencia, backups funcionales, permisos por fila ni trazabilidad de cambios.
5. La carga de gastos promete Excel, pero un archivo XLSX se trata como texto. Eso no procesa de forma confiable un libro binario.
6. El CSV de ventas se separa con split(','). Esto falla con notas entrecomilladas, comas dentro de campos y formatos monetarios locales.
7. La clasificación de gastos se delega a una llamada de IA desde el navegador. Además de ser no determinística, expone datos financieros a un tercero y no conserva evidencia por línea.
8. La llamada a Anthropic está hecha desde frontend y no tiene una arquitectura segura de secretos, permisos, límites, reintentos o auditoría.
9. Las expresiones valor || valor_anterior impiden guardar ceros legítimos. Un mes con cero cierres o cero ingresos puede conservar accidentalmente datos del mes anterior.
10. Las divisiones reemplazan denominadores faltantes o cero por 1. Esto produce un número aparentemente válido cuando el KPI debería estar no disponible.
11. El borrado de meses no tiene confirmación, historial de versiones ni papelera.
12. No hay autenticación, roles, permisos, auditoría, pruebas, manejo detallado de errores ni observabilidad.
13. El reparto por equipo se estima proporcionalmente. No usa el Equipo asignado de Notion, por lo que puede mostrar ocupación incorrecta para cada mentor.
14. El componente es monolítico, usa estilos inline y mezcla UI, reglas, importación, persistencia y llamadas externas. Esto encarece cambios y pruebas.

## Visión recomendada del producto

### Navegación principal

1. Inicio: KPIs, alertas y tareas de hoy.
2. CRM: vista kanban y tabla de prospectos.
3. Seguimientos: agenda, vencidos, próximos y asignados.
4. Alumnos: activos, equipo, estado, pausa y ficha sincronizada con Notion.
5. Finanzas: ingresos, egresos, clasificación, conciliación y KPIs.
6. Reportes: ventas, capacidad, rentabilidad, evolución y snapshots.
7. Configuración: usuarios, roles, pipeline, categorías, reglas y constantes.

La carga y sincronización de datos debe vivir en un Centro de datos accesible desde Configuración o desde cada módulo. No debería ocupar permanentemente la parte superior de todas las pantallas.

### CRM mínimo

Cada prospecto debe tener:

- Identidad y contacto: nombre, teléfono normalizado, Instagram, país y ciudad.
- Origen, campaña, fecha de ingreso y responsable.
- Etapa actual y motivo de pérdida o no calificación.
- Valor estimado, CASH cobrado y estado de pago.
- Notas y línea de tiempo inmutable de cambios.
- Próxima acción, fecha, prioridad y recordatorio.
- Etiquetas configurables.
- Detección de posibles duplicados por teléfono, Instagram y nombre.

Vistas indispensables:

- Kanban por etapa con arrastrar y soltar.
- Tabla con búsqueda, filtros guardables y edición rápida.
- Ficha lateral o página de detalle.
- Agenda de seguimientos y lista de vencidos.
- Embudo, conversión por responsable/origen y tiempo por etapa.

### Alumnos y éxito

- Sincronización server-side con Notion.
- Activos operativos: Activo y Estado distinto de Pausa.
- Sentimiento actual con Positivo, A seguir y En pausa.
- Casos de éxito rolling de 12 meses.
- Histórico anual y cobertura de fechas faltantes.
- Ocupación real por Equipo asignado, no estimada proporcionalmente.
- Alertas por alumno en Regular, Pausa prolongada o dato incompleto.

### Finanzas y control de calidad

Cada importación debe pasar por cuatro pasos:

1. Selección explícita del período y la fuente.
2. Lectura determinística del archivo o sincronización.
3. Vista previa con filas aceptadas, advertencias, duplicados y errores.
4. Confirmación y registro de auditoría.

Las reglas de clasificación deben aplicar por prioridad y mostrar qué palabra o condición produjo cada categoría. El administrador debe poder corregir una línea y decidir si esa corrección se transforma en una nueva regla.

Debe existir una conciliación visible entre:

- Ingresos contables.
- CASH comercial.
- Diferencia explicada por cuotas, anticipos, Skool, Hotmart y otros conceptos.

CASH y contabilidad son fuentes distintas y no deben presentarse como si fueran el mismo indicador.

## Configuración y escalabilidad

### Configurable por administrador

- Etapas del pipeline, orden, colores y estados finales.
- Motivos de pérdida y no calificación.
- Usuarios, roles, equipos y reglas de asignación.
- Orígenes, etiquetas, metas y alertas.
- Capacidad por equipo, precio, ingreso real esperado y duración de mentoría.
- Ventana de casos de éxito.
- Categorías financieras, impacto en KPIs, palabras clave, prioridad y vigencia.
- Umbrales visuales de ocupación, tasa de cierre y margen.
- Mapeo de columnas de Excel o CSV.
- Frecuencia y horario de sincronizaciones.

### No editable sin control técnico

- Identificadores internos y relaciones.
- Fórmulas versionadas de KPIs.
- Eventos originales de importación.
- Auditoría de acciones.
- Restricciones de integridad y permisos de base de datos.

Esto evita que la flexibilidad permita cambiar silenciosamente el significado histórico de un KPI. Una regla nueva debe tener fecha de vigencia y opción de recalcular períodos anteriores de forma explícita.

## Arquitectura recomendada

- Frontend: React con Next.js y TypeScript, componentes separados y diseño responsive.
- Backend y base: Supabase con PostgreSQL, Auth, Storage, Row Level Security y funciones server-side.
- Hosting: Vercel o equivalente.
- Integraciones: Google Sheets y Notion desde backend. Tokens sólo en secretos del servidor.
- Sincronización: jobs idempotentes, paginación, reintentos, manejo de rate limits y registro por ejecución.
- Importaciones: parser real de XLSX/CSV, mapeo de columnas, hash de archivo y claves idempotentes.
- Calidad: pruebas unitarias para KPIs y reglas, pruebas de integración para importaciones y pruebas end-to-end de flujos críticos.

Entidades principales: contacts, opportunities, pipeline_stages, activities, tasks, payments, expenses, students, teams, category_rules, imports, import_rows, monthly_snapshots, settings, users, roles y audit_events.

## Roles recomendados

| Rol | Acceso principal |
| --- | --- |
| Dueño/Admin | Acceso total, configuración y usuarios |
| Ventas | Prospectos, actividades, tareas, CASH y reportes comerciales |
| Mentor | Alumnos asignados, estado y alertas de seguimiento |
| Finanzas | Ingresos, egresos, clasificación, conciliación y cierres |
| Lectura | Reportes sin edición |

Para un equipo de cuatro personas algunos usuarios podrán acumular más de un rol.

## Fases de trabajo

### Fase 0 Definición y diseño funcional

Duración: 1 semana.

- Acceso al repositorio y entorno real.
- Diccionario de datos y definición exacta de cada KPI.
- Resolución de discrepancias entre brief, Excel y panel.
- Wireframes navegables de CRM, ficha, alumnos y finanzas.
- Criterios de aceptación y backlog cerrado de v1.

### Fase 1 Base técnica

Duración: 1 a 1,5 semanas.

- Proyecto, ambientes y despliegue.
- Base de datos, autenticación y roles.
- Layout, navegación y sistema de componentes.
- Auditoría y manejo centralizado de errores.

### Fase 2 CRM operativo

Duración: 2 a 2,5 semanas.

- Prospectos, oportunidades, etapas, responsables y etiquetas.
- Kanban, tabla, búsqueda, filtros y detalle.
- Notas, actividades, tareas y próximos seguimientos.
- Duplicados y reglas básicas de calidad.

### Fase 3 Datos e integraciones

Duración: 2 semanas.

- Importador XLSX/CSV con vista previa y conciliación.
- Integración con Google Sheets.
- Integración con Notion, paginación y reintentos.
- Historial de importaciones y correcciones.

### Fase 4 Panel, alumnos y reportes

Duración: 1,5 a 2 semanas.

- KPIs financieros y comerciales versionados.
- Sentimiento y casos de éxito.
- Capacidad real por equipo.
- Evolución mensual y snapshots.
- Alertas de datos incompletos y diferencias.

### Fase 5 Configuración administrativa

Duración: 1 semana.

- Pipeline, reglas de costos, constantes, metas y umbrales.
- Usuarios, roles y equipos.
- Vigencias, recalculo controlado y auditoría.

### Fase 6 QA, migración y puesta en marcha

Duración: 1 a 1,5 semanas.

- Migración de prospectos 2026 y datos contables acordados.
- Pruebas de fórmulas, permisos e integraciones.
- Pruebas con usuarios, correcciones y capacitación.
- Go-live, monitoreo inicial y documentación.

Duración total estimada: 10 a 12 semanas.

## Presupuesto recomendado

Tarifa de referencia usada para estimar: USD 35 por hora.

| Bloque | Horas estimadas | Importe |
| --- | ---: | ---: |
| Definición, auditoría funcional y UX | 32 | USD 1.120 |
| Base técnica, datos, autenticación y roles | 48 | USD 1.680 |
| CRM operativo | 88 | USD 3.080 |
| Importaciones e integraciones | 72 | USD 2.520 |
| Panel, alumnos, KPIs y snapshots | 56 | USD 1.960 |
| Configuración, permisos y auditoría | 40 | USD 1.400 |
| QA, migración, capacitación y despliegue | 44 | USD 1.540 |
| Subtotal estimado | 380 | USD 13.300 |
| Reserva de alcance y estabilización 12 por ciento |  | USD 1.600 |
| Precio fijo sugerido al cliente |  | USD 14.900 |

Forma de pago sugerida:

- 20 por ciento al iniciar.
- 25 por ciento al aprobar diseño y base técnica.
- 25 por ciento al aprobar el CRM operativo.
- 20 por ciento al aprobar integraciones y panel.
- 10 por ciento con puesta en producción.

### Alternativa MVP

Precio sugerido: USD 9.800. Duración: 7 a 8 semanas.

Incluye CRM, tareas, importación manual validada, KPIs principales, usuarios básicos y migración 2026. Mantiene la carga manual de alumnos y no incluye sincronización automática con Notion y Google Sheets, configuración avanzada de reglas ni auditoría completa.

La versión recomendada es preferible porque resuelve el objetivo expresado por el cliente: una herramienta simple, escalable y mayormente configurable, sin depender de intervención técnica mensual.

### Costos recurrentes estimados

- Supabase Pro: desde USD 25 por mes.
- Vercel Pro: USD 20 por mes, más excedentes si los hubiera.
- Dominio, correo transaccional y consumo de servicios de IA: según proveedor y uso.
- Mantenimiento opcional: USD 350 a 600 por mes para soporte, monitoreo, actualizaciones menores y una bolsa acotada de horas.

Los servicios de terceros deben quedar a nombre del cliente y se facturan por separado.

## Alcance no incluido

- Automatizaciones de WhatsApp, Instagram, email o telefonía.
- Portal externo para alumnos.
- Facturación, contabilidad formal o conciliación bancaria automática.
- Aplicación móvil nativa.
- Migración de datos previos a 2026 no entregados.
- Rediseño de la base de Notion más allá de los campos necesarios para integrar.
- Funciones de IA generativa, salvo que se coticen después de asegurar privacidad, utilidad y costos.

## Condiciones para sostener el presupuesto

- Una única empresa y moneda base USD.
- Hasta 10 usuarios internos durante la primera versión.
- Una base de Notion y dos documentos o fuentes de Google Sheets con estructura acordada.
- Los responsables de VMT validan wireframes, reglas y entregas dentro de dos días hábiles.
- El cliente entrega accesos, datos completos y un interlocutor para resolver definiciones.
- Cambios de alcance posteriores a la Fase 0 se estiman por separado.

## Criterios de aceptación principales

- Un prospecto se crea una vez y conserva todo su historial entre meses.
- Cero cierres, cero ingresos y datos faltantes se distinguen correctamente.
- CASH coincide con la suma de valores numéricos importados sin filtrar por Resultado.
- Las importaciones no duplican registros al repetirse.
- Cada KPI muestra fuente, período, fórmula y última actualización.
- Pausa aparece en sentimiento pero se excluye de activos operativos.
- Casos de éxito usa una ventana rolling real de 12 meses.
- La ocupación por equipo usa la asignación real de Notion.
- Un vendedor no puede ver ni editar finanzas si su rol no lo permite.
- Las reglas y constantes modificables conservan historial y vigencia.
- Todo cambio relevante queda asociado a usuario y fecha.

## Decisiones necesarias antes de implementar

1. Confirmar si existe un repositorio productivo adicional al JSX entregado.
2. Definir si Google Sheets será fuente transitoria o continuará como entrada permanente.
3. Acordar qué evento convierte un cierre comercial en alumno y cómo se enlaza con Notion.
4. Resolver la definición de prospectos totales cuando Resultado está vacío.
5. Validar la composición exacta de costo fijo, CAC y gastos extraordinarios.
6. Definir si los snapshots cerrados se pueden reabrir y quién puede hacerlo.
7. Elegir MVP o CRM v1 recomendado.

## Próximo paso

La siguiente etapa debe ser un plan de implementación técnico derivado de la Fase 0: historias de usuario, modelo de datos detallado, endpoints, permisos, casos de prueba, migración y entregas por sprint. Conviene hacerlo después de que el cliente apruebe alcance, presupuesto y las siete decisiones anteriores.
