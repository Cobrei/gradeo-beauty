import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, rawSql } from "./client";

async function main() {
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("migrations aplicadas");
  await rawSql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
