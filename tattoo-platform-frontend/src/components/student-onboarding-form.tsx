'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { getCurrencyCodeForCountry, supportedCountries } from '@/lib/countries';

type Currency = {
  id: string;
  code: string;
  symbol: string | null;
};

type MetricDefinition = {
  id: string;
  slug: string;
  valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
};

type StudentProfileData = {
  country: string | null;
  instagramHandle: string | null;
  localCurrency: Currency | null;
};

type OnboardingFormState = {
  month: string;
  year: string;
  country: string;
  instagramHandle: string;
  balanceGeneral: string;
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
};

const monthOptions = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i);

function getPreviousMonthPeriod(month: string, year: string): { month: number; year: number } {
  const m = Number(month);
  const y = Number(year);
  if (m === 1) {
    return { month: 12, year: y - 1 };
  }
  return { month: m - 1, year: y };
}

function buildInitialState(profile: StudentProfileData): OnboardingFormState {
  const now = new Date();

  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    country: profile.country ?? '',
    instagramHandle: profile.instagramHandle ?? '',
    balanceGeneral: '',
    ingresosFacturacion: '',
    cantidadTotalTatuajes: '',
    comisionEstudioPorcentaje: '',
    gastosDelMes: '',
    seguidoresInstagramActuales: '',
    consultasMensuales: '',
    conversacionesANuevos: '',
    cotizaciones: '',
    cierresDelMes: '',
    cierresNuevosClientes: '',
    cierresPorRecomendaciones: '',
    cierresRecurrentes: '',
  };
}

function toNumber(value: string): number {
  if (!value.trim()) return 0;
  const normalized = value.replace(',', '.');
  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}

function formatCurrencyLabel(currency: Currency | null) {
  if (!currency) {
    return 'Sin moneda asignada';
  }

  return `${currency.code}${currency.symbol ? ` (${currency.symbol})` : ''}`;
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
  const [form, setForm] = useState<OnboardingFormState>(buildInitialState(profile));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const metricDefinitionMap = useMemo(
    () => Object.fromEntries(metricDefinitions.map((definition) => [definition.slug, definition])),
    [metricDefinitions],
  );

  const selectedCurrency = useMemo(() => {
    const currencyCode = getCurrencyCodeForCountry(form.country);

    if (!currencyCode) {
      return profile.localCurrency;
    }

    return currencies.find((currency) => currency.code === currencyCode) ?? profile.localCurrency;
  }, [currencies, form.country, profile.localCurrency]);

  function updateField(field: keyof OnboardingFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      if (!form.country) {
        throw new Error('Selecciona tu pais.');
      }

      if (!form.instagramHandle.trim()) {
        throw new Error('Ingresa tu Instagram.');
      }

      if (!selectedCurrency) {
        throw new Error('No pudimos resolver tu moneda local para ese pais.');
      }

      const localCurrencyId = selectedCurrency.id;

      const profileResponse = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: form.country,
          instagramHandle: form.instagramHandle.trim().replace(/^@/, ''),
          localCurrencyId: localCurrencyId || undefined,
        }),
      });

      const profilePayload = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profilePayload.message ?? 'No pudimos guardar tu perfil inicial.');
      }

      const basePeriod = getPreviousMonthPeriod(form.month, form.year);

      let periodId: string | null = null;
      const periodResponse = await fetch('/api/student/metrics/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: basePeriod.month,
          year: basePeriod.year,
        }),
      });

      const periodPayload = await periodResponse.json();

      if (periodResponse.ok) {
        periodId = periodPayload.id ?? null;
      } else {
        const existingPeriodsResponse = await fetch(
          `/api/student/metrics/periods?month=${basePeriod.month}&year=${basePeriod.year}`,
          { cache: 'no-store' },
        );
        const existingPeriodsPayload = await existingPeriodsResponse.json();

        if (
          !existingPeriodsResponse.ok ||
          !Array.isArray(existingPeriodsPayload) ||
          !existingPeriodsPayload[0]?.id
        ) {
          throw new Error(periodPayload.message ?? 'No pudimos crear el periodo inicial.');
        }

        periodId = existingPeriodsPayload[0].id;
      }

      if (!periodId) {
        throw new Error('No pudimos identificar el periodo inicial.');
      }

      const comisionCalculada = Number(
        ((toNumber(form.ingresosFacturacion) * toNumber(form.comisionEstudioPorcentaje)) / 100).toFixed(2),
      );

      const metricEntries: Array<[string, string]> = [
        ['balance-general', form.balanceGeneral],
        ['ingresos-facturacion', form.ingresosFacturacion],
        ['cantidad-total-tatuajes', form.cantidadTotalTatuajes],
        ['comision-estudio-porcentaje', form.comisionEstudioPorcentaje],
        ['comision-estudio', String(comisionCalculada)],
        ['gastos-del-mes', form.gastosDelMes],
        ['seguidores-instagram-actuales', form.seguidoresInstagramActuales],
        ['consultas-mensuales', form.consultasMensuales],
        ['conversaciones-a-nuevos', form.conversacionesANuevos],
        ['cotizaciones', form.cotizaciones],
        ['cierres-del-mes', form.cierresDelMes],
        ['cierres-nuevos-clientes', form.cierresNuevosClientes],
        ['cierres-por-recomendaciones', form.cierresPorRecomendaciones],
        ['cierres-recurrentes', form.cierresRecurrentes],
      ];

      const values: Array<Record<string, string | number | null | undefined>> = [];

      for (const [slug, rawValue] of metricEntries) {
        const definition = metricDefinitionMap[slug];

        if (!definition) {
          continue;
        }

        if (definition.valueType === 'CURRENCY') {
          values.push({
            metricDefinitionId: definition.id,
            originalAmount: toNumber(rawValue),
            originalCurrencyId: localCurrencyId || undefined,
          });
          continue;
        }

        values.push({
          metricDefinitionId: definition.id,
          numberValue: toNumber(rawValue),
        });
      }

      const valuesResponse = await fetch(`/api/student/metrics/periods/${periodId}/values`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      const valuesPayload = await valuesResponse.json();

      if (!valuesResponse.ok) {
        throw new Error(valuesPayload.message ?? 'No pudimos guardar tus metricas iniciales.');
      }

      const submitResponse = await fetch(`/api/student/metrics/periods/${periodId}/submit`, {
        method: 'POST',
      });
      const submitPayload = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(submitPayload.message ?? 'No pudimos enviar tu primer periodo.');
      }

      setSuccess('Tu perfil inicial y tu primer mes quedaron cargados.');
      router.replace('/student?tab=results');
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'No pudimos completar tu configuracion inicial.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="student-onboarding-shell" onSubmit={handleSubmit}>
      <section className="student-onboarding-card">
        <div className="student-onboarding-header">
          <div>
            <p className="eyebrow">Paso 2</p>
            <h1>Completa tu configuracion inicial</h1>
            <p>
              Carga tu pais, tu Instagram y el primer mes de datos desde el que arrancaste la
              mentoria.
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
              onChange={(event) => updateField('country', event.target.value)}
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
              onChange={(event) => updateField('instagramHandle', event.target.value)}
              placeholder="@tuusuario"
              required
            />
          </label>

          <label className="field login-field-simple">
            <span>Mes de inicio de mentoria</span>
            <select value={form.month} onChange={(event) => updateField('month', event.target.value)}>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field login-field-simple">
            <span>Año de inicio</span>
            <select value={form.year} onChange={(event) => updateField('year', event.target.value)}>
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
        <div className="student-onboarding-section-head">
          <h2>Datos del mes previo a la mentoria</h2>
          <p>Datos del mes anterior al inicio de la mentoria, para tener una base de comparación.</p>
        </div>

        <article className="student-form-card">
          <h4>Balance General</h4>
          <div className="student-form-grid">
            <label>
              <span>Ingresos totales del mes</span>
              <div className="student-form-money-field">
                <span>{selectedCurrency?.symbol ?? '$'}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.balanceGeneral}
                  onChange={(event) => updateField('balanceGeneral', event.target.value)}
                />
              </div>
            </label>
            <label>
              <span>Facturacion</span>
              <div className="student-form-money-field">
                <span>{selectedCurrency?.symbol ?? '$'}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.ingresosFacturacion}
                  onChange={(event) => updateField('ingresosFacturacion', event.target.value)}
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
                onChange={(event) => updateField('cantidadTotalTatuajes', event.target.value)}
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
                onChange={(event) => updateField('comisionEstudioPorcentaje', event.target.value)}
              />
            </label>
            <label>
              <span>Gastos del mes</span>
              <div className="student-form-money-field">
                <span>{selectedCurrency?.symbol ?? '$'}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.gastosDelMes}
                  onChange={(event) => updateField('gastosDelMes', event.target.value)}
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
                onChange={(event) => updateField('seguidoresInstagramActuales', event.target.value)}
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
                onChange={(event) => updateField('consultasMensuales', event.target.value)}
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
                onChange={(event) => updateField('conversacionesANuevos', event.target.value)}
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
                onChange={(event) => updateField('cotizaciones', event.target.value)}
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
                onChange={(event) => updateField('cierresDelMes', event.target.value)}
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
                onChange={(event) => updateField('cierresNuevosClientes', event.target.value)}
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
                onChange={(event) => updateField('cierresPorRecomendaciones', event.target.value)}
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
                onChange={(event) => updateField('cierresRecurrentes', event.target.value)}
              />
            </label>
          </div>
        </article>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="student-profile-success">{success}</p> : null}

        <div className="student-onboarding-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando configuracion...' : 'Guardar y continuar'}
          </button>
        </div>
      </section>
    </form>
  );
}
