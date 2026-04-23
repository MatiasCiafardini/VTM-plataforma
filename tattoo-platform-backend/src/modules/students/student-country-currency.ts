export const STUDENT_COUNTRY_CURRENCY_BY_NAME: Record<string, string> = {
  argentina: 'ARS',
  chile: 'CLP',
  colombia: 'COP',
  mexico: 'MXN',
  méxico: 'MXN',
  peru: 'PEN',
  perú: 'PEN',
  uruguay: 'UYU',
  brasil: 'BRL',
  brazil: 'BRL',
  'estados unidos': 'USD',
  'united states': 'USD',
  usa: 'USD',
  espana: 'EUR',
  españa: 'EUR',
  spain: 'EUR',
};

export function normalizeCountryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getCurrencyCodeForCountry(country: string | null | undefined) {
  if (!country) {
    return null;
  }

  return (
    STUDENT_COUNTRY_CURRENCY_BY_NAME[normalizeCountryName(country)] ?? null
  );
}
