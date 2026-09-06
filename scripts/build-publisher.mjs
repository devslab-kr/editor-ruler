import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderPublisherHtml } from '@devslab/site-kit';
import { DEVSLAB_PUBLISHER } from '@devslab/site-kit/devslab';

// The checked-in HTML remains crawlable without JavaScript or a package registry.
const pages = ["site/index.html"];
const root = new URL('../', import.meta.url);
const start = '<!-- site-kit:publisher:start -->';
const end = '<!-- site-kit:publisher:end -->';
const template = start + renderPublisherHtml(DEVSLAB_PUBLISHER) + end;
for (const page of pages) {
  const target = new URL(page, root);
  const source = await readFile(target, 'utf8');
  const rendered = template.replace(/\r?\n/g, source.includes('\r\n') ? '\r\n' : '\n');
  const from = source.indexOf(start);
  const through = source.indexOf(end);
  if (from < 0 || through < from || source.indexOf(start, from + start.length) !== -1) {
    throw new Error('Expected one publisher marker pair in ' + page);
  }
  const result = source.slice(0, from) + rendered + source.slice(through + end.length);
  if (process.argv.includes('--check')) {
    if (result !== source) throw new Error('Stale publisher in ' + page + '; run build:publisher');
  } else if (result !== source) {
    await writeFile(target, result);
  }
  console.log('Publisher verified: ' + fileURLToPath(target));
}
