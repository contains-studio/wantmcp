/**
 * Where "Email me about new features" must start unticked.
 *
 * In the EU and the EEA (GDPR with the ePrivacy Directive), the UK (UK GDPR with PECR) and Switzerland (revFADP), a
 * pre-ticked box is not valid consent to marketing email: the person has to tick it themselves. Everywhere else the
 * owner's choice applies and it starts ticked. Country codes are ISO 3166-1 alpha-2, as Cloudflare reports them.
 */
const OPT_IN_REQUIRED = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA outside the EU
  "IS", "LI", "NO",
  // UK and Switzerland
  "GB", "CH",
]);

/** Whether the box starts ticked for a visitor from `country` (unknown, as in local dev and tests: ticked). */
export function updatesOptInDefault(country: string | null | undefined): boolean {
  return !(country && OPT_IN_REQUIRED.has(country.toUpperCase()));
}
