UPDATE "MetricDefinition"
SET
  "name" = 'Personas en seguimiento',
  "valueType" = 'INTEGER',
  "updatedAt" = now()
WHERE "slug" = 'porcentaje-seguimiento';

UPDATE "Challenge"
SET
  "title" = 'Primer seguimiento activo',
  "description" = 'Persona en seguimiento registrada en el mes',
  "targetValue" = 1,
  "difficultyStars" = 1,
  "updatedAt" = now()
WHERE "title" = 'Cero prospectos sin respuesta'
AND "metricDefinitionId" IN (
  SELECT "id"
  FROM "MetricDefinition"
  WHERE "slug" = 'porcentaje-seguimiento'
);

UPDATE "Challenge"
SET
  "title" = '10 personas en seguimiento',
  "description" = 'Prospectos activos en seguimiento durante el mes',
  "targetValue" = 10,
  "difficultyStars" = 2,
  "updatedAt" = now()
WHERE "title" = 'Sin fantasmas este mes'
AND "metricDefinitionId" IN (
  SELECT "id"
  FROM "MetricDefinition"
  WHERE "slug" = 'porcentaje-seguimiento'
);
