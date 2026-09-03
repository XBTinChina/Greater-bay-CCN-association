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
  const lines = String(body ?? '').replace(/\r\n?/g, '\n').split('\n');
  const headingAt = lines.map((line) => {
    const m = HEADING_RE.exec(line);
    return m ? m[1].trim() : null;
  });
  const sections = new Map();

  if (!knownLabels) {
    // Every heading starts a field; a repeated heading's last occurrence wins.
    let current = null;
    let start = 0;
    const flush = (end) => {
      if (current !== null) sections.set(current, cleanValue(lines.slice(start, end).join('\n')));
    };
    for (let i = 0; i < lines.length; i += 1) {
      if (headingAt[i] !== null) {
        flush(i);
        current = headingAt[i];
        start = i + 1;
      }
    }
    flush(lines.length);
    return sections;
  }

  // GitHub writes exactly one heading per field, in template order. Any other
  // "### " line was typed by the submitter inside a textarea and must stay part
  // of that value, even when it repeats a field label. Scanning the labels
  // backwards and taking, for each, its last occurrence before the next
  // field's heading achieves that: a fake "### Consent" inside the abstract
  // comes before the real one and is left inside the abstract.
  const order = Array.from(knownLabels, (l) => String(l).trim());
  const starts = new Array(order.length).fill(-1);
  let limit = lines.length;
  for (let i = order.length - 1; i >= 0; i -= 1) {
    for (let j = limit - 1; j >= 0; j -= 1) {
      if (headingAt[j] === order[i]) {
        starts[i] = j;
        limit = j;
        break;
      }
    }
  }
  let end = lines.length;
  for (let i = order.length - 1; i >= 0; i -= 1) {
    if (starts[i] === -1) continue;
    sections.set(order[i], cleanValue(lines.slice(starts[i] + 1, end).join('\n')));
    end = starts[i];
  }
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
