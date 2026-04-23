-- =============================================================================
-- SCRIPT: Métricas nuevas + 53 Desafíos VMT
-- Ejecutar con: psql $DATABASE_URL -f seed-challenges.sql
-- =============================================================================

DO $$
DECLARE
  marketing_cat_id  TEXT;
  cierres_cat_id    TEXT;
  finanzas_cat_id   TEXT;
  logros_cat_id     TEXT;

  -- métricas existentes
  mid_conv_nuevos          TEXT;
  mid_cotizaciones         TEXT;
  mid_cierres_mes          TEXT;
  mid_cierres_nuevos       TEXT;
  mid_cierres_recom        TEXT;
  mid_cierres_recurrentes  TEXT;
  mid_seguidores_actuales  TEXT;
  mid_cierres_seg_nuevos   TEXT;

  -- métricas nuevas
  mid_conv_acum            TEXT;
  mid_nuevos_seg_mes       TEXT;
  mid_seg_ganados_acum     TEXT;
  mid_tasa_cierre          TEXT;
  mid_pct_seguimiento      TEXT;
  mid_crec_conv_mes        TEXT;
  mid_meses_creciendo      TEXT;
  mid_meses_activos        TEXT;
  mid_meses_sobre_meta     TEXT;
  mid_cierres_acum         TEXT;
  mid_cierres_rec_acum     TEXT;
  mid_ingresos_acum        TEXT;
  mid_crec_ingresos_mes    TEXT;
  mid_meta_alcanzada       TEXT;
  mid_mejor_mes            TEXT;

BEGIN

-- Protección contra doble ejecución
IF EXISTS (SELECT 1 FROM "Challenge" WHERE title = 'Primer disparo') THEN
  RAISE NOTICE 'Desafios ya cargados. Para re-ejecutar, borre primero con: DELETE FROM "Challenge" WHERE title IN (''Primer disparo'', ''Top performer'');';
  RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Categorías
-- ---------------------------------------------------------------------------
SELECT id INTO marketing_cat_id FROM "MetricCategory" WHERE slug = 'marketing-ventas';
SELECT id INTO cierres_cat_id   FROM "MetricCategory" WHERE slug = 'cierres';
SELECT id INTO finanzas_cat_id  FROM "MetricCategory" WHERE slug = 'finanzas';

-- Crear categoría Logros y Metas si no existe
INSERT INTO "MetricCategory" (id, name, slug, description, "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Logros y Metas', 'logros-metas',
        'Indicadores de logros personales y metas de facturacion', 4, true, now(), now())
ON CONFLICT (slug) DO NOTHING;

SELECT id INTO logros_cat_id FROM "MetricCategory" WHERE slug = 'logros-metas';

-- ---------------------------------------------------------------------------
-- 2. Insertar métricas nuevas
-- ---------------------------------------------------------------------------

-- Marketing / Ventas
INSERT INTO "MetricDefinition" (id, "categoryId", name, slug, "valueType", "isRequired", "isActive", "isSystemSeed", "isMonetary", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, marketing_cat_id, 'Conversaciones acumuladas',                      'conversaciones-acumuladas',           'INTEGER', false, true, true, false,  6, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Nuevos seguidores ganados en el mes',             'nuevos-seguidores-mes',               'INTEGER', false, true, true, false,  7, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Seguidores ganados acumulados',                   'seguidores-ganados-acumulados',        'INTEGER', false, true, true, false,  8, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Tasa de cierre del mes (%)',                      'tasa-de-cierre',                      'DECIMAL', false, true, true, false,  9, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Porcentaje de seguimiento del mes (%)',           'porcentaje-seguimiento',              'DECIMAL', false, true, true, false, 10, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Variacion de conversaciones vs mes anterior',     'crecimiento-conversaciones-mensual',  'INTEGER', false, true, true, false, 11, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Meses consecutivos con crecimiento',              'meses-consecutivos-creciendo',        'INTEGER', false, true, true, false, 12, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Meses activos consecutivos en el sistema',        'meses-activos-consecutivos',          'INTEGER', false, true, true, false, 13, now(), now()),
  (gen_random_uuid()::text, marketing_cat_id, 'Meses consecutivos superando la meta mensual',    'meses-consecutivos-sobre-meta',       'INTEGER', false, true, true, false, 14, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Cierres
INSERT INTO "MetricDefinition" (id, "categoryId", name, slug, "valueType", "isRequired", "isActive", "isSystemSeed", "isMonetary", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, cierres_cat_id, 'Cierres acumulados historicos',    'cierres-acumulados',             'INTEGER', false, true, true, false, 6, now(), now()),
  (gen_random_uuid()::text, cierres_cat_id, 'Cierres recurrentes acumulados',   'cierres-recurrentes-acumulados', 'INTEGER', false, true, true, false, 7, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Logros y Metas
INSERT INTO "MetricDefinition" (id, "categoryId", name, slug, "valueType", "isRequired", "isActive", "isSystemSeed", "isMonetary", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, logros_cat_id, 'Ingresos acumulados historicos (USD)',          'ingresos-acumulados',          'CURRENCY', false, true, true, true, 1, now(), now()),
  (gen_random_uuid()::text, logros_cat_id, 'Crecimiento de ingresos vs mes anterior (USD)', 'crecimiento-ingresos-mensual', 'CURRENCY', false, true, true, true, 2, now(), now()),
  (gen_random_uuid()::text, logros_cat_id, 'Meta mensual de facturacion alcanzada (1=si)',  'meta-mensual-alcanzada',       'INTEGER',  false, true, true, false, 3, now(), now()),
  (gen_random_uuid()::text, logros_cat_id, 'Mejor mes de carrera registrado (1=si)',        'mejor-mes-carrera',            'INTEGER',  false, true, true, false, 4, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Resolver IDs de métricas
-- ---------------------------------------------------------------------------
SELECT id INTO mid_conv_nuevos         FROM "MetricDefinition" WHERE slug = 'conversaciones-a-nuevos';
SELECT id INTO mid_cotizaciones        FROM "MetricDefinition" WHERE slug = 'cotizaciones';
SELECT id INTO mid_cierres_mes         FROM "MetricDefinition" WHERE slug = 'cierres-del-mes';
SELECT id INTO mid_cierres_nuevos      FROM "MetricDefinition" WHERE slug = 'cierres-nuevos-clientes';
SELECT id INTO mid_cierres_recom       FROM "MetricDefinition" WHERE slug = 'cierres-por-recomendaciones';
SELECT id INTO mid_cierres_recurrentes FROM "MetricDefinition" WHERE slug = 'cierres-recurrentes';
SELECT id INTO mid_seguidores_actuales FROM "MetricDefinition" WHERE slug = 'seguidores-instagram-actuales';
SELECT id INTO mid_cierres_seg_nuevos  FROM "MetricDefinition" WHERE slug = 'cierres-con-nuevos-seguidores';

SELECT id INTO mid_conv_acum           FROM "MetricDefinition" WHERE slug = 'conversaciones-acumuladas';
SELECT id INTO mid_nuevos_seg_mes      FROM "MetricDefinition" WHERE slug = 'nuevos-seguidores-mes';
SELECT id INTO mid_seg_ganados_acum    FROM "MetricDefinition" WHERE slug = 'seguidores-ganados-acumulados';
SELECT id INTO mid_tasa_cierre         FROM "MetricDefinition" WHERE slug = 'tasa-de-cierre';
SELECT id INTO mid_pct_seguimiento     FROM "MetricDefinition" WHERE slug = 'porcentaje-seguimiento';
SELECT id INTO mid_crec_conv_mes       FROM "MetricDefinition" WHERE slug = 'crecimiento-conversaciones-mensual';
SELECT id INTO mid_meses_creciendo     FROM "MetricDefinition" WHERE slug = 'meses-consecutivos-creciendo';
SELECT id INTO mid_meses_activos       FROM "MetricDefinition" WHERE slug = 'meses-activos-consecutivos';
SELECT id INTO mid_meses_sobre_meta    FROM "MetricDefinition" WHERE slug = 'meses-consecutivos-sobre-meta';
SELECT id INTO mid_cierres_acum        FROM "MetricDefinition" WHERE slug = 'cierres-acumulados';
SELECT id INTO mid_cierres_rec_acum    FROM "MetricDefinition" WHERE slug = 'cierres-recurrentes-acumulados';
SELECT id INTO mid_ingresos_acum       FROM "MetricDefinition" WHERE slug = 'ingresos-acumulados';
SELECT id INTO mid_crec_ingresos_mes   FROM "MetricDefinition" WHERE slug = 'crecimiento-ingresos-mensual';
SELECT id INTO mid_meta_alcanzada      FROM "MetricDefinition" WHERE slug = 'meta-mensual-alcanzada';
SELECT id INTO mid_mejor_mes           FROM "MetricDefinition" WHERE slug = 'mejor-mes-carrera';

-- ---------------------------------------------------------------------------
-- 4. Insertar 53 desafíos
--    ON CONFLICT (id) DO NOTHING → idempotente si se vuelve a correr
--    pero como usamos gen_random_uuid() el id siempre es nuevo;
--    se controla con el título + metricDefinitionId en su lugar.
-- ---------------------------------------------------------------------------

INSERT INTO "Challenge" (
  id, title, description, "iconKey",
  "targetValue", "difficultyStars", "isActive",
  "metricDefinitionId", "prerequisiteChallengeId",
  "rewardTitle", "rewardUrl",
  "createdAt", "updatedAt"
)
VALUES

-- ── CONVERSACIONES MENSUALES ──────────────────────────────────────────────
(gen_random_uuid()::text,
 'Primer disparo',
 'Primeras conversaciones con nuevos prospectos',
 'rocket', 100, 1, true, mid_conv_nuevos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Arrancamos en serio',
 'El volumen mínimo del sistema ya está activo',
 'rocket', 200, 1, true, mid_conv_nuevos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Máquina encendida',
 'Volumen consistente sostenido',
 'flame', 400, 2, true, mid_conv_nuevos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Modo escala',
 'Volumen alto en un solo mes',
 'flame', 600, 3, true, mid_conv_nuevos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Top performer',
 'Mes élite de prospección',
 'trophy', 1000, 4, true, mid_conv_nuevos, NULL, NULL, NULL, now(), now()),

-- ── CONVERSACIONES ACUMULADAS ─────────────────────────────────────────────
(gen_random_uuid()::text,
 '500 conversaciones iniciadas',
 'Histórico acumulado de conversaciones',
 'spark', 500, 1, true, mid_conv_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '2000 conversaciones iniciadas',
 'Histórico acumulado de conversaciones',
 'spark', 2000, 2, true, mid_conv_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '5000 conversaciones iniciadas',
 'Histórico acumulado de conversaciones',
 'spark', 5000, 3, true, mid_conv_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '10000 conversaciones iniciadas',
 'Histórico acumulado de conversaciones',
 'trophy', 10000, 5, true, mid_conv_acum, NULL, NULL, NULL, now(), now()),

-- ── COTIZACIONES ──────────────────────────────────────────────────────────
(gen_random_uuid()::text,
 'Primer presupuesto enviado',
 'Primera cotización formal registrada',
 'ribbon', 1, 1, true, mid_cotizaciones, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Pipeline activo',
 'Cotizaciones enviadas en el mes',
 'spark', 10, 1, true, mid_cotizaciones, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Flujo constante',
 'Cotizaciones en el mes',
 'spark', 25, 2, true, mid_cotizaciones, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Embudo de alto volumen',
 'Cotizaciones en el mes',
 'flame', 50, 3, true, mid_cotizaciones, NULL, NULL, NULL, now(), now()),

-- ── TASA DE CIERRE ────────────────────────────────────────────────────────
(gen_random_uuid()::text,
 'Tasa de cierre +30%',
 'Más de 3 de cada 10 cotizaciones se convierten',
 'trophy', 30, 3, true, mid_tasa_cierre, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Tasa de cierre +50%',
 'La mitad de los presupuestos se cierran',
 'trophy', 50, 5, true, mid_tasa_cierre, NULL, NULL, NULL, now(), now()),

-- ── SEGUIMIENTO ───────────────────────────────────────────────────────────
(gen_random_uuid()::text,
 'Cero prospectos sin respuesta',
 'Mes completo con seguimiento a todos',
 'ribbon', 100, 3, true, mid_pct_seguimiento, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Sin fantasmas este mes',
 'Ningún prospecto quedó sin respuesta',
 'spark', 100, 2, true, mid_pct_seguimiento, NULL, NULL, NULL, now(), now()),

-- ── CIERRES MENSUALES ─────────────────────────────────────────────────────
(gen_random_uuid()::text,
 'Primer cierre con el método',
 'Primer cierre registrado usando el sistema',
 'ribbon', 1, 1, true, mid_cierres_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '5 cierres en el mes',
 'Cierres totales en el mes',
 'spark', 5, 2, true, mid_cierres_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '10 cierres en el mes',
 'Cierres totales en el mes',
 'flame', 10, 3, true, mid_cierres_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '3 clientes nuevos este mes',
 'Cierres con prospectos que nunca habían tatuado',
 'spark', 3, 2, true, mid_cierres_nuevos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '5 cierres por recomendación',
 'El sistema genera referidos activos',
 'ribbon', 5, 3, true, mid_cierres_recom, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Agenda de la semana llena',
 '7 cierres en el mes',
 'flame', 7, 3, true, mid_cierres_mes, NULL, NULL, NULL, now(), now()),

-- ── CIERRES ACUMULADOS ────────────────────────────────────────────────────
(gen_random_uuid()::text,
 '25 cierres acumulados',
 'Histórico acumulado total',
 'spark', 25, 2, true, mid_cierres_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '50 cierres acumulados',
 'Histórico acumulado total',
 'trophy', 50, 3, true, mid_cierres_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '100 cierres acumulados',
 'Histórico acumulado total',
 'trophy', 100, 4, true, mid_cierres_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Clientela fiel activa',
 'Cierres recurrentes acumulados',
 'ribbon', 30, 3, true, mid_cierres_rec_acum, NULL, NULL, NULL, now(), now()),

-- ── FACTURACIÓN ACUMULADA ─────────────────────────────────────────────────
(gen_random_uuid()::text,
 '$1000 USD facturados con el método',
 'Primer hito de facturación acumulada',
 'dollar', 1000, 1, true, mid_ingresos_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '$3000 USD facturados con el método',
 'Facturación acumulada desde el inicio',
 'dollar', 3000, 2, true, mid_ingresos_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '$5000 USD facturados con el método',
 'Facturación acumulada desde el inicio',
 'dollar', 5000, 3, true, mid_ingresos_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '$10000 USD facturados con el método',
 'Cinco cifras acumuladas usando el sistema',
 'dollar', 10000, 4, true, mid_ingresos_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '$25000 USD facturados con el método',
 'Facturación élite acumulada con VMT',
 'dollar', 25000, 5, true, mid_ingresos_acum, NULL, NULL, NULL, now(), now()),

-- ── CRECIMIENTO MENSUAL ───────────────────────────────────────────────────
(gen_random_uuid()::text,
 'Primer mes por encima de tu base',
 'Supera tu facturación anterior al iniciar VMT',
 'spark', 1, 1, true, mid_crec_ingresos_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '+$1000 USD vs mes anterior',
 'Crecimiento mensual real de facturación',
 'dollar', 1000, 2, true, mid_crec_ingresos_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '+$2000 USD vs mes anterior',
 'El salto promedio que produce el método',
 'dollar', 2000, 3, true, mid_crec_ingresos_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '+$4000 USD vs mes anterior',
 'Crecimiento excepcional en un mes',
 'dollar', 4000, 4, true, mid_crec_ingresos_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Mejor mes de tu carrera',
 'Facturación mensual supera tu máximo histórico',
 'trophy', 1, 4, true, mid_mejor_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Meta mensual cumplida',
 'Alcanzás tu meta de facturación del mes',
 'ribbon', 1, 2, true, mid_meta_alcanzada, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '3 meses por encima de la meta',
 'Consistencia en resultados, no un golpe de suerte',
 'trophy', 3, 4, true, mid_meses_sobre_meta, NULL, NULL, NULL, now(), now()),

-- ── SEGUIDORES ACUMULADOS ─────────────────────────────────────────────────
(gen_random_uuid()::text,
 '+1000 seguidores ganados',
 'Crecimiento acumulado de seguidores desde el inicio',
 'spark', 1000, 1, true, mid_seg_ganados_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '+3000 seguidores ganados',
 'Audiencia en crecimiento sostenido',
 'spark', 3000, 2, true, mid_seg_ganados_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '+5000 seguidores ganados',
 'Comunidad sólida construida con el sistema',
 'trophy', 5000, 3, true, mid_seg_ganados_acum, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Llegué a los 10K',
 'Hito clave de Instagram — cuenta verificable',
 'trophy', 10000, 3, true, mid_seguidores_actuales, NULL, NULL, NULL, now(), now()),

-- ── SEGUIDORES MENSUALES ──────────────────────────────────────────────────
(gen_random_uuid()::text,
 '+500 seguidores en un mes',
 'Crecimiento mensual de audiencia',
 'spark', 500, 2, true, mid_nuevos_seg_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '+1000 seguidores en un mes',
 'Mes de alto crecimiento de audiencia',
 'flame', 1000, 3, true, mid_nuevos_seg_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Audiencia que compra',
 'Cierre con alguien que te siguió ese mismo mes',
 'ribbon', 1, 2, true, mid_cierres_seg_nuevos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Seguidores que se convierten',
 '3 cierres en el mes con seguidores nuevos',
 'ribbon', 3, 3, true, mid_cierres_seg_nuevos, NULL, NULL, NULL, now(), now()),

-- ── CONSISTENCIA ──────────────────────────────────────────────────────────
(gen_random_uuid()::text,
 'Primer mes completo activo',
 'Conversaciones nuevas registradas en el mes',
 'spark', 1, 1, true, mid_meses_activos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '3 meses activos seguidos',
 'El sistema se volvió hábito',
 'flame', 3, 2, true, mid_meses_activos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 '6 meses activos seguidos',
 'Consistencia de largo plazo',
 'flame', 6, 3, true, mid_meses_activos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Año completo en el sistema',
 '12 meses activos consecutivos',
 'trophy', 12, 5, true, mid_meses_activos, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Mes sin caída de volumen',
 'Conversaciones iguales o más que el mes anterior',
 'spark', 1, 2, true, mid_crec_conv_mes, NULL, NULL, NULL, now(), now()),

(gen_random_uuid()::text,
 'Volumen creciente 3 meses',
 'Cada mes más conversaciones que el anterior',
 'flame', 3, 3, true, mid_meses_creciendo, NULL, NULL, NULL, now(), now());

END $$;

-- Verificación rápida
SELECT COUNT(*) AS total_desafios FROM "Challenge";
SELECT COUNT(*) AS total_metricas FROM "MetricDefinition";
