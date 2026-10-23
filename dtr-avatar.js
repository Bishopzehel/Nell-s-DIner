/* DTR Forum // Portrait Frame Tool. Local-only 200 × 233 pixel PNG compositor. */
(() => {
'use strict';
const W=200,H=233,$=id=>document.getElementById(id);
let portrait=null,frame=null,scale=1,offsetX=0,offsetY=0,pointer=null,objectUrl=null;
const canvas=$('dtrAvatarCanvas');
if(!canvas)return;
const ctx=canvas.getContext('2d',{alpha:true});
const file=$('dtrAvatarFile'),zoom=$('dtrAvatarZoom'),save=$('dtrAvatarDownload'),reset=$('dtrAvatarReset'),status=$('dtrAvatarStatus');
const say=(message,bad=false)=>{status.textContent=message;status.dataset.tone=bad?'warn':'normal'};
const minScale=()=>portrait?Math.max(W/portrait.naturalWidth,H/portrait.naturalHeight):1;
function draw(){
 ctx.clearRect(0,0,W,H);
 if(portrait){
   const k=minScale()*scale;
   const width=portrait.naturalWidth*k,height=portrait.naturalHeight*k;
   ctx.drawImage(portrait,(W-width)/2+offsetX,(H-height)/2+offsetY,width,height);
 }
 if(frame)ctx.drawImage(frame,0,0,W,H);
 save.disabled=!portrait||!frame;
 reset.disabled=!portrait;
}
function setZoom(v){
 scale=Math.max(1,Math.min(4,Number(v)||1));
 zoom.value=String(scale);$('dtrAvatarZoomValue').textContent=Math.round(scale*100)+'%';draw();
}
function resetTransform(){offsetX=0;offsetY=0;setZoom(1)}
const loadImage=(url)=>new Promise((resolve,reject)=>{
 const image=new Image();
 image.onload=()=>resolve(image);
 image.onerror=()=>reject(new Error('Could not decode the image.'));
 image.src=url;
});
async function loadFrame(){
 try{
   frame=await loadImage('./assets/dtr-forum-frame.png');
   if(frame.naturalWidth!==W||frame.naturalHeight!==H)throw Error('Frame dimensions are not 200 × 233.');
   say('READY // UPLOAD A PORTRAIT');draw();
 }catch(error){frame=null;say('FRAME ASSET UNAVAILABLE: '+error.message,true);draw();}
}
file.addEventListener('change',async()=>{
 const chosen=file.files?.[0];if(!chosen)return;
 if(!/^image\/(png|jpeg|webp)$/.test(chosen.type)){say('USE PNG, JPG OR WEBP.',true);file.value='';return}
 if(chosen.size>15*1024*1024){say('IMAGE MUST BE UNDER 15 MB.',true);file.value='';return}
 const url=URL.createObjectURL(chosen);
 try{
   const image=await loadImage(url);
   if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid dimensions.');
   portrait=image;
   if(objectUrl)URL.revokeObjectURL(objectUrl);
   objectUrl=url;
   resetTransform();
   say('PORTRAIT LOADED // DRAG TO POSITION, THEN DOWNLOAD PNG');
 }catch(e){URL.revokeObjectURL(url);say('COULD NOT OPEN IMAGE: '+e.message,true)}
 file.value='';draw();
});
zoom.addEventListener('input',()=>setZoom(zoom.value));
reset.addEventListener('click',resetTransform);
canvas.addEventListener('pointerdown',e=>{
 if(!portrait)return;
 pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:offsetX,startY:offsetY};
 canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!pointer||pointer.id!==e.pointerId)return;
 const rect=canvas.getBoundingClientRect();
 offsetX=pointer.startX+(e.clientX-pointer.x)*W/rect.width;
 offsetY=pointer.startY+(e.clientY-pointer.y)*H/rect.height;
 draw();
});
const release=e=>{if(pointer?.id===e.pointerId)pointer=null};
canvas.addEventListener('pointerup',release);
canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',e=>{
 if(!portrait)return;
 e.preventDefault();setZoom(scale+(e.deltaY<0?.1:-.1));
},{passive:false});
save.addEventListener('click',()=>{
 if(!portrait||!frame)return;
 canvas.toBlob(blob=>{
   if(!blob){say('EXPORT FAILED. TRY AGAIN.',true);return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='DTR-framed-avatar-200x233.png';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),15000);
   say('EXPORTED // 200 × 233 PNG');
 },'image/png');
});
draw();loadFrame();
window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)});
})();