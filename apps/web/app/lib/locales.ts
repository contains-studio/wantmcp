/** Country and currency choices for the bio (SPEC 12.2). ISO 3166-1 alpha-2 and ISO 4217 codes. */
export const COUNTRIES: Array<[code: string, name: string]> = [
  ["GB", "United Kingdom"], ["IE", "Ireland"], ["US", "United States"], ["CA", "Canada"], ["AU", "Australia"], ["NZ", "New Zealand"],
  ["DE", "Germany"], ["FR", "France"], ["ES", "Spain"], ["IT", "Italy"], ["NL", "Netherlands"], ["BE", "Belgium"], ["AT", "Austria"],
  ["CH", "Switzerland"], ["SE", "Sweden"], ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"], ["PL", "Poland"], ["PT", "Portugal"],
  ["JP", "Japan"], ["IN", "India"], ["SG", "Singapore"], ["ZA", "South Africa"],
];

export const CURRENCIES: Array<[code: string, name: string]> = [
  ["GBP", "Pounds (GBP)"], ["EUR", "Euros (EUR)"], ["USD", "US dollars (USD)"], ["CAD", "Canadian dollars (CAD)"], ["AUD", "Australian dollars (AUD)"],
  ["NZD", "New Zealand dollars (NZD)"], ["CHF", "Swiss francs (CHF)"], ["SEK", "Swedish kronor (SEK)"], ["NOK", "Norwegian kroner (NOK)"],
  ["DKK", "Danish kroner (DKK)"], ["PLN", "Złoty (PLN)"], ["JPY", "Yen (JPY)"], ["INR", "Rupees (INR)"], ["SGD", "Singapore dollars (SGD)"], ["ZAR", "Rand (ZAR)"],
];

export const BIO_PLACEHOLDER = "UK, pounds. Size M tops, UK 9 shoes. Prefer refurbished. No Amazon.";
