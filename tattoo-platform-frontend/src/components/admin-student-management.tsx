'use client';

import { useDeferredValue, useMemo, useState } from 'react';

type StudentOverview = {
  studentId: string;
  name: string;
  email: string;
  country: string | null;
  latestPeriodMonth: number | null;
  latestPeriodYear: number | null;
  latestRevenue: number | null;
  attentionLevel: string | null;
  revenueHistory: Array<{
    id: string;
    month: number;
    year: number;
    ingresosFacturacion: number | null;
  }>;
};

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function getMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function getStudentOutcome(student: StudentOverview) {
  const firstRevenue =
    student.revenueHistory[student.revenueHistory.length - 1]?.ingresosFacturacion ?? null;
  const latestRevenue = student.revenueHistory[0]?.ingresosFacturacion ?? null;

  if (latestRevenue === null || latestRevenue === 0) {
    return {
      label: 'Sin resultados',
      className: 'student-management-status',
    };
  }

  if (student.attentionLevel === 'RED') {
    return {
      label: 'En riesgo',
      className: 'student-management-status student-management-status-danger',
    };
  }

  if (firstRevenue !== null && firstRevenue > 0 && latestRevenue >= firstRevenue * 1.2) {
    return {
      label: 'Caso de exito',
      className: 'student-management-status student-management-status-success',
    };
  }

  if (student.attentionLevel === 'YELLOW') {
    return {
      label: 'Seguimiento',
      className: 'student-management-status student-management-status-warn',
    };
  }

  return {
    label: 'Activo',
    className: 'student-management-status',
  };
}

function getGrowthLabel(student: StudentOverview) {
  const firstRevenue =
    student.revenueHistory[student.revenueHistory.length - 1]?.ingresosFacturacion ?? null;
  const latestRevenue = student.revenueHistory[0]?.ingresosFacturacion ?? null;

  if (!firstRevenue) {
    return 'N/A';
  }

  return `${Math.round((((latestRevenue ?? 0) - firstRevenue) / firstRevenue) * 100)}%`;
}

export function AdminStudentManagement({
  students,
  initialQuery = '',
  revenueLabel = 'Ingresos',
}: {
  students: StudentOverview[];
  initialQuery?: string;
  revenueLabel?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN'>('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const availableCountries = useMemo(
    () =>
      [...new Set(students.map((student) => student.country?.trim() || 'Sin datos'))].sort(
        (left, right) => left.localeCompare(right, 'es'),
      ),
    [students],
  );
  const filteredStudents = students.filter((student) => {
    const matchesQuery =
      !normalizedQuery ||
      student.name.toLowerCase().includes(normalizedQuery) ||
      student.email.toLowerCase().includes(normalizedQuery) ||
      (student.country ?? '').toLowerCase().includes(normalizedQuery);
    const matchesRisk =
      riskFilter === 'ALL' ? true : (student.attentionLevel ?? 'GREEN') === riskFilter;
    const matchesCountry =
      countryFilter === 'ALL'
        ? true
        : (student.country?.trim() || 'Sin datos') === countryFilter;

    return matchesQuery && matchesRisk && matchesCountry;
  });

  return (
    <section className="student-management-shell">
      <header className="student-management-header">
        <div>
          <h3 className="student-management-title">
            <span className="student-management-title-icon" aria-hidden="true">
              ⌕
            </span>
            <span>Gestion de Alumnos</span>
          </h3>
          <p className="student-management-count">
            {filteredStudents.length} alumno{filteredStudents.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="student-search-bar">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar alumno..."
          autoComplete="off"
        />
        <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as never)}>
          <option value="ALL">Todos los riesgos</option>
          <option value="RED">En riesgo</option>
          <option value="YELLOW">Seguimiento</option>
          <option value="GREEN">Estables</option>
        </select>
        <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
          <option value="ALL">Todas las nacionalidades</option>
          {availableCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div className="student-management-list">
        {filteredStudents.map((student) => {
          const outcome = getStudentOutcome(student);

          return (
            <details
              className="student-management-card student-management-expandable"
              key={student.studentId}
            >
              <summary className="student-management-summary">
                <div>
                  <strong>{student.name}</strong>
                  <p>{student.email}</p>
                  <div className="student-management-meta">
                    <span className={outcome.className}>{outcome.label}</span>
                    <span>{student.country ?? 'Sin datos'}</span>
                  </div>
                </div>
                <div className="student-management-side">
                  {student.latestRevenue !== null ? (
                    <>
                      <strong>{formatCurrency(student.latestRevenue)}</strong>
                      <span>
                        {student.latestPeriodMonth && student.latestPeriodYear
                          ? getMonthLabel(student.latestPeriodMonth, student.latestPeriodYear)
                          : 'Sin datos'}
                      </span>
                    </>
                  ) : (
                    <span className="student-management-empty">Sin resultados</span>
                  )}
                </div>
              </summary>

              {student.revenueHistory.length > 0 ? (
                <div className="student-management-expanded">
                  <div className="student-management-metrics">
                    <div>
                      <span>Primer mes</span>
                      <strong>
                        {formatCurrency(
                          student.revenueHistory[student.revenueHistory.length - 1]
                            ?.ingresosFacturacion ?? 0,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Ultimo {revenueLabel.toLowerCase()}</span>
                      <strong>
                        {formatCurrency(student.revenueHistory[0]?.ingresosFacturacion ?? 0)}
                      </strong>
                    </div>
                    <div>
                      <span>Crecimiento</span>
                      <strong>{getGrowthLabel(student)}</strong>
                    </div>
                  </div>

                  <div className="student-history-list">
                    {student.revenueHistory.map((entry) => (
                      <div className="student-history-row" key={entry.id}>
                        <span>{getMonthLabel(entry.month, entry.year)}</span>
                        <strong>{formatCurrency(entry.ingresosFacturacion)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </details>
          );
        })}
      </div>
    </section>
  );
}
