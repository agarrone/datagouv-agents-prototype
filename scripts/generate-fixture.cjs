const fs = require("node:fs/promises");
const path = require("node:path");
const parquet = require("parquetjs-lite");

const rows = [
  ["ds-001", "Comptages vélo 2025", "Ville de Lyon", "Mobilité", 125430, "2025-01-15", 4.8],
  ["ds-002", "Stations de vélos en libre-service", "Métropole de Lille", "Mobilité", 84210, "2025-02-03", 4.5],
  ["ds-003", "Budget primitif 2025", "Ville de Paris", "Économie", 210340, "2025-01-08", 4.7],
  ["ds-004", "Qualité de l’air quotidienne", "Atmo France", "Environnement", 156780, "2025-03-12", 4.9],
  ["ds-005", "Menus des cantines scolaires", "Ville de Nantes", "Alimentation", 45320, "2025-02-21", 4.1],
  ["ds-006", "Bornes de recharge publiques", "Métropole de Lille", "Énergie", 98450, "2025-03-01", 4.6],
  ["ds-007", "Équipements sportifs municipaux", "Ville de Lyon", "Sport", 76540, "2025-01-30", 4.3],
  ["ds-008", "Arbres remarquables", "Ville de Nantes", "Environnement", 62310, "2025-02-14", 4.4],
  ["ds-009", "Subventions aux associations", "Ville de Paris", "Économie", 134520, "2025-03-05", 4.2],
  ["ds-010", "Accidents corporels de la circulation", "Ministère de l’Intérieur", "Sécurité", 287650, "2025-01-19", 4.8],
  ["ds-011", "Lieux de médiation numérique", "ANCT", "Numérique", 39280, "2025-02-27", 4.0],
  ["ds-012", "Production solaire mensuelle", "RTE", "Énergie", 118760, "2025-03-09", 4.7],
];

async function main() {
  const target = path.resolve(
    __dirname,
    "..",
    "public",
    "fixtures",
    "datasets.parquet",
  );
  await fs.mkdir(path.dirname(target), { recursive: true });

  const schema = new parquet.ParquetSchema({
    id: { type: "UTF8" },
    title: { type: "UTF8" },
    organization: { type: "UTF8" },
    theme: { type: "UTF8" },
    views: { type: "INT64" },
    updated_at: { type: "UTF8" },
    quality_score: { type: "DOUBLE" },
  });
  const writer = await parquet.ParquetWriter.openFile(schema, target);

  for (const row of rows) {
    await writer.appendRow({
      id: row[0],
      title: row[1],
      organization: row[2],
      theme: row[3],
      views: row[4],
      updated_at: row[5],
      quality_score: row[6],
    });
  }

  await writer.close();
  const stats = await fs.stat(target);
  console.log(`Fixture écrite dans ${target} (${stats.size} octets).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
