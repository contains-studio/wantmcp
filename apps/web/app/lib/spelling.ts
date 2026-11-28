/**
 * The site writes US English. British spellings that must not appear in anything a person reads, each with its US
 * form, for spelling.test.ts (the app's own words) and personas.test.ts (the sample lists).
 */
/** British spellings, and the US one each should be. */
export const UK_SPELLINGS: Array<[RegExp, string]> = [
  [/\bcancell(ed|ing)\b/i, "canceled, canceling"],
  [/\bcolour(ed|s|ful)?\b/i, "color"],
  [/\bfavourite/i, "favorite"],
  [/\bbehaviour/i, "behavior"],
  [/\bcentre(s|d)?\b/i, "center, centered"],
  [/\bmetres?\b|\blitres?\b/i, "meter, liter"],
  [/\bgrey\b/i, "gray"],
  [/\b(organis|recognis|summaris|realis|apologis|prioritis|customis|personalis|minimis|authoris|categoris|emphasis)(e|ed|es|ing|ation)\b/i, "-ize"],
  [/\boptimis(e|ed|es|ing|ation)\b/i, "optimize"],
  [/\banalys(e|ed|es|ing)\b/i, "analyze"],
  [/\b(travell|labell|modell)(ed|ing|er)\b/i, "single l"],
  [/\bcatalogue(s|d)?\b/i, "catalog"],
  [/\bprogramme(s)?\b/i, "program"],
  [/\bjudgement\b/i, "judgment"],
  [/\bjewellery\b/i, "jewelry"],
  [/\bcheque/i, "check"],
  [/\baluminium\b/i, "aluminum"],
  [/\bdefence\b/i, "defense"],
  [/\blicence\b/i, "license"],
  [/\bwhilst\b|\bamongst\b/i, "while, among"],
  [/\blearnt\b|\bspelt\b/i, "learned, spelled"],
];

