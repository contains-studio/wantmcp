/** The suite needs the mock API: its seeded demo list exists only there. */
export default async function globalSetup() {
  const res = await fetch(`http://localhost:${process.env.E2E_PORT ?? 5190}/l/lst_desk2026`);
  if (res.status !== 200) throw new Error("e2e tests need API_BASE_URL=mock in apps/web/.dev.vars (see .dev.vars.example)");
}
