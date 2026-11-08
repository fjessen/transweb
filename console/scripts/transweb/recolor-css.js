#!/usr/bin/env node
/* eslint-env node */
/**
 * Transweb — build-time palette remap.
 *
 * Fleetbase's UI (ember-ui + extension engines) ships precompiled CSS that hardcodes the
 * Tailwind `blue` scale and Fleetbase's legacy `sky` scale in hundreds of component rules.
 * Overriding each selector by hand is brittle, so after `ember build` we rewrite those exact
 * colour values to the Transweb teal scale in every emitted .css file.
 *
 *   node scripts/transweb/recolor-css.js dist [--dry-run]
 *
 * Handles #rrggbb, #rrggbbaa, URL-encoded %23rrggbb (inline SVGs), rgb()/rgba() in both the
 * comma and space syntaxes. Only exact palette matches are touched.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Transweb teal scale (branding/assets/palette.json, + 50/950 extrapolated)
const TEAL = {
    50: '#F1FAF9',
    100: '#E3F5F4',
    200: '#B7E5E2',
    300: '#84D1CC',
    400: '#4BBAB3',
    500: '#1FA39C',
    600: '#087D7A',
    700: '#096E6D',
    800: '#065253',
    900: '#033637',
    950: '#022425',
};

// Source colour -> teal step
const MAP = {
    // Tailwind v3 `blue`. Mid/dark steps shift one shade darker: upstream puts white text on
    // blue-500/600, and white on teal-500 is only ~3:1, while white on teal-600 is 4.97:1 (WCAG AA).
    '#eff6ff': 50,
    '#dbeafe': 100,
    '#bfdbfe': 200,
    '#93c5fd': 300,
    '#60a5fa': 400,
    '#3b82f6': 600,
    '#2563eb': 700,
    '#1d4ed8': 800,
    '#1e40af': 800,
    '#1e3a8a': 900,
    '#172554': 950,
    // Fleetbase legacy `sky` (console tailwind.config.js before rebrand)
    '#e6f0fb': 100,
    '#bad5f5': 200,
    '#8dbbef': 300,
    '#61a0e8': 400,
    '#3485e2': 600,
    '#1c6cc7': 700,
    '#16539a': 800,
    '#103b6d': 800,
    '#092341': 900,
    // Tailwind v3 default `sky` (used by a few ember-ui hover states)
    '#e0f2fe': 100,
    '#bae6fd': 200,
    '#7dd3fc': 300,
    '#38bdf8': 400,
    '#0ea5e9': 600,
    '#0284c7': 700,
    '#0369a1': 800,
    '#075985': 800,
    '#0c4a6e': 900,
    // Fleetbase logo blue
    '#4391ea': 600,
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const HEX = {};
const RGB = {};
for (const [src, step] of Object.entries(MAP)) {
    HEX[src] = TEAL[step];
    RGB[hexToRgb(src).join(',')] = hexToRgb(TEAL[step]);
}

function recolor(css) {
    let count = 0;
    // #rrggbb / #rrggbbaa / %23rrggbb
    css = css.replace(/(#|%23)([0-9a-fA-F]{6})([0-9a-fA-F]{2})?(?![0-9a-fA-F])/g, (m, prefix, hex, alpha) => {
        const to = HEX['#' + hex.toLowerCase()];
        if (!to) return m;
        count++;
        const out = to.slice(1);
        return prefix + (hex === hex.toUpperCase() ? out.toUpperCase() : out.toLowerCase()) + (alpha || '');
    });
    // rgb(37 99 235 / x) | rgb(37, 99, 235) | rgba(37,99,235,.5)
    css = css.replace(/(rgba?\(\s*)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(?=\s*[,/)])/g, (m, open, r, s1, g, s2, b) => {
        const to = RGB[[r, g, b].map(Number).join(',')];
        if (!to) return m;
        count++;
        return `${open}${to[0]}${s1}${to[1]}${s2}${to[2]}`;
    });
    return { css, count };
}

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith('.css')) out.push(full);
    }
    return out;
}

if (require.main === module) {
    const dir = path.resolve(process.argv[2] || 'dist');
    const dry = process.argv.includes('--dry-run');
    if (!fs.existsSync(dir)) {
        console.error(`[transweb] recolor: directory not found: ${dir}`);
        process.exit(1);
    }
    let total = 0;
    for (const file of walk(dir)) {
        const { css, count } = recolor(fs.readFileSync(file, 'utf8'));
        if (count === 0) continue;
        total += count;
        if (!dry) fs.writeFileSync(file, css);
        console.log(`[transweb] recolor ${path.relative(dir, file)}: ${count}`);
    }
    console.log(`[transweb] recolor: ${total} colour values remapped${dry ? ' (dry run)' : ''}`);
}

module.exports = { recolor, MAP, TEAL };
