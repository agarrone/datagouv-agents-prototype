import { describe, expect, it } from "vitest";
import { renderAssistantMarkdown } from "../shared/markdown/assistant";

describe("renderAssistantMarkdown", () => {
  it("n’ajoute pas de saut HTML pour un simple retour à la ligne", () => {
    const html = renderAssistantMarkdown("Une phrase\nqui continue.");

    expect(html).toContain("Une phrase\nqui continue.");
    expect(html).not.toContain("<br>");
  });

  it("rend les titres, listes et tableaux", () => {
    const html = renderAssistantMarkdown(`## Résultat

- Première ligne
- Deuxième ligne

| Nom | Valeur |
| --- | ---: |
| A | 12 |`);

    expect(html).toContain("<h2>Résultat</h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain('class="agent-markdown-table"');
    expect(html).toContain("<table>");
  });

  it("ferme temporairement un marqueur gras pendant le streaming", () => {
    const html = renderAssistantMarkdown("Voici un **résultat", true);

    expect(html).toContain("<strong>résultat</strong>");
    expect(html).not.toContain("**");
  });

  it("conserve le HTML brut sous forme de texte", () => {
    const html = renderAssistantMarkdown("<script>alert('test')</script>");

    expect(html).toContain("&lt;");
    expect(html).toContain("script");
    expect(html).toContain("&gt;");
    expect(html).not.toContain("<script>");
  });

  it("colore les blocs SQL balisés", () => {
    const html = renderAssistantMarkdown("```sql\nSELECT title FROM data WHERE views > 100;\n```");

    expect(html).toContain("language-sql");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("hljs-number");
  });

  it("échappe le code avant d’appliquer la coloration", () => {
    const html = renderAssistantMarkdown("```html\n<script>alert('test')</script>\n```");

    expect(html).toContain("&lt;");
    expect(html).toContain("script");
    expect(html).toContain("&gt;");
    expect(html).not.toContain("<script>");
  });
});
