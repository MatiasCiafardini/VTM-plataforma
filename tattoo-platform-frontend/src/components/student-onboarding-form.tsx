"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getCurrencyCodeForCountry, supportedCountries } from "@/lib/countries";

type Currency = {
  id: string;
  code: string;
  symbol: string | null;
};

type MetricDefinition = {
  id: string;
  slug: string;
  valueType: "INTEGER" | "DECIMAL" | "CURRENCY" | "TEXT" | "BOOLEAN";
};

type StudentProfileData = {
  country: string | null;
  instagramHandle: string | null;
  localCurrency: Currency | null;
};

type MetricFieldsState = {
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

type OnboardingFormState = {
  month: string;
  year: string;
  country: string;
  instagramHandle: string;
  previousMonth: MetricFieldsState;
  latestBillingMonth: MetricFieldsState;
};

type PeriodRef = {
  month: number;
  year: number;
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

const metricFieldKeys: Array<keyof MetricFieldsState> = [
  "ingresosFacturacion",
  "cantidadTotalTatuajes",
  "comisionEstudioPorcentaje",
  "gastosDelMes",
  "seguidoresInstagramActuales",
  "consultasMensuales",
  "conversacionesANuevos",
  "cotizaciones",
  "cierresDelMes",
  "cierresNuevosClientes",
  "cierresPorRecomendaciones",
  "cierresRecurrentes",
  "cierresConNuevosSeguidores",
  "porcentajeSeguimiento",
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i);

function getPreviousMonthPeriod(
  month: string | number,
  year: string | number,
): PeriodRef {
  const m = Number(month);
  const y = Number(year);

  if (m === 1) {
    return { month: 12, year: y - 1 };
  }

  return { month: m - 1, year: y };
}

function periodToIndex(period: PeriodRef) {
  return period.year * 12 + (period.month - 1);
}

function getMonthDistance(start: PeriodRef, end: PeriodRef) {
  return periodToIndex(end) - periodToIndex(start);
}

function listPeriodsBetween(start: PeriodRef, end: PeriodRef) {
  const periods: PeriodRef[] = [];
  let cursor = { ...start };

  while (periodToIndex(cursor) <= periodToIndex(end)) {
    periods.push(cursor);
    cursor =
      cursor.month === 12
        ? { month: 1, year: cursor.year + 1 }
        : { month: cursor.month + 1, year: cursor.year };
  }

  return periods;
}

function createEmptyMetricsState(): MetricFieldsState {
  return {
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

function buildInitialState(profile: StudentProfileData): OnboardingFormState {
  const now = new Date();

  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    country: profile.country ?? "",
    instagramHandle: profile.instagramHandle ?? "",
    previousMonth: createEmptyMetricsState(),
    latestBillingMonth: createEmptyMetricsState(),
  };
}

function toNumber(value: string): number {
  if (!value.trim()) return 0;
  const normalized = value.replace(",", ".");
  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatCurrencyLabel(currency: Currency | null) {
  if (!currency) {
    return "Sin moneda asignada";
  }

  return `${currency.code}${currency.symbol ? ` (${currency.symbol})` : ""}`;
}

function formatPeriodLabel(period: PeriodRef) {
  const label =
    monthOptions.find((month) => month.value === period.month)?.label ??
    `Mes ${period.month}`;

  return `${label} ${period.year}`;
}

function buildMetricNumberMap(section: MetricFieldsState) {
  const ingresosFacturacion = toNumber(section.ingresosFacturacion);
  const comisionEstudioPorcentaje = toNumber(section.comisionEstudioPorcentaje);
  const comisionCalculada = roundTo(
    (ingresosFacturacion * comisionEstudioPorcentaje) / 100,
    2,
  );
  const balanceGeneralCalculado = roundTo(
    Math.max(
      0,
      ingresosFacturacion - comisionCalculada - toNumber(section.gastosDelMes),
    ),
    2,
  );

  return {
    "balance-general": balanceGeneralCalculado,
    "ingresos-facturacion": ingresosFacturacion,
    "cantidad-total-tatuajes": toNumber(section.cantidadTotalTatuajes),
    "comision-estudio-porcentaje": comisionEstudioPorcentaje,
    "comision-estudio": comisionCalculada,
    "gastos-del-mes": toNumber(section.gastosDelMes),
    "seguidores-instagram-actuales": toNumber(section.seguidoresInstagramActuales),
    "consultas-mensuales": toNumber(section.consultasMensuales),
    "conversaciones-a-nuevos": toNumber(section.conversacionesANuevos),
    cotizaciones: toNumber(section.cotizaciones),
    "cierres-del-mes": toNumber(section.cierresDelMes),
    "cierres-nuevos-clientes": toNumber(section.cierresNuevosClientes),
    "cierres-por-recomendaciones": toNumber(section.cierresPorRecomendaciones),
    "cierres-recurrentes": toNumber(section.cierresRecurrentes),
    "cierres-con-nuevos-seguidores": toNumber(
      section.cierresConNuevosSeguidores,
    ),
    "porcentaje-seguimiento": toNumber(section.porcentajeSeguimiento),
  };
}

function interpolateMetricSection(
  start: MetricFieldsState,
  end: MetricFieldsState,
  step: number,
  totalSteps: number,
  metricDefinitionMap: Record<string, MetricDefinition>,
): MetricFieldsState {
  if (step <= 0) {
    return start;
  }

  if (step >= totalSteps) {
    return end;
  }

  const ratio = totalSteps === 0 ? 1 : step / totalSteps;
  const nextState = createEmptyMetricsState();

  for (const field of metricFieldKeys) {
    const startValue = toNumber(start[field]);
    const endValue = toNumber(end[field]);
    const interpolated = startValue + (endValue - startValue) * ratio;

    const slugByField: Partial<Record<keyof MetricFieldsState, string>> = {
      ingresosFacturacion: "ingresos-facturacion",
      cantidadTotalTatuajes: "cantidad-total-tatuajes",
      comisionEstudioPorcentaje: "comision-estudio-porcentaje",
      gastosDelMes: "gastos-del-mes",
      seguidoresInstagramActuales: "seguidores-instagram-actuales",
      consultasMensuales: "consultas-mensuales",
      conversacionesANuevos: "conversaciones-a-nuevos",
      cotizaciones: "cotizaciones",
      cierresDelMes: "cierres-del-mes",
      cierresNuevosClientes: "cierres-nuevos-clientes",
      cierresPorRecomendaciones: "cierres-por-recomendaciones",
      cierresRecurrentes: "cierres-recurrentes",
      cierresConNuevosSeguidores: "cierres-con-nuevos-seguidores",
      porcentajeSeguimiento: "porcentaje-seguimiento",
    };

    const definition = metricDefinitionMap[slugByField[field] ?? ""];
    const rounded =
      definition?.valueType === "INTEGER"
        ? Math.round(interpolated)
        : roundTo(interpolated, 2);

    nextState[field] = String(Math.max(0, rounded));
  }

  return nextState;
}

function buildMetricPayload(
  section: MetricFieldsState,
  metricDefinitionMap: Record<string, MetricDefinition>,
  localCurrencyId: string,
) {
  const values: Array<Record<string, string | number | null | undefined>> = [];
  const metricMap = buildMetricNumberMap(section);

  for (const [slug, rawValue] of Object.entries(metricMap)) {
    const definition = metricDefinitionMap[slug];

    if (!definition) {
      continue;
    }

    if (definition.valueType === "CURRENCY") {
      values.push({
        metricDefinitionId: definition.id,
        originalAmount: rawValue,
        originalCurrencyId: localCurrencyId,
      });
      continue;
    }

    values.push({
      metricDefinitionId: definition.id,
      numberValue: rawValue,
    });
  }

  return values;
}

function hasAnyMetricsInSection(section: MetricFieldsState) {
  return metricFieldKeys.some((field) => section[field].trim() !== "");
}

async function ensurePeriod(
  period: PeriodRef,
  createMessage: string,
): Promise<{ id: string; status: string }> {
  const periodResponse = await fetch("/api/student/metrics/periods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      month: period.month,
      year: period.year,
    }),
  });

  const periodPayload = await periodResponse.json();

  if (periodResponse.ok && periodPayload?.id) {
    return {
      id: periodPayload.id,
      status: periodPayload.status ?? "DRAFT",
    };
  }

  const existingPeriodsResponse = await fetch(
    `/api/student/metrics/periods?month=${period.month}&year=${period.year}`,
    { cache: "no-store" },
  );
  const existingPeriodsPayload = await existingPeriodsResponse.json();

  if (
    !existingPeriodsResponse.ok ||
    !Array.isArray(existingPeriodsPayload) ||
    !existingPeriodsPayload[0]?.id
  ) {
    throw new Error(periodPayload.message ?? createMessage);
  }

  return {
    id: existingPeriodsPayload[0].id,
    status: existingPeriodsPayload[0].status ?? "DRAFT",
  };
}

function MetricSection({
  title,
  description,
  data,
  currencySymbol,
  onChange,
}: {
  title: string;
  description: string;
  data: MetricFieldsState;
  currencySymbol: string;
  onChange: (field: keyof MetricFieldsState, value: string) => void;
}) {
  return (
    <>
      <div className="student-onboarding-section-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <article className="student-form-card">
        <h4>Balance General</h4>
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
                value={data.ingresosFacturacion}
                onChange={(event) =>
                  onChange("ingresosFacturacion", event.target.value)
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
              value={data.cantidadTotalTatuajes}
              onChange={(event) =>
                onChange("cantidadTotalTatuajes", event.target.value)
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
              value={data.comisionEstudioPorcentaje}
              onChange={(event) =>
                onChange("comisionEstudioPorcentaje", event.target.value)
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
                value={data.gastosDelMes}
                onChange={(event) => onChange("gastosDelMes", event.target.value)}
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
              value={data.seguidoresInstagramActuales}
              onChange={(event) =>
                onChange("seguidoresInstagramActuales", event.target.value)
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
              value={data.consultasMensuales}
              onChange={(event) =>
                onChange("consultasMensuales", event.target.value)
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
              value={data.conversacionesANuevos}
              onChange={(event) =>
                onChange("conversacionesANuevos", event.target.value)
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
              value={data.cotizaciones}
              onChange={(event) => onChange("cotizaciones", event.target.value)}
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
              value={data.cierresDelMes}
              onChange={(event) => onChange("cierresDelMes", event.target.value)}
            />
          </label>
          <label>
            <span>Nuevos clientes</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={data.cierresNuevosClientes}
              onChange={(event) =>
                onChange("cierresNuevosClientes", event.target.value)
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
              value={data.cierresPorRecomendaciones}
              onChange={(event) =>
                onChange("cierresPorRecomendaciones", event.target.value)
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
              value={data.cierresRecurrentes}
              onChange={(event) =>
                onChange("cierresRecurrentes", event.target.value)
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
              value={data.cierresConNuevosSeguidores}
              onChange={(event) =>
                onChange("cierresConNuevosSeguidores", event.target.value)
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
              value={data.porcentajeSeguimiento}
              onChange={(event) =>
                onChange("porcentajeSeguimiento", event.target.value)
              }
            />
          </label>
        </div>
      </article>
    </>
  );
}

export function StudentOnboardingForm({
  profile,
  currencies,
  metricDefinitions,
}: {
  profile: StudentProfileData;
  currencies: Currency[];
  metricDefinitions: MetricDefinition[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingFormState>(
    buildInitialState(profile),
  );
  const [activeMetricsTab, setActiveMetricsTab] = useState<
    "previousMonth" | "latestBillingMonth"
  >("previousMonth");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const metricDefinitionMap = useMemo(
    () =>
      Object.fromEntries(
        metricDefinitions.map((definition) => [definition.slug, definition]),
      ),
    [metricDefinitions],
  );

  const selectedCurrency = useMemo(() => {
    const currencyCode = getCurrencyCodeForCountry(form.country);

    if (!currencyCode) {
      return profile.localCurrency;
    }

    return (
      currencies.find((currency) => currency.code === currencyCode) ??
      profile.localCurrency
    );
  }, [currencies, form.country, profile.localCurrency]);

  const mentorshipStartPeriod = useMemo(
    () => ({
      month: Number(form.month),
      year: Number(form.year),
    }),
    [form.month, form.year],
  );

  const previousMonthPeriod = useMemo(
    () => getPreviousMonthPeriod(form.month, form.year),
    [form.month, form.year],
  );

  const currentRegistrationPeriod = useMemo(() => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }, []);

  const latestBillingPeriod = useMemo(
    () =>
      getPreviousMonthPeriod(
        currentRegistrationPeriod.month,
        currentRegistrationPeriod.year,
      ),
    [currentRegistrationPeriod.month, currentRegistrationPeriod.year],
  );

  const shouldCollectLatestBillingMonth = useMemo(() => {
    if (!mentorshipStartPeriod.month || !mentorshipStartPeriod.year) {
      return false;
    }

    return (
      getMonthDistance(mentorshipStartPeriod, currentRegistrationPeriod) >= 3
    );
  }, [currentRegistrationPeriod, mentorshipStartPeriod]);

  const hasPreviousMonthData = useMemo(
    () => hasAnyMetricsInSection(form.previousMonth),
    [form.previousMonth],
  );
  const hasLatestBillingMonthData = useMemo(
    () => hasAnyMetricsInSection(form.latestBillingMonth),
    [form.latestBillingMonth],
  );
  const canOfferAutomaticFill =
    shouldCollectLatestBillingMonth &&
    hasPreviousMonthData &&
    hasLatestBillingMonthData &&
    getMonthDistance(previousMonthPeriod, latestBillingPeriod) > 0;

  useEffect(() => {
    if (!shouldCollectLatestBillingMonth) {
      setActiveMetricsTab("previousMonth");
    }
  }, [shouldCollectLatestBillingMonth]);

  function updateField(field: "month" | "year" | "country" | "instagramHandle", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateMetricsField(
    section: "previousMonth" | "latestBillingMonth",
    field: keyof MetricFieldsState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      if (!form.country) {
        throw new Error("Selecciona tu pais.");
      }

      if (!form.instagramHandle.trim()) {
        throw new Error("Ingresa tu Instagram.");
      }

      if (!selectedCurrency) {
        throw new Error("No pudimos resolver tu moneda local para ese pais.");
      }

      if (
        getMonthDistance(currentRegistrationPeriod, mentorshipStartPeriod) > 0
      ) {
        throw new Error("El inicio de la mentoria no puede ser posterior al mes actual.");
      }

      if (
        periodToIndex(previousMonthPeriod) > periodToIndex(latestBillingPeriod)
      ) {
        throw new Error(
          "El mes previo al inicio no puede quedar despues del ultimo mes de facturacion.",
        );
      }

      if (!hasPreviousMonthData && !hasLatestBillingMonthData) {
        throw new Error(
          "Carga al menos uno de estos dos cortes: el mes previo a la mentoria o el ultimo mes de facturacion.",
        );
      }

      const localCurrencyId = selectedCurrency.id;
      let usedAutomaticFill = false;

      const profileResponse = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: form.country,
          instagramHandle: form.instagramHandle.trim().replace(/^@/, ""),
          localCurrencyId: localCurrencyId || undefined,
        }),
      });

      const profilePayload = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(
          profilePayload.message ?? "No pudimos guardar tu perfil inicial.",
        );
      }

      let periodsToPersist: Array<{
        period: PeriodRef;
        section: MetricFieldsState;
      }> = [];

      if (canOfferAutomaticFill) {
        const shouldAutoFill = window.confirm(
          "Quieres completar los meses del medio automaticamente?",
        );

        if (shouldAutoFill) {
          usedAutomaticFill = true;
          const periods = listPeriodsBetween(
            previousMonthPeriod,
            latestBillingPeriod,
          );
          const totalSteps = Math.max(0, periods.length - 1);

          periodsToPersist = periods.map((period, index) => ({
            period,
            section: interpolateMetricSection(
              form.previousMonth,
              form.latestBillingMonth,
              index,
              totalSteps,
              metricDefinitionMap,
            ),
          }));
        } else {
          periodsToPersist = [
            { period: previousMonthPeriod, section: form.previousMonth },
            { period: latestBillingPeriod, section: form.latestBillingMonth },
          ];
        }
      } else if (hasPreviousMonthData) {
        periodsToPersist.push({
          period: previousMonthPeriod,
          section: form.previousMonth,
        });
      }

      if (
        shouldCollectLatestBillingMonth &&
        hasLatestBillingMonthData &&
        (!hasPreviousMonthData ||
          periodToIndex(latestBillingPeriod) !== periodToIndex(previousMonthPeriod))
      ) {
        periodsToPersist.push({
          period: latestBillingPeriod,
          section: form.latestBillingMonth,
        });
      }

      for (const { period, section } of periodsToPersist) {
        if (!hasAnyMetricsInSection(section)) {
          continue;
        }

        const ensuredPeriod = await ensurePeriod(
          period,
          "No pudimos crear uno de los periodos historicos.",
        );

        if (ensuredPeriod.status !== "DRAFT") {
          throw new Error(
            `El periodo ${formatPeriodLabel(period)} ya existe y no esta en borrador.`,
          );
        }

        const values = buildMetricPayload(
          section,
          metricDefinitionMap,
          localCurrencyId,
        );

        const valuesResponse = await fetch(
          `/api/student/metrics/periods/${ensuredPeriod.id}/values`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ values }),
          },
        );
        const valuesPayload = await valuesResponse.json();

        if (!valuesResponse.ok) {
          throw new Error(
            valuesPayload.message ?? "No pudimos guardar las metricas iniciales.",
          );
        }

        const submitResponse = await fetch(
          `/api/student/metrics/periods/${ensuredPeriod.id}/submit`,
          {
            method: "POST",
          },
        );
        const submitPayload = await submitResponse.json();

        if (!submitResponse.ok) {
          throw new Error(
            submitPayload.message ?? "No pudimos enviar uno de los meses historicos.",
          );
        }
      }

      const savedPeriodsLabel =
        periodsToPersist.length > 1
          ? "Tus cortes iniciales quedaron cargados."
          : "Tu corte inicial quedo cargado.";

      setSuccess(
        usedAutomaticFill
          ? "Tu perfil y los periodos elegidos quedaron cargados."
          : savedPeriodsLabel,
      );
      router.replace("/student?tab=results");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No pudimos completar tu configuracion inicial.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const activeSection =
    activeMetricsTab === "previousMonth"
      ? form.previousMonth
      : form.latestBillingMonth;

  const activePeriodLabel =
    activeMetricsTab === "previousMonth"
      ? formatPeriodLabel(previousMonthPeriod)
      : formatPeriodLabel(latestBillingPeriod);

  return (
    <form className="student-onboarding-shell" onSubmit={handleSubmit}>
      <section className="student-onboarding-card">
        <div className="student-onboarding-header">
          <div>
            <p className="eyebrow">Paso 2</p>
            <h1>Completa tu configuracion inicial</h1>
            <p>
              Carga tu pais, tu Instagram y el primer mes de datos desde el que
              arrancaste la mentoria.
            </p>
          </div>
          <div className="student-onboarding-currency">
            <span>Moneda asignada</span>
            <strong>{formatCurrencyLabel(selectedCurrency)}</strong>
          </div>
        </div>

        <div className="student-onboarding-grid">
          <label className="field login-field-simple">
            <span>Pais</span>
            <select
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              required
            >
              <option value="">Selecciona tu pais</option>
              {supportedCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="field login-field-simple">
            <span>Instagram</span>
            <input
              type="text"
              value={form.instagramHandle}
              onChange={(event) =>
                updateField("instagramHandle", event.target.value)
              }
              placeholder="@tuusuario"
              required
            />
          </label>

          <label className="field login-field-simple">
            <span>Mes de inicio de mentoria</span>
            <select
              value={form.month}
              onChange={(event) => updateField("month", event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field login-field-simple">
            <span>Ano de inicio</span>
            <select
              value={form.year}
              onChange={(event) => updateField("year", event.target.value)}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="student-onboarding-card">
        {shouldCollectLatestBillingMonth ? (
          <div className="student-onboarding-tabs">
            <button
              className={
                activeMetricsTab === "previousMonth"
                  ? "student-onboarding-tab is-active"
                  : "student-onboarding-tab"
              }
              type="button"
              onClick={() => setActiveMetricsTab("previousMonth")}
            >
              Mes previo
              <strong>{formatPeriodLabel(previousMonthPeriod)}</strong>
            </button>
            <button
              className={
                activeMetricsTab === "latestBillingMonth"
                  ? "student-onboarding-tab is-active"
                  : "student-onboarding-tab"
              }
              type="button"
              onClick={() => setActiveMetricsTab("latestBillingMonth")}
            >
              Ultimo mes de facturacion
              <strong>{formatPeriodLabel(latestBillingPeriod)}</strong>
            </button>
          </div>
        ) : null}

        <div className="student-onboarding-period-badge">
          <span>Periodo activo</span>
          <strong>{activePeriodLabel}</strong>
        </div>

        <MetricSection
          title={
            activeMetricsTab === "previousMonth"
              ? "Datos del mes previo a la mentoria"
              : "Datos del ultimo mes de facturacion"
          }
          description={
            activeMetricsTab === "previousMonth"
              ? "Datos del mes anterior al inicio de la mentoria. Este bloque es opcional, salvo que no cargues el otro."
              : "Ultimo corte real de facturacion previo al mes actual. Tambien es opcional si ya cargaste el otro."
          }
          data={activeSection}
          currencySymbol={selectedCurrency?.symbol ?? "$"}
          onChange={(field, value) =>
            updateMetricsField(activeMetricsTab, field, value)
          }
        />

        {canOfferAutomaticFill ? (
          <p className="student-onboarding-helper">
            Si completas ambos meses, al guardar te vamos a preguntar si quieres
            completar automaticamente los meses del medio desde{" "}
            <strong>{formatPeriodLabel(previousMonthPeriod)}</strong> hasta{" "}
            <strong>{formatPeriodLabel(latestBillingPeriod)}</strong>.
          </p>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="student-profile-success">{success}</p> : null}

        <div className="student-onboarding-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Guardando configuracion..." : "Guardar y continuar"}
          </button>
        </div>
      </section>
    </form>
  );
}
