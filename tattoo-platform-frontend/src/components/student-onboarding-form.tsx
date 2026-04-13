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

function buildInitialState(profile: StudentProfileData): OnboardingFormState {
  const now = new Date();

  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    country: profile.country ?? '',
    instagramHandle: profile.instagramHandle ?? '',
    balanceGeneral: '0',
    ingresosFacturacion: '0',
    cantidadTotalTatuajes: '0',
    comisionEstudioPorcentaje: '0',
    gastosDelMes: '0',
    seguidoresInstagramActuales: '0',
    consultasMensuales: '0',
    conversacionesANuevos: '0',
    cotizaciones: '0',
    cierresDelMes: '0',
    cierresNuevosClientes: '0',
    cierresPorRecomendaciones: '0',
    cierresRecurrentes: '0',
  };
}

function toNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  return Number(value);
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

    return (
      currencies.find((currency) => currency.code === currencyCode) ??
      profile.localCurrency
    );
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

      let periodId: string | null = null;
      const periodResponse = await fetch('/api/student/metrics/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: Number(form.month),
          year: Number(form.year),
        }),
      });

      const periodPayload = await periodResponse.json();

      if (periodResponse.ok) {
        periodId = periodPayload.id ?? null;
      } else {
        const existingPeriodsResponse = await fetch(
          `/api/student/metrics/periods?month=${form.month}&year=${form.year}`,
          { cache: 'no-store' },
        );
        const existingPeriodsPayload = await existingPeriodsResponse.json();

        if (!existingPeriodsResponse.ok || !Array.isArray(existingPeriodsPayload) || !existingPeriodsPayload[0]?.id) {
          throw new Error(periodPayload.message ?? 'No pudimos crear el periodo inicial.');
        }

        periodId = existingPeriodsPayload[0].id;
      }

      if (!periodId) {
        throw new Error('No pudimos identificar el periodo inicial.');
      }

      const metricEntries: Array<[string, string]> = [
        ['balance-general', form.balanceGeneral],
        ['ingresos-facturacion', form.ingresosFacturacion],
        ['cantidad-total-tatuajes', form.cantidadTotalTatuajes],
        ['comision-estudio-porcentaje', form.comisionEstudioPorcentaje],
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
            <span>Mes de inicio</span>
            <select value={form.month} onChange={(event) => updateField('month', event.target.value)}>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field login-field-simple">
            <span>Anio</span>
            <input
              type="number"
              min="2020"
              max="2100"
              value={form.year}
              onChange={(event) => updateField('year', event.target.value)}
              required
            />
          </label>
        </div>
      </section>

      <section className="student-onboarding-card">
        <div className="student-onboarding-section-head">
          <h2>Primer mes de datos</h2>
          <p>Usa los mismos campos que luego vas a completar cada mes.</p>
        </div>

        <div className="student-onboarding-metrics-grid">
          <label className="field login-field-simple">
            <span>Balance general</span>
            <input value={form.balanceGeneral} onChange={(event) => updateField('balanceGeneral', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Ingresos facturacion</span>
            <input value={form.ingresosFacturacion} onChange={(event) => updateField('ingresosFacturacion', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Cantidad total tatuajes</span>
            <input value={form.cantidadTotalTatuajes} onChange={(event) => updateField('cantidadTotalTatuajes', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Comision estudio %</span>
            <input value={form.comisionEstudioPorcentaje} onChange={(event) => updateField('comisionEstudioPorcentaje', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Gastos del mes</span>
            <input value={form.gastosDelMes} onChange={(event) => updateField('gastosDelMes', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Seguidores Instagram actuales</span>
            <input value={form.seguidoresInstagramActuales} onChange={(event) => updateField('seguidoresInstagramActuales', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Consultas mensuales</span>
            <input value={form.consultasMensuales} onChange={(event) => updateField('consultasMensuales', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Conversaciones a nuevos</span>
            <input value={form.conversacionesANuevos} onChange={(event) => updateField('conversacionesANuevos', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Cotizaciones</span>
            <input value={form.cotizaciones} onChange={(event) => updateField('cotizaciones', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Cierres del mes</span>
            <input value={form.cierresDelMes} onChange={(event) => updateField('cierresDelMes', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Cierres nuevos clientes</span>
            <input value={form.cierresNuevosClientes} onChange={(event) => updateField('cierresNuevosClientes', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Cierres por recomendaciones</span>
            <input value={form.cierresPorRecomendaciones} onChange={(event) => updateField('cierresPorRecomendaciones', event.target.value)} />
          </label>
          <label className="field login-field-simple">
            <span>Cierres recurrentes</span>
            <input value={form.cierresRecurrentes} onChange={(event) => updateField('cierresRecurrentes', event.target.value)} />
          </label>
        </div>

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
