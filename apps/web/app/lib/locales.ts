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

/** The usual currency for each country above: a starting guess only. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  GB: "GBP", IE: "EUR", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", FI: "EUR", PL: "PLN", PT: "EUR", JP: "JPY", IN: "INR", SG: "SGD", ZA: "ZAR",
};

export const BIO_PLACEHOLDER = "US, dollars. Size M shirts, size 9 shoes. Refurbished is fine. Ship to my ZIP code only.";
