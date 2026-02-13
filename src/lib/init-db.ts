import { migrateDatabase } from "./db";

let migrated = false;

export async function ensureDatabase(): Promise<void> {
  if (migrated) return;
  await migrateDatabase();
  migrated = true;
}
