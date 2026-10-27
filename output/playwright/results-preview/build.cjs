const path = require('path');
const fs = require('fs');
const modules = path.join(process.env.TEMP, 'vmt-results-preview-tools/node_modules');
const esbuild = require(path.join(modules, 'esbuild'));
const root = process.cwd();
const out = __dirname;
fs.copyFileSync(path.join(root, 'tattoo-platform-frontend/src/app/globals.css'), path.join(out, 'styles.css'));
esbuild.buildSync({
  entryPoints: [path.join(out, 'preview.tsx')], bundle: true, outfile: path.join(out, 'preview.js'),
  jsx: 'automatic', alias: {
    react: path.join(modules, 'react'), 'react-dom': path.join(modules, 'react-dom'),
    'next/navigation': path.join(out, 'navigation.ts'),
  },
});

const crypto = require('crypto');
const version = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, 'styles.css'))).update(fs.readFileSync(path.join(out, 'preview.js'))).digest('hex').slice(0, 12);
const htmlPath = path.join(out, 'index.html');
fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, 'utf8').replace(/styles\.css(?:\?v=[a-z0-9]+)?/g, `styles.css?v=${version}`).replace(/preview\.js(?:\?v=[a-z0-9]+)?/g, `preview.js?v=${version}`));
