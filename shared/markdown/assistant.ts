import MarkdownIt from "markdown-it";
import { highlightCode } from "../highlight/code";

const markdown = new MarkdownIt({
  breaks: false,
  html: false,
  linkify: true,
  typographer: true,
  highlight: (code, language) => highlightCode(code, language),
});

const defaultLinkOpen = markdown.renderer.rules.link_open
  ?? ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  tokens[index]?.attrSet("target", "_blank");
  tokens[index]?.attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

markdown.renderer.rules.table_open = () => '<div class="agent-markdown-table"><table>';
markdown.renderer.rules.table_close = () => "</table></div>";

function completeStreamingMarkdown(content: string) {
  let completed = content;
  const fences = completed.match(/^```/gm)?.length ?? 0;
  if (fences % 2 !== 0) completed += "\n```";

  const strongMarkers = completed.match(/(?<!\\)\*\*/g)?.length ?? 0;
  if (strongMarkers % 2 !== 0) completed += "**";

  const lines = completed.split("\n");
  const lastNonEmptyIndex = lines.findLastIndex(line => line.trim().length > 0);
  if (lastNonEmptyIndex >= 0) {
    const lastLine = lines[lastNonEmptyIndex]!;
    const previousLine = lines[lastNonEmptyIndex - 1];
    const looksLikeTableHeader = lastLine.includes("|")
      && (!previousLine || !/^\s*\|?\s*:?-{3,}/.test(previousLine));
    if (looksLikeTableHeader) {
      lines.splice(lastNonEmptyIndex, 1);
      completed = lines.join("\n").trimEnd();
    }
  }
  return completed;
}

export function renderAssistantMarkdown(content: string, streaming = false) {
  const normalized = content.replace(/\r\n?/g, "\n").trim();
  return markdown.render(streaming ? completeStreamingMarkdown(normalized) : normalized);
}
