import React from 'react';
import { createRoot } from 'react-dom/client';
import { StudentResultsPanel } from '../../../tattoo-platform-frontend/src/components/student-results-panel';
const scenario = new URLSearchParams(location.search).get('scenario') || 'recent';
const days = 24 * 60 * 60 * 1000;
const date = new Date();
const period = {
  id: 'preview-period', month: date.getMonth() + 1, year: date.getFullYear(),
  status: 'CLOSED', editDeadline: new Date(Date.now() + (scenario === 'expired' ? -1 : 12) * days).toISOString(),
  metricsCount: 16, ingresosFacturacion: 1500000, cantidadTotalTatuajes: 15,
  comisionEstudioPorcentaje: 20, gastosDelMes: 150000, balanceGeneral: 1050000,
  consultasMensuales: 42, cierresDelMes: 15,
};
(window as any).previewRequests = [];
window.fetch = async (input, init) => {
  (window as any).previewRequests.push({ url: String(input), method: init?.method || 'GET', body: init?.body });
  if ((window as any).rejectSave && String(input).endsWith('/values')) {
    return new Response(JSON.stringify({ message: 'El plazo de 15 días para editar este mes ya terminó.' }), { status: 409 });
  }
  return new Response(JSON.stringify({ id: 'preview-period' }), { status: 200 });
};
createRoot(document.getElementById('root')!).render(<StudentResultsPanel
  evolution={scenario === 'new' ? [] : [period as any]}
  localCurrency={{ id: 'ars', code: 'ARS', symbol: '$' }}
  metricDefinitions={[{ id: 'revenue', slug: 'ingresos-facturacion', valueType: 'CURRENCY' }]}
/>);
