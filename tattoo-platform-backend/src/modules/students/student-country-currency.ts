export const STUDENT_COUNTRY_CURRENCY_BY_NAME: Record<string, string> = {
  argentina: 'ARS',
  chile: 'CLP',
  colombia: 'COP',
  'costa rica': 'CRC',
  ecuador: 'USD',
  mexico: 'MXN',
  panama: 'USD',
  peru: 'PEN',
  uruguay: 'UYU',
  brasil: 'BRL',
  brazil: 'BRL',
  'estados unidos': 'USD',
  'united states': 'USD',
  usa: 'USD',
  espana: 'EUR',
  spain: 'EUR',
};

export const STUDENT_COUNTRY_TIMEZONE_BY_NAME: Record<string, string> = {
  argentina: 'America/Argentina/Buenos_Aires',
  chile: 'America/Santiago',
  colombia: 'America/Bogota',
  'costa rica': 'America/Costa_Rica',
  ecuador: 'America/Guayaquil',
  mexico: 'America/Mexico_City',
  panama: 'America/Panama',
  peru: 'America/Lima',
  uruguay: 'America/Montevideo',
  brasil: 'America/Sao_Paulo',
  brazil: 'America/Sao_Paulo',
  'estados unidos': 'America/New_York',
  'united states': 'America/New_York',
  usa: 'America/New_York',
  espana: 'Europe/Madrid',
  spain: 'Europe/Madrid',
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

export function getTimezoneForCountry(country: string | null | undefined) {
  if (!country) {
    return null;
  }

  return (
    STUDENT_COUNTRY_TIMEZONE_BY_NAME[normalizeCountryName(country)] ?? null
  );
}
