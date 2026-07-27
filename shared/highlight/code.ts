import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);

const languageAliases: Record<string, string> = {
  css: "css",
  html: "xml",
  js: "javascript",
  javascript: "javascript",
  json: "json",
  jsx: "javascript",
  md: "plaintext",
  plaintext: "plaintext",
  sh: "bash",
  shell: "bash",
  sql: "sql",
  text: "plaintext",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  vue: "xml",
  xml: "xml",
};

export function normalizeCodeLanguage(language?: string) {
  if (!language) return "plaintext";
  return languageAliases[language.trim().toLowerCase()] ?? "plaintext";
}

export function highlightCode(code: string, language?: string) {
  const normalizedLanguage = normalizeCodeLanguage(language);
  return hljs.highlight(code, {
    language: normalizedLanguage,
    ignoreIllegals: true,
  }).value;
}
