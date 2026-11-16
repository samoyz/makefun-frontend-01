// A tiny markdown renderer for the bounties' descriptions and rules: headings,
// lists, bold, code and links. Everything is escaped first, so no markup from
// the API can ever run; only the patterns below turn into elements.

import { esc } from './format.js';

function inline(text) {
  return esc(text)
    .replace(/`([^`\n]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${url}" rel="noopener">${label}</a>`);
}

/** Markdown text to safe HTML. */
export function md(text) {
  const lines = String(text ?? '').split('\n');
  let html = '';
  let list = false;
  const closeList = () => {
    if (list) {
      html += '</ul>';
      list = false;
    }
  };
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const item = line.match(/^[-*]\s+(.*)$/);
    if (h2) {
      closeList();
      html += `<h3>${inline(h2[1])}</h3>`;
    } else if (h3) {
      closeList();
      html += `<h4>${inline(h3[1])}</h4>`;
    } else if (item) {
      if (!list) {
        html += '<ul>';
        list = true;
      }
      html += `<li>${inline(item[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}
