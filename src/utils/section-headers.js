export function extractHeaders(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^##\s+(.*)$/))
    .filter(Boolean)
    .map((m) => m[1].trim());
}
