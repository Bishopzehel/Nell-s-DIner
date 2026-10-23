import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [png,js,html,css,sw]=await Promise.all([
 readFile('assets/dtr-forum-frame.png'),readFile('dtr-avatar.js','utf8'),
 readFile('index.html','utf8'),readFile('dtr-avatar.css','utf8'),readFile('sw.js','utf8')
]);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','frame must be PNG');
assert.equal(png.readUInt32BE(16),200,'original frame width');
assert.equal(png.readUInt32BE(20),233,'original frame height');
for(const name of ['dtrAvatarCanvas','dtrAvatarFile','dtrAvatarZoom','dtrAvatarDownload','dtrAvatarReset','dtrAvatarStatus']){
 assert(html.includes('id="'+name+'"'),'missing UI control '+name);
}
assert(js.includes("canvas.toBlob("),'the output is generated in browser');
assert(js.includes("'image/png'"),'exports png');
assert(js.includes("drawImage(frame,0,0,W,H)"),'frame must not be resized or offset');
assert(js.includes("canvas.addEventListener('pointermove'"),'touch/mouse drag required');
assert(js.includes("scale=Math.max(1,Math.min(4"),'zoom must be bounded');
assert(!/fetch\(['"]https?:/.test(js),'portrait editor must not upload images');
assert(css.includes('@media(max-width:650px)'),'mobile responsive');
assert(sw.includes('./assets/dtr-forum-frame.png'),'frame must be cached');
console.log('DTR portrait frame audit passed (200x233 PNG, upload, touch drag, zoom, overlay, local export, mobile).');
