// Create .dev.vars from the example on first run so `pnpm dev` works out of the box.
import { copyFileSync, existsSync } from "node:fs";

if (!existsSync(".dev.vars")) {
  copyFileSync(".dev.vars.example", ".dev.vars");
  console.log("Created .dev.vars from .dev.vars.example (API_BASE_URL=mock).");
}
