import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(join(root,path),'utf8');
const [site,guide,style,service,docs]=await Promise.all([
  read('index.html'),read('help/guide.html'),read('dtr-responsive.css'),read('sw.js'),read('README.md')
]);
assert.match(site, /class="system-button" id="helpButton" href="\.\/help\/guide\.html" target="_blank" rel="noopener noreferrer"/,
  'Header HELP button must open the full guide in a safe new tab');
assert(site.indexOf('id="systemButton"')<site.indexOf('id="helpButton"')&&
       site.indexOf('id="helpButton"')<site.indexOf('id="installButton"'),
  'HELP belongs between SYSTEM and INSTALL');
assert.match(style,/#helpButton/, 'HELP link should preserve DTR header button styling');
assert.match(style, /repeat\(3,minmax\(52px,auto\)\)/,
  'Phone header must leave space for the extra action');
assert.match(guide, /id="dtr-help"/, 'Guide must have a uniquely scoped root');
assert.match(guide, /#dtr-help/, 'Guide CSS must stay scoped');
assert.match(guide, /class="dh-search"/, 'Guide must retain its working search');
assert.match(guide, /class="dh-menu"/, 'Guide must retain its mobile contents drawer');
assert.match(guide, /class="dh-lightbox"/, 'Guide must allow enlarging screenshots');
assert.match(guide, /IntersectionObserver/, 'Guide must retain table-of-contents highlighting');
assert.match(guide, /<script>[\s\S]*<\/script>/, 'The guide inline behavior must remain bundled');
for(const anchor of [
 'start','layout','header','command-bar','system','install','overview','pob-status',
 'uplink-panel','matrix','pob-detail','maintenance','production','shipyard','pinned',
 'inventory','trade-routes','ship','flight-plan','advanced','results','docking',
 'calculator','forum','composer','avatar','mobile','data','glossary','faq'
]){
 assert(guide.includes('id="'+anchor+'"'), 'Guide is missing #'+anchor);
}
const imgDir=join(root,'help','img');
const images=(await readdir(imgDir)).filter(name=>name.endsWith('.webp'));
assert.equal(images.length,29,'all 29 original Slimy screenshots must be imported');
const references=new Set([...guide.matchAll(/src="img\/([^"]+\.webp)"/g)].map(m=>m[1]));
assert(references.size>=28,'the guide must retain its inline screenshots');
for(const screenshot of images){
 const bytes=await readFile(join(imgDir,screenshot));
 assert(bytes.length>=256, 'screenshot asset must not be truncated: '+screenshot);
 assert.equal(bytes.subarray(0,4).toString(),'RIFF','WebP RIFF header missing: '+screenshot);
 assert.equal(bytes.subarray(8,12).toString(),'WEBP','WebP format header missing: '+screenshot);
 assert.equal(bytes.readUInt32LE(4)+8,bytes.length,'WebP bytes incomplete: '+screenshot);
 assert(service.includes('./help/img/'+screenshot),'Offline shell missing screenshot: '+screenshot);
}
for(const src of references)assert(images.includes(src), 'Broken guide screenshot: '+src);
assert(service.includes('./help/guide.html'),'Full guide must be available offline');
assert.match(service, /v1\.0\.8/, 'PWA must bump cache so the help files are stored');
assert(docs.includes('## DTR Help Guide'),'Integration details documented');
console.log('DTR Help Guide audit passed (header, responsive layout, all 29 full-quality WebP assets, section anchors, search, mobile navigation, offline cache).');
