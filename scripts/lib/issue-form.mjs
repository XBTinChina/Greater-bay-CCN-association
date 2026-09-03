// Parser for the Markdown body that GitHub generates when an issue form is
// submitted. Every field becomes a "### <label>" heading followed by its
// value, up to the next heading; an empty field is rendered as
// "_No response_"; a checkbox group becomes "- [x] label" / "- [ ] label"
// lines (GitHub writes a capital X for ticked boxes).

export const NO_RESPONSE = '_No response_';

const HEADING_RE = /^### (.+?)\s*$/;
const CHECKBOX_RE = /^\s*[-*] \[( |x|X)\] ?(.*)$/;

/**
 * Parse an issue-form body.
 *
 * @param {string} body The issue body as delivered in the event payload.
 * @param {Iterable<string>} [knownLabels] When given, only these headings
 *   start a new field. Any other "### " line, for instance a heading inside a
 *   free-text abstract, stays part of the current value. Without it every
 *   "### " heading counts as a field.
 * @returns {Map<string, string>} label -> value ('' for an empty field).
 */
export function parseIssueForm(body, knownLabels) {
  const known = knownLabels ? new Set(Array.from(knownLabels, (l) => l.trim())) : null;
  const sections = new Map();
  let current = null;
  let lines = [];

  const flush = () => {
    if (current === null) return;
    sections.set(current, cleanValue(lines.join('\n')));
  };

  for (const line of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const m = HEADING_RE.exec(line);
    if (m && (!known || known.has(m[1].trim()))) {
      flush();
      current = m[1].trim();
      lines = [];
      continue;
    }
    if (current !== null) lines.push(line);
  }
  flush();
  return sections;
}

function cleanValue(text) {
  const trimmed = text.replace(/^\s*\n/, '').replace(/\s+$/, '');
  return trimmed.trim() === NO_RESPONSE ? '' : trimmed;
}

/**
 * Read a checkbox group value.
 * @param {string} value The raw value of a checkboxes field.
 * @returns {{ label: string, checked: boolean }[]} in the order written.
 */
export function parseCheckboxes(value) {
  const boxes = [];
  for (const line of String(value ?? '').split('\n')) {
    const m = CHECKBOX_RE.exec(line);
    if (m) boxes.push({ label: m[2].trim(), checked: m[1] !== ' ' });
  }
  return boxes;
}
