import type { DatasetColumn } from "../types/exploration";

const fixedQuestions = [
  "Explique-moi ton fonctionnement",
  "Explique-moi le contenu de ce jeu de données",
  "Quelles sont les colonnes de ce jeu de données ?",
];

function isTextual(column: DatasetColumn) {
  return /(?:CHAR|TEXT|STRING|VARCHAR|ENUM|BOOLEAN)/i.test(column.type);
}

function isNumeric(column: DatasetColumn) {
  return /(?:TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|DECIMAL|NUMERIC|DOUBLE|FLOAT|REAL|UBIGINT|UINTEGER)/i.test(column.type);
}

function isTemporal(column: DatasetColumn) {
  return /(?:DATE|TIME|TIMESTAMP|INTERVAL)/i.test(column.type);
}

function isUsefulDimension(column: DatasetColumn) {
  return isTextual(column)
    && !/(?:^id$|(?:^|[._-])id$|url|uri|description|comment|adresse|address|geometry|geojson|wkt)/i.test(column.name);
}

function isUsefulMeasure(column: DatasetColumn) {
  return isNumeric(column)
    && !/(?:^id$|(?:^|[._-])id$|code|year|annee|année|latitude|longitude|\blat\b|\blon\b|\blng\b)/i.test(column.name);
}

export function getStarterQuestions(columns: readonly DatasetColumn[]) {
  const dimensions = columns.filter(isUsefulDimension);
  const measure = columns.find(isUsefulMeasure);
  const date = columns.find(isTemporal);

  const automaticQuestions = [
    dimensions[0]
      ? `Quelles sont les valeurs les plus fréquentes de « ${dimensions[0].name} » ?`
      : "Quelles sont les valeurs les plus fréquentes dans ce jeu de données ?",
    measure
      ? `Comment se répartissent les valeurs de « ${measure.name} » ?`
      : date
        ? `Comment les données évoluent-elles selon « ${date.name} » ?`
        : dimensions[1]
          ? `Quelles sont les valeurs les plus fréquentes de « ${dimensions[1].name} » ?`
          : "Quelles tendances principales peut-on observer dans ces données ?",
  ];

  return [...fixedQuestions, ...automaticQuestions];
}
