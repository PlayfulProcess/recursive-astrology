#!/usr/bin/env node
/*
 * scripts/export-glyphs.js — the sixty-four "gate N lit" bodygraph glyphs.
 * ============================================================================
 * Writes img/hd/gate-01.svg … img/hd/gate-64.svg: the whole board, in the one
 * renderer this repo has, with exactly one gate lit in each file.
 *
 * WHY IT EXISTS. The sibling recursive-iching site wanted these glyphs, could
 * not import anything out of an 11,000-line HTML file, and so copied the
 * framework tables out and redrew the board — and the copy drifted: its centres
 * and its channel routing stopped being the ones here, which took a long time
 * to get right. These files come out of viewer/hd-render.js, the same module
 * the live chart draws with, so they cannot disagree with it. recursive-iching
 * consumes them (or fetches them) and deletes scripts/build_hd_glyphs.py.
 *
 * Zero dependencies. Node only.
 *
 *   node scripts/export-glyphs.js
 *   node scripts/export-glyphs.js --legend            keep the legend strip
 *   node scripts/export-glyphs.js --theme=dark        pin dark instead of
 *                                                     "light, dark if the
 *                                                     reader's system says so"
 *   node scripts/export-glyphs.js --out=img/hd        somewhere else
 *
 * Each file carries its own palette (opts.embedStyle), because an .svg opened
 * on its own or dropped into another site has no stylesheet to inherit the
 * --bgc-* tokens from.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HD = require(path.join(ROOT, 'viewer', 'hd-render.js'));

// ---- arguments ---------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = name => argv.some(a => a === '--' + name);
const value = (name, dflt) => {
  const hit = argv.find(a => a.indexOf('--' + name + '=') === 0);
  return hit ? hit.slice(name.length + 3) : dflt;
};

const outDir = path.resolve(ROOT, value('out', path.join('img', 'hd')));
const theme = value('theme', 'auto');
const legend = flag('legend');

if (['auto', 'light', 'dark'].indexOf(theme) === -1) {
  console.error('--theme must be auto, light or dark (got "' + theme + '")');
  process.exit(1);
}

// ---- write -------------------------------------------------------------------
fs.mkdirSync(outDir, { recursive: true });

const opts = {
  // Nothing in an exported file can call selectHDGate(), and a glyph is a
  // picture, not a control.
  interactive: false,
  // The legend explains a chart. A one-gate glyph has nothing to explain, and
  // without it the viewBox shortens to the board itself.
  legend: legend,
  // BY CENTRE: a single lit gate in the one accent. "Design vs Personality" is
  // a fact about a birth chart, and a glyph is not a birth chart.
  legendMode: 'center',
  embedStyle: true,
  theme: theme
};

const written = [];
for (let gate = 1; gate <= 64; gate++) {
  const name = 'gate-' + String(gate).padStart(2, '0') + '.svg';
  const svg = HD.renderBodygraph({ gates: [gate] }, opts);
  fs.writeFileSync(path.join(outDir, name), svg + '\n');
  written.push({ name: name, bytes: Buffer.byteLength(svg) + 1 });
}

// ---- report ------------------------------------------------------------------
const rel = path.relative(ROOT, outDir).split(path.sep).join('/');
const total = written.reduce((n, f) => n + f.bytes, 0);

console.log('Wrote ' + written.length + ' glyphs to ' + rel + '/');
console.log('  theme=' + theme + '  legend=' + (legend ? 'on' : 'off') +
  '  reading=center  interactive=off');
console.log('');
for (let i = 0; i < written.length; i += 4) {
  console.log('  ' + written.slice(i, i + 4)
    .map(f => (rel + '/' + f.name).padEnd(24)).join('').replace(/\s+$/, ''));
}
console.log('');
console.log('  ' + (total / 1024).toFixed(0) + ' KB total, ' +
  (total / written.length / 1024).toFixed(1) + ' KB each');
