// Builds index.html + sw.js from template.html / sw.template.js.
// Everything (Leaflet, fonts) is inlined so the app keeps working offline.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const b64 = (f) => fs.readFileSync(path.join(dir, f)).toString('base64');

// Optional .env (never committed). Only MAPBOX_TOKEN is used at build time.
const env = {};
if (fs.existsSync(path.join(dir, '.env'))) {
  read('.env').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}

const buildVersion = String(Date.now());
const leafletJs = read('leaflet.js');
if (/<\/script/i.test(leafletJs)) throw new Error('leaflet.js contains </script');

const vars = {
  LEAFLET_JS: leafletJs,
  LEAFLET_CSS: read('leaflet.css'),
  F_IT_GR: b64('f_it_gr.woff2'),
  F_IT_LA: b64('f_it_la.woff2'),
  F_MD_GR: b64('f_md_gr.woff2'),
  F_MD_LA: b64('f_md_la.woff2'),
  BUILD_VERSION: buildVersion,
  MAPBOX_TOKEN: (env.MAPBOX_TOKEN || '').replace(/[^A-Za-z0-9._-]/g, ''),
};

// Function replacer: Leaflet's source contains "$" sequences that a string
// replacement would interpret as special patterns.
const fill = (src) => src.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

const out = fill(read('template.html'));
fs.writeFileSync(path.join(dir, 'index.html'), out);
fs.writeFileSync(path.join(dir, 'sw.js'), fill(read('sw.template.js')));
console.log('Built index.html:', (out.length / 1024).toFixed(0), 'KB, version', buildVersion,
  env.MAPBOX_TOKEN ? '(with Mapbox token)' : '(no Mapbox token)');
