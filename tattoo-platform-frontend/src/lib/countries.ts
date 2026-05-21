export const supportedCountries = [
  "Argentina",
  "Chile",
  "Colombia",
  "Mexico",
  "Peru",
  "Uruguay",
  "Brasil",
  "Estados Unidos",
  "España",
] as const;

export const supportedTimezones = [
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Montevideo",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Madrid",
] as const;

export const countryPhonePrefixes = [
  { country: "Argentina", prefix: "+54" },
  { country: "Chile", prefix: "+56" },
  { country: "Colombia", prefix: "+57" },
  { country: "Mexico", prefix: "+52" },
  { country: "Peru", prefix: "+51" },
  { country: "Uruguay", prefix: "+598" },
  { country: "Brasil", prefix: "+55" },
  { country: "Estados Unidos", prefix: "+1" },
  { country: "España", prefix: "+34" },
] as const;

const countryCurrencyCodeByName: Record<string, string> = {
  argentina: "ARS",
  chile: "CLP",
  colombia: "COP",
  mexico: "MXN",
  peru: "PEN",
  uruguay: "UYU",
  brasil: "BRL",
  brazil: "BRL",
  "estados unidos": "USD",
  "united states": "USD",
  usa: "USD",
  espana: "EUR",
  spain: "EUR",
};

const countryTimezoneByName: Record<string, string> = {
  argentina: "America/Argentina/Buenos_Aires",
  chile: "America/Santiago",
  colombia: "America/Bogota",
  mexico: "America/Mexico_City",
  peru: "America/Lima",
  uruguay: "America/Montevideo",
  brasil: "America/Sao_Paulo",
  brazil: "America/Sao_Paulo",
  "estados unidos": "America/New_York",
  "united states": "America/New_York",
  usa: "America/New_York",
  espana: "Europe/Madrid",
  spain: "Europe/Madrid",
};

const countryPhonePrefixByName: Record<string, string> =
  Object.fromEntries(
    countryPhonePrefixes.flatMap(({ country, prefix }) => [
      [normalizeCountryName(country), prefix],
    ]),
  );

export function normalizeCountryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getCurrencyCodeForCountry(country: string | null | undefined) {
  if (!country) {
    return null;
  }

  return countryCurrencyCodeByName[normalizeCountryName(country)] ?? null;
}

export function getTimezoneForCountry(country: string | null | undefined) {
  if (!country) {
    return null;
  }

  return countryTimezoneByName[normalizeCountryName(country)] ?? null;
}

export function getPhonePrefixForCountry(country: string | null | undefined) {
  if (!country) {
    return null;
  }

  return countryPhonePrefixByName[normalizeCountryName(country)] ?? null;
}
