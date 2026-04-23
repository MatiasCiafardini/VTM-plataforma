"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EvolutionPeriod = {
  id: string;
  month: number;
  year: number;
  status: string;
  metricsCount: number;
  balanceGeneral: number | null;
  balanceGeneralUsd: number | null;
  ingresosFacturacion: number | null;
  ingresosFacturacionUsd: number | null;
  cantidadTotalTatuajes: number | null;
  comisionEstudio: number | null;
  comisionEstudioUsd: number | null;
  comisionEstudioPorcentaje: number | null;
  gastosDelMes: number | null;
  gastosDelMesUsd: number | null;
  seguidoresInstagramActuales: number | null;
  consultasMensuales: number | null;
  conversacionesANuevos: number | null;
  cotizaciones: number | null;
  cierresDelMes: number | null;
  cierresNuevosClientes: number | null;
  cierresPorRecomendaciones: number | null;
  cierresRecurrentes: number | null;
  cierresConNuevosSeguidores: number | null;
  porcentajeSeguimiento: number | null;
};

type MetricDefinition = {
  id: string;
  slug: string;
  valueType: "INTEGER" | "DECIMAL" | "CURRENCY" | "TEXT" | "BOOLEAN";
};

type CurrencyInfo = {
  id: string;
  code: string;
  symbol: string | null;
};

type StudentResultsPanelProps = {
  evolution: EvolutionPeriod[];
  metricDefinitions: MetricDefinition[];
  localCurrency: CurrencyInfo | null;
  metricLabels?: {
    revenue: string;
    leads: string;
    closures: string;
  } | null;
};

type MetricPeriodResponse = {
  id: string;
  month: number;
  year: number;
};

type FormState = {
  month: number;
  year: number;
  ingresosFacturacion: string;
  cantidadTotalTatuajes: string;
  comisionEstudioPorcentaje: string;
  gastosDelMes: string;
  seguidoresInstagramActuales: string;
  consultasMensuales: string;
  conversacionesANuevos: string;
  cotizaciones: string;
  cierresDelMes: string;
  cierresNuevosClientes: string;
  cierresPorRecomendaciones: string;
  cierresRecurrentes: string;
  cierresConNuevosSeguidores: string;
  porcentajeSeguimiento: string;
};

const monthOptions = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

function formatCompactNumber(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value !== null && value % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatLocalAndUsd(
  localValue: number | null,
  usdValue: number | null,
  currencyCode: string,
) {
  const localFormatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(localValue ?? 0);

  if (usdValue === null || usdValue === undefined) {
    return localFormatted;
  }

  const usdFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdValue);

  return `${localFormatted} (${usdFormatted})`;
}

function formatMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function buildInitialFormState(): FormState {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    ingresosFacturacion: "",
    cantidadTotalTatuajes: "",
    comisionEstudioPorcentaje: "",
    gastosDelMes: "",
    seguidoresInstagramActuales: "",
    consultasMensuales: "",
    conversacionesANuevos: "",
    cotizaciones: "",
    cierresDelMes: "",
    cierresNuevosClientes: "",
    cierresPorRecomendaciones: "",
    cierresRecurrentes: "",
    cierresConNuevosSeguidores: "",
    porcentajeSeguimiento: "",
  };
}

function buildFormStateForPeriod(
  month: number,
  year: number,
  period?: EvolutionPeriod,
): FormState {
  const val = (v: number | null) => (v !== null ? String(v) : "");
  return {
    month,
    year,
    ingresosFacturacion: val(period?.ingresosFacturacion ?? null),
    cantidadTotalTatuajes: val(period?.cantidadTotalTatuajes ?? null),
    comisionEstudioPorcentaje: val(period?.comisionEstudioPorcentaje ?? null),
    gastosDelMes: val(period?.gastosDelMes ?? null),
    seguidoresInstagramActuales: val(
      period?.seguidoresInstagramActuales ?? null,
    ),
    consultasMensuales: val(period?.consultasMensuales ?? null),
    conversacionesANuevos: val(period?.conversacionesANuevos ?? null),
    cotizaciones: val(period?.cotizaciones ?? null),
    cierresDelMes: val(period?.cierresDelMes ?? null),
    cierresNuevosClientes: val(period?.cierresNuevosClientes ?? null),
    cierresPorRecomendaciones: val(period?.cierresPorRecomendaciones ?? null),
    cierresRecurrentes: val(period?.cierresRecurrentes ?? null),
    cierresConNuevosSeguidores: val(period?.cierresConNuevosSeguidores ?? null),
    porcentajeSeguimiento: val(period?.porcentajeSeguimiento ?? null),
  };
}

function toNumber(value: string): number {
  if (!value.trim()) return 0;
  // Accept both comma and dot as decimal separator (e.g. "1400,00" → 1400)
  const normalized = value.replace(",", ".");
  const num = Number(normalized);
  return isNaN(num) ? 0 : num;
}

export function StudentResultsPanel({
  evolution,
  metricDefinitions,
  localCurrency,
  metricLabels,
}: StudentResultsPanelProps) {
  const router = useRouter();
  const [hoveredPeriodId, setHoveredPeriodId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(buildInitialFormState);

  const metricDefinitionMap = useMemo(
    () =>
      Object.fromEntries(
        metricDefinitions.map((definition) => [definition.slug, definition]),
      ),
    [metricDefinitions],
  );

  const totalRevenue = evolution.reduce(
    (sum, period) => sum + (period.ingresosFacturacion ?? 0),
    0,
  );
  const firstRevenue = evolution[0]?.ingresosFacturacion ?? 0;
  const lastRevenue = evolution[evolution.length - 1]?.ingresosFacturacion ?? 0;
  const revenueGrowth =
    firstRevenue > 0
      ? Math.round(((lastRevenue - firstRevenue) / firstRevenue) * 100)
      : 0;
  const bestPeriod = [...evolution].sort(
    (left, right) =>
      (right.ingresosFacturacion ?? 0) - (left.ingresosFacturacion ?? 0),
  )[0];
  const revenueLabel = metricLabels?.revenue ?? "Ingresos totales";
  const leadsLabel = metricLabels?.leads ?? "Consultas";
  const closuresLabel = metricLabels?.closures ?? "Cierres";
  const currencySymbol = localCurrency?.symbol ?? "$";
  const chartPeriods = evolution;
  const activeChartPeriod =
    chartPeriods.find((period) => period.id === hoveredPeriodId) ?? null;
  const maxRevenue = Math.max(
    1,
    ...chartPeriods.map((period) => period.ingresosFacturacion ?? 0),
  );
  const chartMax = Math.max(1000, Math.ceil(maxRevenue / 1000) * 1000);
  const yAxisTicks = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((chartMax / 4) * (4 - index));
    return value;
  });
  const latestDraftPeriod =
    evolution.find((period) => period.status === "DRAFT") ?? null;
  const selectedExistingPeriod =
    evolution.find(
      (period) => period.month === form.month && period.year === form.year,
    ) ?? null;
  const isExistingPeriodLocked =
    selectedExistingPeriod?.status === "SUBMITTED" ||
    selectedExistingPeriod?.status === "CLOSED";

  function updateField(field: keyof FormState, value: string) {
    if (field === "month" || field === "year") {
      setForm((current) => {
        const nextMonth = field === "month" ? Number(value) : current.month;
        const nextYear = field === "year" ? Number(value) : current.year;
        const matchingPeriod =
          evolution.find(
            (period) => period.month === nextMonth && period.year === nextYear,
          ) ?? undefined;

        return buildFormStateForPeriod(nextMonth, nextYear, matchingPeriod);
      });
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function persistPeriod(submitAfterSave: boolean) {
    if (isExistingPeriodLocked) {
      setError(
        "Ese mes ya fue enviado o cerrado, y no se puede editar desde alumno.",
      );
      return;
    }
    if (submitAfterSave) {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }
    setError(null);

    try {
      const createdPeriodResponse = await fetch(
        "/api/student/metrics/periods",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: form.month,
            year: form.year,
          }),
        },
      );

      const createdPeriodPayload = await createdPeriodResponse.json();
      let periodId: string | null = createdPeriodPayload.id ?? null;

      if (!createdPeriodResponse.ok) {
        const existingPeriodResponse = await fetch(
          `/api/student/metrics/periods?month=${form.month}&year=${form.year}`,
        );
        const existingPeriods =
          (await existingPeriodResponse.json()) as MetricPeriodResponse[];

        if (!existingPeriodResponse.ok || existingPeriods.length === 0) {
          throw new Error(
            createdPeriodPayload.message ?? "No pudimos crear el periodo.",
          );
        }

        periodId = existingPeriods[0].id;
      }

      const currencyId = localCurrency?.id ?? "";
      const ingresosFacturacion = toNumber(form.ingresosFacturacion) ?? 0;
      const comisionPorcentaje = toNumber(form.comisionEstudioPorcentaje) ?? 0;
      const gastosDelMes = toNumber(form.gastosDelMes) ?? 0;
      const comisionCalculada = Number(
        ((ingresosFacturacion * comisionPorcentaje) / 100).toFixed(2),
      );
      const balanceGeneralCalculado = Number(
        Math.max(
          0,
          ingresosFacturacion - comisionCalculada - gastosDelMes,
        ).toFixed(2),
      );
      const values = [
        ["balance-general", String(balanceGeneralCalculado)],
        ["ingresos-facturacion", form.ingresosFacturacion],
        ["cantidad-total-tatuajes", form.cantidadTotalTatuajes],
        ["comision-estudio-porcentaje", form.comisionEstudioPorcentaje],
        ["comision-estudio", String(comisionCalculada)],
        ["gastos-del-mes", form.gastosDelMes],
        ["seguidores-instagram-actuales", form.seguidoresInstagramActuales],
        ["consultas-mensuales", form.consultasMensuales],
        ["conversaciones-a-nuevos", form.conversacionesANuevos],
        ["cotizaciones", form.cotizaciones],
        ["cierres-del-mes", form.cierresDelMes],
        ["cierres-nuevos-clientes", form.cierresNuevosClientes],
        ["cierres-por-recomendaciones", form.cierresPorRecomendaciones],
        ["cierres-recurrentes", form.cierresRecurrentes],
        ["cierres-con-nuevos-seguidores", form.cierresConNuevosSeguidores],
        ["porcentaje-seguimiento", form.porcentajeSeguimiento],
      ]
        .map(([slug, rawValue]) => {
          const definition = metricDefinitionMap[slug];
          const parsedValue = toNumber(rawValue);

          if (!definition) {
            return null;
          }

          if (definition.valueType === "CURRENCY") {
            return {
              metricDefinitionId: definition.id,
              originalAmount: parsedValue,
              originalCurrencyId: currencyId,
            };
          }

          return {
            metricDefinitionId: definition.id,
            numberValue: parsedValue,
          };
        })
        .filter(Boolean);

      const saveValuesResponse = await fetch(
        `/api/student/metrics/periods/${periodId}/values`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values }),
        },
      );

      const saveValuesPayload = await saveValuesResponse.json();

      if (!saveValuesResponse.ok) {
        throw new Error(
          saveValuesPayload.message ?? "No pudimos guardar las metricas.",
        );
      }

      if (submitAfterSave) {
        const submitResponse = await fetch(
          `/api/student/metrics/periods/${periodId}/submit`,
          {
            method: "POST",
          },
        );
        const submitPayload = await submitResponse.json();

        if (!submitResponse.ok) {
          throw new Error(submitPayload.message ?? "No pudimos enviar el mes.");
        }
      }

      setIsOpen(false);
      setForm(buildInitialFormState());
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos guardar el mes.",
      );
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistPeriod(false);
  }

  async function handleSubmitMonth() {
    await persistPeriod(true);
  }

  function openDraftPeriod(period: EvolutionPeriod) {
    setForm(buildFormStateForPeriod(period.month, period.year, period));
    setError(null);
    setIsOpen(true);
  }

  function openExistingPeriod(period: EvolutionPeriod) {
    setForm(buildFormStateForPeriod(period.month, period.year, period));
    setError(null);
    setIsOpen(true);
  }

  function getRevenueDelta(period: EvolutionPeriod) {
    const periodIndex = chartPeriods.findIndex((item) => item.id === period.id);
    if (periodIndex <= 0) {
      return null;
    }

    const previous = chartPeriods[periodIndex - 1]?.ingresosFacturacion ?? 0;
    const current = period.ingresosFacturacion ?? 0;
    const delta = current - previous;
    const pct = previous > 0 ? (delta / previous) * 100 : 0;

    return {
      delta,
      percentage: pct,
    };
  }

  function formatCurrency(value: number | null) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  function formatShortMonth(month: number, year: number) {
    return new Intl.DateTimeFormat("es-AR", {
      month: "short",
    })
      .format(new Date(year, month - 1, 1))
      .replace(".", "");
  }

  return (
    <>
      <section className="student-results-panel">
        <header className="student-results-header">
          <div>
            <h3>Evolucion de {revenueLabel}</h3>
            <p>Tus metricas mensuales</p>
          </div>
          <div className="student-results-header-actions">
            <span className="student-results-currency">
              {localCurrency?.code ?? "USD"}
            </span>
            {latestDraftPeriod ? (
              <button
                className="ghost-button student-results-edit-draft-button"
                type="button"
                onClick={() => openDraftPeriod(latestDraftPeriod)}
              >
                Editar borrador actual
              </button>
            ) : null}
            <button
              className="primary-button student-results-load-button"
              type="button"
              onClick={() => {
                const initial = buildInitialFormState();
                const matchingPeriod =
                  evolution.find(
                    (period) =>
                      period.month === initial.month &&
                      period.year === initial.year,
                  ) ?? undefined;
                setForm(
                  buildFormStateForPeriod(
                    initial.month,
                    initial.year,
                    matchingPeriod,
                  ),
                );
                setError(null);
                setIsOpen(true);
              }}
            >
              Cargar mes
            </button>
          </div>
        </header>

        <div className="student-results-summary-grid">
          <article className="student-results-summary-card">
            <span>Total periodo</span>
            <strong>${formatCompactNumber(totalRevenue)}</strong>
            <p>{revenueLabel} acumulada</p>
          </article>
          <article className="student-results-summary-card">
            <span>Crecimiento</span>
            <strong>
              {revenueGrowth >= 0 ? "+" : ""}
              {revenueGrowth}%
            </strong>
            <p>Variacion del primer al ultimo mes</p>
          </article>
          <article className="student-results-summary-card">
            <span>Mejor mes</span>
            <strong>
              {bestPeriod
                ? formatMonthLabel(bestPeriod.month, bestPeriod.year)
                : "Sin datos"}
            </strong>
            <p>Mayor {revenueLabel.toLowerCase()} registrada</p>
          </article>
        </div>

        <section className="student-results-chart-shell">
          <div className="student-results-chart-note">
            Mantene el ritmo, vienen cosas buenas
          </div>

          <div className="student-results-chart">
            <div className="student-results-chart-yaxis">
              {yAxisTicks.map((tick) => (
                <span key={tick}>${formatCompactNumber(tick)}</span>
              ))}
            </div>

            <div className="student-results-chart-area">
              <div className="student-results-chart-grid">
                {yAxisTicks.map((tick) => (
                  <div className="student-results-chart-grid-line" key={tick} />
                ))}
              </div>

              <svg
                className="student-results-chart-line"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  points={chartPeriods
                    .map((period, index) => {
                      const x =
                        chartPeriods.length === 1
                          ? 50
                          : (index / (chartPeriods.length - 1)) * 100;
                      const y =
                        100 -
                        (((period.ingresosFacturacion ?? 0) / chartMax) * 78 +
                          8);
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </svg>

              <div className="student-results-chart-columns">
                {chartPeriods.map((period) => {
                  const revenue = period.ingresosFacturacion ?? 0;
                  const height = Math.max(10, (revenue / chartMax) * 78);
                  const isActive = activeChartPeriod?.id === period.id;
                  const delta = getRevenueDelta(period);

                  return (
                    <button
                      key={period.id}
                      type="button"
                      className={`student-results-chart-column ${isActive ? "student-results-chart-column-active" : ""}`}
                      onMouseEnter={() => setHoveredPeriodId(period.id)}
                      onFocus={() => setHoveredPeriodId(period.id)}
                      onMouseLeave={() => setHoveredPeriodId(null)}
                      onBlur={() => setHoveredPeriodId(null)}
                      onClick={() => openExistingPeriod(period)}
                    >
                      <span className="student-results-chart-bar-wrap">
                        {isActive ? (
                          <span className="student-results-chart-tooltip student-results-chart-tooltip-inline">
                            <span>
                              {formatMonthLabel(period.month, period.year)}
                            </span>
                            <strong>
                              {formatLocalAndUsd(
                                period.ingresosFacturacion,
                                period.ingresosFacturacionUsd,
                                localCurrency?.code ?? "USD",
                              )}
                            </strong>
                            {delta ? (
                              <small
                                className={
                                  delta.delta >= 0
                                    ? "student-results-chart-tooltip-delta student-results-chart-tooltip-delta-up"
                                    : "student-results-chart-tooltip-delta student-results-chart-tooltip-delta-down"
                                }
                              >
                                {delta.delta >= 0 ? "+" : ""}
                                {formatCurrency(delta.delta)} (
                                {delta.percentage >= 0 ? "+" : ""}
                                {delta.percentage.toFixed(1)}%)
                              </small>
                            ) : (
                              <small>Primer mes registrado</small>
                            )}
                          </span>
                        ) : null}
                        <span
                          className="student-results-chart-bar"
                          style={{ height: `${height}%` }}
                        />
                        <span
                          className="student-results-chart-dot"
                          style={{ bottom: `calc(${height}% - 6px)` }}
                        />
                        {isActive ? (
                          <span className="student-results-chart-cursor" />
                        ) : null}
                      </span>
                      <span className="student-results-chart-label">
                        {formatShortMonth(period.month, period.year)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="student-results-growth-strip">
            {chartPeriods.slice(1).map((period) => {
              const delta = getRevenueDelta(period);
              if (!delta) {
                return null;
              }

              const positive = delta.delta >= 0;

              return (
                <span
                  key={period.id}
                  className={
                    positive
                      ? "student-results-growth-chip student-results-growth-chip-up"
                      : "student-results-growth-chip student-results-growth-chip-down"
                  }
                >
                  {positive ? "+" : ""}
                  {Math.round(delta.percentage)}%{" "}
                  {formatShortMonth(period.month, period.year)}
                </span>
              );
            })}
          </div>
        </section>

        <div className="student-results-history">
          {evolution
            .slice()
            .reverse()
            .map((period) => {
              const totalClosures = period.cierresDelMes ?? 0;
              const newClients = period.cierresNuevosClientes ?? 0;
              const recommendations = period.cierresPorRecomendaciones ?? 0;
              const recurring = period.cierresRecurrentes ?? 0;
              const totalOrigins = Math.max(
                1,
                newClients + recommendations + recurring,
              );
              const newPct = Math.round((newClients / totalOrigins) * 100);
              const recPct = Math.round((recommendations / totalOrigins) * 100);
              const recurringPct = Math.max(0, 100 - newPct - recPct);

              return (
                <article
                  className="student-history-card student-history-card-clickable"
                  key={period.id}
                  onClick={() => openExistingPeriod(period)}
                >
                  <div className="student-history-card-main">
                    <div className="student-history-card-top">
                      <div>
                        <h4>{formatMonthLabel(period.month, period.year)}</h4>
                        <span className="student-history-status">
                          {period.status}
                        </span>
                      </div>
                      <strong className="student-history-growth">
                        {period.metricsCount} metricas
                      </strong>
                    </div>

                    <div className="student-history-metrics-grid">
                      <div>
                        <span>{revenueLabel}</span>
                        <strong>
                          {formatLocalAndUsd(
                            period.ingresosFacturacion,
                            period.ingresosFacturacionUsd,
                            localCurrency?.code ?? "USD",
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Ingresos propios</span>
                        <strong>
                          {formatLocalAndUsd(
                            period.balanceGeneral,
                            period.balanceGeneralUsd,
                            localCurrency?.code ?? "USD",
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Tatuajes</span>
                        <strong>
                          {formatCompactNumber(period.cantidadTotalTatuajes)}
                        </strong>
                      </div>
                      <div>
                        <span>{closuresLabel}</span>
                        <strong>{formatCompactNumber(totalClosures)}</strong>
                      </div>
                      <div>
                        <span>Conv. nuevos</span>
                        <strong>
                          {formatCompactNumber(period.conversacionesANuevos)}
                        </strong>
                      </div>
                      <div>
                        <span>{leadsLabel}</span>
                        <strong>
                          {formatCompactNumber(period.consultasMensuales)}
                        </strong>
                      </div>
                    </div>

                    <div className="student-history-extra-line">
                      <span>
                        Comision del estudio:{" "}
                        {formatCompactNumber(period.comisionEstudioPorcentaje)}%
                      </span>
                      <span>
                        Monto:{" "}
                        {formatLocalAndUsd(
                          period.comisionEstudio,
                          period.comisionEstudioUsd,
                          localCurrency?.code ?? "USD",
                        )}
                      </span>
                      <span>
                        Gastos:{" "}
                        {formatLocalAndUsd(
                          period.gastosDelMes,
                          period.gastosDelMesUsd,
                          localCurrency?.code ?? "USD",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="student-history-pie-panel">
                    <div
                      className="student-history-pie"
                      style={{
                        background: `conic-gradient(#FFD102 0 ${newPct}%, #232223 ${newPct}% ${newPct + recPct}%, #9A999A ${newPct + recPct}% 100%)`,
                      }}
                    />
                    <div className="student-history-legend">
                      <span>Nuevos {newPct}%</span>
                      <span>Recom. {recPct}%</span>
                      <span>Habituales {recurringPct}%</span>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {isOpen ? (
        <div
          className="student-results-modal-backdrop"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="student-results-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-results-modal-head">
              <div>
                <h3>Cargar mes</h3>
                <p>
                  Completá tu resumen mensual y se agregará al histórico de
                  resultados.
                </p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)}>
                Cerrar
              </button>
            </div>

            <form className="student-results-form" onSubmit={handleSaveDraft}>
              <article className="student-form-card">
                <h4>Periodo</h4>
                <div className="student-form-grid student-form-grid-2">
                  <label>
                    <span>Mes</span>
                    <select
                      value={form.month}
                      onChange={(event) =>
                        updateField("month", event.target.value)
                      }
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Año</span>
                    <input
                      type="number"
                      min="2020"
                      max="2100"
                      value={form.year}
                      onChange={(event) =>
                        updateField("year", event.target.value)
                      }
                    />
                  </label>
                </div>
                {selectedExistingPeriod ? (
                  <p className="student-form-card-copy">
                    Mes existente detectado: estado{" "}
                    {selectedExistingPeriod.status}. Se cargaron sus valores
                    actuales en el formulario.
                  </p>
                ) : null}
                {isExistingPeriodLocked ? (
                  <p className="student-results-form-error">
                    Ese mes no se puede modificar porque ya no estA en borrador.
                  </p>
                ) : null}
              </article>

              <article className="student-form-card">
                <h4>Balance general</h4>
                <div className="student-form-grid">
                  <label>
                    <span>Ingresos totales del mes</span>
                    <div className="student-form-money-field">
                      <span>{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={form.ingresosFacturacion}
                        onChange={(event) =>
                          updateField("ingresosFacturacion", event.target.value)
                        }
                      />
                    </div>
                  </label>
                  <label>
                    <span>Cantidad total de tatuajes</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cantidadTotalTatuajes}
                      onChange={(event) =>
                        updateField("cantidadTotalTatuajes", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Comision del estudio %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      value={form.comisionEstudioPorcentaje}
                      onChange={(event) =>
                        updateField(
                          "comisionEstudioPorcentaje",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Gastos del mes</span>
                    <div className="student-form-money-field">
                      <span>{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={form.gastosDelMes}
                        onChange={(event) =>
                          updateField("gastosDelMes", event.target.value)
                        }
                      />
                    </div>
                  </label>
                </div>
              </article>

              <article className="student-form-card">
                <h4>Metricas</h4>
                <div className="student-form-grid">
                  <label>
                    <span>Seguidores en IG</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.seguidoresInstagramActuales}
                      onChange={(event) =>
                        updateField(
                          "seguidoresInstagramActuales",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Consultas mensuales</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.consultasMensuales}
                      onChange={(event) =>
                        updateField("consultasMensuales", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Conversaciones a nuevos</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.conversacionesANuevos}
                      onChange={(event) =>
                        updateField("conversacionesANuevos", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Cotizaciones</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cotizaciones}
                      onChange={(event) =>
                        updateField("cotizaciones", event.target.value)
                      }
                    />
                  </label>
                </div>
              </article>

              <article className="student-form-card">
                <h4>Cierres Mensuales</h4>
                <p className="student-form-card-copy">
                  Esta card muestra de donde salen los nuevos clientes del mes.
                </p>
                <div className="student-form-grid">
                  <label>
                    <span>Total cierres del mes</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cierresDelMes}
                      onChange={(event) =>
                        updateField("cierresDelMes", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Nuevos clientes</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cierresNuevosClientes}
                      onChange={(event) =>
                        updateField("cierresNuevosClientes", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Por recomendacion</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cierresPorRecomendaciones}
                      onChange={(event) =>
                        updateField(
                          "cierresPorRecomendaciones",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Clientes habituales</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cierresRecurrentes}
                      onChange={(event) =>
                        updateField("cierresRecurrentes", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Cierres con seguidores nuevos</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.cierresConNuevosSeguidores}
                      onChange={(event) =>
                        updateField(
                          "cierresConNuevosSeguidores",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Seguimiento del mes %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      value={form.porcentajeSeguimiento}
                      onChange={(event) =>
                        updateField("porcentajeSeguimiento", event.target.value)
                      }
                    />
                  </label>
                </div>
              </article>

              {error ? (
                <p className="student-results-form-error">{error}</p>
              ) : null}

              <div className="student-results-form-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={isSubmitting || isSaving || isExistingPeriodLocked}
                  onClick={handleSubmitMonth}
                >
                  {isSubmitting ? "Enviando..." : "Enviar mes"}
                </button>
                <button
                  type="submit"
                  className="ghost-button"
                  disabled={isSaving || isSubmitting || isExistingPeriodLocked}
                >
                  {isSaving ? "Guardando..." : "Guardar borrador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
