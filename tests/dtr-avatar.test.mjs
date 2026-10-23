import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
const [png,js,html,css,sw]=await Promise.all([
 readFile('assets/dtr-forum-frame.png'),readFile('dtr-avatar.js','utf8'),
 readFile('index.html','utf8'),readFile('dtr-avatar.css','utf8'),readFile('sw.js','utf8')
]);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','frame must be PNG');
assert.equal(png.readUInt32BE(16),200,'original frame width');
assert.equal(png.readUInt32BE(20),233,'original frame height');
for(const name of [
  'dtrAvatarCanvas','dtrAvatarFile','dtrAvatarZoom','dtrAvatarDownload',
  'dtrAvatarReset','dtrAvatarStatus','dtrAvatarFit','dtrAvatarFill',
  'dtrForumToolComposer','dtrForumToolAvatar','dtrForumComposerWorkspace'
]){
 assert(html.includes('id="'+name+'"'),'missing UI control '+name);
}
assert(js.includes("canvas.toBlob("),'the output is generated in browser');
assert(js.includes("'image/png'"),'exports png');
assert(js.includes("drawImage(frame,0,0,W,H)"),'frame must not be resized or offset');
assert(js.includes("canvas.addEventListener('pointermove'"),'touch/mouse drag required');
assert(js.includes("scale=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM"),'zoom must be bounded');
assert(js.includes('MIN_ZOOM=.02'),'zoom must allow smaller than cover scale');
assert(js.includes('function fitImage()'),'portrait must have a one-click FIT mode');
assert(js.includes('ctx.fillRect(0,0,W,H)'),'FIT should export a solid matching matte');
assert(!/fetch\(['"]https?:/.test(js),'portrait editor must not upload images');
assert(css.includes('@media(max-width:650px)'),'mobile responsive');
assert(css.includes('#dtrForumComposerWorkspace[hidden],#dtrAvatarTool[hidden]'),
  'Forum Composer and Avatar Frame must be mutually exclusive views');
assert(html.indexOf('id="dtrForumToolAvatar"')<html.indexOf('id="dtrForumWrite"'),
  'avatar selector must appear before the long BBCode composer');
assert(html.includes('id="dtrAvatarTool" hidden'),'the avatar pane must begin hidden');
assert(html.includes('id="dtrAvatarZoom" type="range" min="0.02"'),
  'slider must permit zooming below 100 percent');
assert((html.match(/data-avatar-nudge="/g)||[]).length===4,
  'four small move-image buttons must be accessible');
assert(sw.includes('./assets/dtr-forum-frame.png'),'frame must be cached');

// Decode every PNG chunk, not just IHDR dimensions. The old broken asset had a
// plausible signature and dimensions but failed actual browser image decoding.
const crc32=data=>{
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let k=0;k<8;k++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
 return (crc^0xffffffff)>>>0;
};
const chunks=new Map();let i=8,seenEnd=false;
while(i<png.length){
 assert(i+12<=png.length,'truncated PNG chunk header');
 const n=png.readUInt32BE(i),type=png.subarray(i+4,i+8).toString('ascii');
 const end=i+12+n;
 assert(end<=png.length,'truncated '+type+' chunk');
 const data=png.subarray(i+8,i+8+n);
 assert.equal(png.readUInt32BE(i+8+n),crc32(png.subarray(i+4,i+8+n)),
   'corrupt PNG CRC in '+type);
 chunks.set(type,[...(chunks.get(type)||[]),data]);
 i=end;
 if(type==='IEND'){seenEnd=true;break;}
}
assert(seenEnd&&i===png.length,'PNG must have a complete IEND chunk and no truncated bytes');
const header=chunks.get('IHDR')?.[0];
assert(header,'PNG IHDR missing');
assert.deepEqual([header[8],header[9]],[8,3],'8-bit indexed PNG with transparency');
const W=200,H=233;
const unpacked=inflateSync(Buffer.concat(chunks.get('IDAT')||[]));
assert.equal(unpacked.length,H*(W+1),'frame pixel data must decompress fully');
assert(chunks.has('PLTE')&&chunks.has('tRNS'),'transparent frame palette missing');
const alpha=chunks.get('tRNS')[0];
const sample=(x,y)=>{
 const row=y*(W+1);
 assert.equal(unpacked[row],0,'expected unfiltered PNG scanline');
 return alpha[unpacked[row+1+x]]??255;
};
assert.equal(sample(100,100),0,'portrait area should be transparent');
assert(sample(7,220)>128,'red border must be visible');

// Simulate the browser control flow: frame load, portrait upload, enable export,
// canvas compositing and clicking Download PNG. This catches the disabled-button bug.
const nodes=new Map(),draws=[],portraitDraws=[],downloads=[];
class FakeElement{
 constructor(id){
  this.id=id;this.value='1';this.disabled=true;this.textContent='';
  this.dataset={};this.files=[];this.listeners=new Map();this.attributes={};
 }
 addEventListener(type,callback){this.listeners.set(type,callback)}
 setAttribute(name,value){this.attributes[name]=String(value)}
 fire(type,event={}){return this.listeners.get(type)?.({
   target:this,pointerId:1,clientX:0,clientY:0,...event
 })}
 getContext(){return {
    clearRect(){},fillRect(){},
    drawImage:(img,...args)=>{
      draws.push(img.src);
      if(img.src.startsWith('blob:'))portraitDraws.push(args);
    }
  }}
 toBlob(callback,type){assert.equal(type,'image/png');callback(new Blob(['test image'],{type}))}
 setPointerCapture(){}
 getBoundingClientRect(){return {width:200,height:233}}
}
const node=id=>{
 if(!nodes.has(id))nodes.set(id,new FakeElement(id));
 return nodes.get(id);
};
class FakeImage{
 naturalWidth=0;naturalHeight=0;
 set src(value){
  this._src=value;
  this.naturalWidth=value.includes('dtr-forum-frame')?W:400;
  this.naturalHeight=value.includes('dtr-forum-frame')?H:400;
  queueMicrotask(()=>this.onload?.());
 }
 get src(){return this._src}
}
let objects=0;
const url={createObjectURL:()=> 'blob:avatar-'+(++objects),revokeObjectURL(){}};
const fakeDoc={
 getElementById:node,
 querySelectorAll(selector){
   if(selector==='[data-avatar-nudge]'){
     return ['left','up','down','right'].map(dir=>{
       const el=node('nudge-'+dir);el.dataset.avatarNudge=dir;return el;
     });
   }
   return [];
 },
 createElement(tag){
  assert.equal(tag,'a');
  return {download:'',href:'',click(){downloads.push({name:this.download,url:this.href})},remove(){}};
 },
 body:{appendChild(){}}
};
node('dtrAvatarZoom').value='1';
node('dtrAvatarDownload').disabled=true;
runInNewContext(js,{
 document:fakeDoc,window:{addEventListener(){}},URL:url,Image:FakeImage,
 Blob,console,setTimeout:()=>0,queueMicrotask
});
await new Promise(setImmediate);
assert.match(node('dtrAvatarStatus').textContent,/DTR FRAME READY/);
assert.equal(node('dtrAvatarTool').hidden,true,'avatar is not appended as a visible BBCode footer');
assert.equal(node('dtrForumComposerWorkspace').hidden,false);
node('dtrForumToolAvatar').fire('click');
assert.equal(node('dtrAvatarTool').hidden,false,'avatar tab shows editor directly');
assert.equal(node('dtrForumComposerWorkspace').hidden,true,'long composer hidden in avatar mode');
assert.equal(node('dtrForumToolAvatar').attributes['aria-pressed'],'true');
node('dtrForumToolComposer').fire('click');
assert.equal(node('dtrAvatarTool').hidden,true);
assert.equal(node('dtrForumComposerWorkspace').hidden,false);
node('dtrForumToolAvatar').fire('click');
node('dtrAvatarFile').files=[{type:'image/png',size:500}];
await node('dtrAvatarFile').fire('change');
await new Promise(setImmediate);
assert.equal(node('dtrAvatarDownload').disabled,false,
  'download button must become enabled after both images load');
assert.match(node('dtrAvatarStatus').textContent,/DOWNLOAD PNG/);
assert(draws.at(-1).includes('dtr-forum-frame'),
  'decorative frame must be drawn on top of uploaded portrait');
node('dtrAvatarZoom').value='0.5';node('dtrAvatarZoom').fire('input');
assert.equal(node('dtrAvatarZoomValue').textContent,'50%','slider must shrink below cover scale');
node('dtrAvatarFit').fire('click');
const fitted=Number(node('dtrAvatarZoom').value);
assert(fitted>0&&fitted<1,'FIT must show whole square photo in taller avatar frame');
node('dtrAvatarFill').fire('click');
assert.equal(Number(node('dtrAvatarZoom').value),1,'FILL must cover entire frame again');
const beforeMove=portraitDraws.at(-1);
node('nudge-left').fire('click');
assert.equal(portraitDraws.at(-1)[0],beforeMove[0]-8,'position buttons move portrait');
node('dtrAvatarReset').fire('click');
assert.equal(Number(node('dtrAvatarZoom').value),1,'reset returns to default fill');
assert.equal(portraitDraws.at(-1)[0],beforeMove[0],'reset restores image position');
node('dtrAvatarDownload').fire('click');
assert.equal(downloads.length,1,'download action must create a file link');
assert.equal(downloads[0].name,'DTR-framed-avatar-200x233.png');
assert.match(node('dtrAvatarStatus').textContent,/EXPORTED/);
console.log('DTR portrait editor passed: decoded PNG, 200x233 frame, visible forum subtab, FIT/FILL, zoom out, nudge, reset and PNG export.');

