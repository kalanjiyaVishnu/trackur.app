/**
 * Flattens markdown to plain text for one-or-two-line previews (job cards).
 *
 * This is deliberately not a parser — it strips the syntax markers that would
 * otherwise show up as literal `**` or `##` in a truncated preview. Anywhere
 * markdown is actually displayed, render it with MarkdownContent instead.
 */
export function markdownToPreview(value) {
  if (!value) return '';
  return String(value)
    // Fenced code blocks → keep the code, drop the fences
    .replace(/```[^\n]*\n?/g, '')
    .replace(/~~~[^\n]*\n?/g, '')
    // Images → alt text, links → label
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Headings, blockquotes, list bullets at line start
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Horizontal rules
    .replace(/^\s*([-*_])\s*(?:\1\s*){2,}$/gm, '')
    // Emphasis / strikethrough / inline code markers
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Table pipes and separator rows
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, '')
    .replace(/\s*\|\s*/g, ' ')
    // Collapse the whitespace left behind
    .replace(/\s+/g, ' ')
    .trim();
}
