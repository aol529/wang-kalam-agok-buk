// Deploy step (see .github/workflows/pages.yml): joins the page's own
// scripts, in the order index.html loads them, into one minified file,
// js/app.js, and puts a single <script> tag where they were. Only the
// scripts at the end of <body> are joined; config.js and the CDN scripts
// in <head> stay as they are. Run on the built copy: node tools/bundle.mjs _site
// (local development keeps the separate files).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const site = process.argv[2] || '_site';
const htmlPath = path.join(site, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const bodyAt = html.indexOf('<body');
const tag = /<script src="(js\/[^"?]+\.js)\?v=__BUILD__"><\/script>\n?/g;
const files = [];
const body = html.slice(bodyAt).replace(tag, (m, src) => { files.push(src); return files.length === 1 ? '<script src="js/app.js?v=__BUILD__"></script>\n' : ''; });
if (files.length < 2) { console.log('bundle: nothing to join'); process.exit(0); }
const joined = files.map(f => `/* ${f} */\n` + fs.readFileSync(path.join(site, f), 'utf8') + '\n;\n').join('');
const raw = path.join(site, 'js', 'app.raw.js'), out = path.join(site, 'js', 'app.js');
fs.writeFileSync(raw, joined);
execFileSync('npx', ['--yes', 'esbuild@0.24.2', raw, '--minify', '--target=es2020', '--outfile=' + out], { stdio: 'inherit' });
fs.unlinkSync(raw);
fs.writeFileSync(htmlPath, html.slice(0, bodyAt) + body);
console.log(`bundle: ${files.length} scripts -> js/app.js (${(fs.statSync(out).size / 1024).toFixed(0)} KB, from ${(joined.length / 1024).toFixed(0)} KB)`);
