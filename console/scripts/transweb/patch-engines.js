#!/usr/bin/env node
/* eslint-env node */
/**
 * Transweb — build-time fixes to installed extension engines.
 *
 * Fleet-Ops engine 0.6.68: the driver and customer forms have a "Create a new user" button
 * (user-plus icon next to "User account") that opens IAM's modals/user-form without
 * `allowEmailEdit: true`. IAM's template disables the email field unless that option is set,
 * so the email of a new user could not be typed. IAM's own "New user" passes it; we do the same.
 *
 * Usage:
 *   node scripts/transweb/patch-engines.js --node-modules node_modules   (engine sources, before build)
 *   node scripts/transweb/patch-engines.js --file path/to/engine.js       (an already built bundle)
 *
 * Fails if nothing matched, so an engine upgrade that changes this code is noticed.
 * Remove the patch once upstream passes allowEmailEdit itself.
 */
const fs = require('fs');
const path = require('path');

const PATTERN = /(title: 'Create a new user',\s*user,\s*)(formPermission: 'iam create user',)(?!\s*allowEmailEdit)/g;

function patchFile(file) {
    const source = fs.readFileSync(file, 'utf8');
    let count = 0;
    const patched = source.replace(PATTERN, (match, head, permission) => {
        count++;
        const indent = head.match(/\n([ \t]*)user,\s*$/)[1];
        return `${head}${permission}\n${indent}allowEmailEdit: true,`;
    });
    if (count > 0) {
        fs.writeFileSync(file, patched);
    }
    const already = (source.match(/formPermission: 'iam create user',\s*allowEmailEdit: true/g) || []).length;
    console.log(`[patch-engines] ${file}: ${count} patched, ${already} already patched`);
    return count + already;
}

const args = process.argv.slice(2);
const flag = args[0];
const value = args[1];
let total = 0;

if (flag === '--file' && value) {
    total = patchFile(value);
    if (total < 1) {
        console.error('[patch-engines] no "Create a new user" modal call found');
        process.exit(1);
    }
} else if (flag === '--node-modules' && value) {
    const engine = fs.realpathSync(path.join(value, '@fleetbase', 'fleetops-engine'));
    for (const form of ['driver', 'customer']) {
        const file = path.join(engine, 'addon', 'components', form, 'form.js');
        if (patchFile(file) < 1) {
            console.error(`[patch-engines] ${form}/form.js: "Create a new user" modal call not found (engine changed?)`);
            process.exit(1);
        }
    }
} else {
    console.error('usage: patch-engines.js --node-modules <dir> | --file <engine.js>');
    process.exit(2);
}
