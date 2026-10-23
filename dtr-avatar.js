/* DTR Forum // Portrait Frame Tool. Local-only 200 × 233 PNG compositor. */
(() => {
'use strict';
const W=200,H=233,MIN_ZOOM=.02,MAX_ZOOM=4,NUDGE=8;
const $=id=>document.getElementById(id);
const canvas=$('dtrAvatarCanvas');
if(!canvas)return;
const ctx=canvas.getContext('2d',{alpha:true});
const file=$('dtrAvatarFile'),zoom=$('dtrAvatarZoom');
const save=$('dtrAvatarDownload'),reset=$('dtrAvatarReset'),status=$('dtrAvatarStatus');
const fit=$('dtrAvatarFit'),fill=$('dtrAvatarFill');
let portrait=null,frame=null,clipMask=null,frameLoading=true,scale=1;
let offsetX=0,offsetY=0,pointer=null,objectUrl=null;
const nudgeButtons=[...document.querySelectorAll('[data-avatar-nudge]')];
const say=(message,bad=false)=>{status.textContent=message;status.dataset.tone=bad?'warn':'normal'};

// Show either tool directly below the FORUM header. No more scrolling through
// the BBCode composer to reach the portrait editor.
const composer=$('dtrForumComposerWorkspace'),avatar=$('dtrAvatarTool');
const composerButton=$('dtrForumToolComposer'),avatarButton=$('dtrForumToolAvatar');
function showTool(which){
  const selected=which==='avatar';
  if(!composer||!avatar)return;
  composer.hidden=selected;
  avatar.hidden=!selected;
  composerButton?.setAttribute('aria-pressed',String(!selected));
  avatarButton?.setAttribute('aria-pressed',String(selected));
}
composerButton?.addEventListener('click',()=>showTool('composer'));
avatarButton?.addEventListener('click',()=>showTool('avatar'));
showTool('composer');

const coverFactor=()=>portrait?Math.max(W/portrait.naturalWidth,H/portrait.naturalHeight):1;
const fitRatio=()=>portrait?Math.min(W/portrait.naturalWidth,H/portrait.naturalHeight)/coverFactor():1;
function draw(){
  ctx.clearRect(0,0,W,H);
  // The original PSD-style cutout is irregular, not a rectangle.
  // Keep the dark FIT matte only inside the actual portrait window.
  if(clipMask){
    ctx.fillStyle='#0b080d';
    ctx.fillRect(0,0,W,H);
    if(portrait){
      const factor=coverFactor()*scale;
      const width=portrait.naturalWidth*factor,height=portrait.naturalHeight*factor;
      ctx.drawImage(portrait,(W-width)/2+offsetX,(H-height)/2+offsetY,width,height);
    }
    ctx.globalCompositeOperation='destination-in';
    ctx.drawImage(clipMask,0,0,W,H);
    ctx.globalCompositeOperation='source-over';
  }
  // Draw the unchanged visible 200x233 DTR border after clipping.
  if(frame)ctx.drawImage(frame,0,0,W,H);
  save.disabled=!portrait||!frame||!clipMask;
  reset.disabled=!portrait;
  if(fit)fit.disabled=!portrait;
  if(fill)fill.disabled=!portrait;
  nudgeButtons.forEach(button=>button.disabled=!portrait);
}
function setZoom(value){
  const n=Number(value);
  scale=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number.isFinite(n)?n:1));
  zoom.value=String(scale);
  $('dtrAvatarZoomValue').textContent=Math.round(scale*100)+'%';
  draw();
}
function resetTransform(){offsetX=0;offsetY=0;setZoom(1)}
function fitImage(){
  if(!portrait)return;
  offsetX=0;offsetY=0;
  // A very wide portrait can require a smaller zoom floor than the initial UI.
  zoom.min=String(Math.min(MIN_ZOOM,fitRatio()));
  setZoom(fitRatio());
}
const loadImage=url=>new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error('Could not decode the image.'));
  image.src=url;
});
async function loadFrame(){
  try{
    const [image,windowMask]=await Promise.all([
      loadImage('./assets/dtr-forum-frame.png'),
      loadImage('./assets/dtr-forum-window-mask.png')
    ]);
    if(image.naturalWidth!==W||image.naturalHeight!==H||
       windowMask.naturalWidth!==W||windowMask.naturalHeight!==H)
      throw Error('Frame or mask dimensions are not 200 × 233.');
    frame=image;clipMask=windowMask;frameLoading=false;
    say(portrait?'PORTRAIT LOADED // FRAME & CUTOUT READY // DOWNLOAD PNG':'DTR FRAME & CUTOUT READY // UPLOAD A PORTRAIT');
    draw();
  }catch(error){
    frame=null;clipMask=null;frameLoading=false;
    say('DTR FRAME OR MASK COULD NOT LOAD // TRY UPDATE NOW OR REFRESH: '+error.message,true);
    draw();
  }
}
file.addEventListener('change',async()=>{
  const chosen=file.files?.[0];if(!chosen)return;
  if(!/^image\/(png|jpeg|webp)$/.test(chosen.type)){say('USE PNG, JPG OR WEBP.',true);file.value='';return;}
  if(chosen.size>15*1024*1024){say('IMAGE MUST BE UNDER 15 MB.',true);file.value='';return;}
  const url=URL.createObjectURL(chosen);
  try{
    const image=await loadImage(url);
    if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid dimensions.');
    if(image.naturalWidth*image.naturalHeight>60000000)throw Error('Image dimensions are too large.');
    portrait=image;
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=url;
    zoom.min=String(MIN_ZOOM);
    resetTransform();
    if(frame&&clipMask)say('PORTRAIT LOADED // FIT, FILL, ZOOM OR DRAG // DOWNLOAD PNG');
    else if(frameLoading)say('PORTRAIT LOADED // WAITING FOR DTR FRAME');
    else say('PORTRAIT LOADED // DTR FRAME OR MASK MISSING: USE UPDATE NOW OR REFRESH',true);
  }catch(error){
    URL.revokeObjectURL(url);
    say('COULD NOT OPEN IMAGE: '+error.message,true);
  }
  file.value='';draw();
});
zoom.addEventListener('input',()=>setZoom(zoom.value));
reset.addEventListener('click',resetTransform);
fit?.addEventListener('click',fitImage);
fill?.addEventListener('click',resetTransform);
nudgeButtons.forEach(button=>button.addEventListener('click',()=>{
  if(!portrait)return;
  switch(button.dataset.avatarNudge){
    case 'left':offsetX-=NUDGE;break;
    case 'right':offsetX+=NUDGE;break;
    case 'up':offsetY-=NUDGE;break;
    case 'down':offsetY+=NUDGE;break;
    default:return;
  }
  draw();
}));
canvas.addEventListener('pointerdown',event=>{
  if(!portrait)return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY,startX:offsetX,startY:offsetY};
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  offsetX=pointer.startX+(event.clientX-pointer.x)*W/rect.width;
  offsetY=pointer.startY+(event.clientY-pointer.y)*H/rect.height;
  draw();
});
const release=event=>{if(pointer?.id===event.pointerId)pointer=null};
canvas.addEventListener('pointerup',release);
canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',event=>{
  if(!portrait)return;
  event.preventDefault();
  setZoom(scale+(event.deltaY<0?.05:-.05));
},{passive:false});
save.addEventListener('click',()=>{
  if(!portrait||!frame||!clipMask)return;
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
