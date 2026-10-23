/* DTR Trade Routes // ship selector, favorites, API catalogue and custom profiles. */
import { DEFAULT_SHIP_ID,DEFAULT_FAVORITES,FALLBACK_SHIPS,normalizeShipRegistry,
  searchShipProfiles,findProfile,resolveSavedFavorites,validateCustomProfile,
  restoreCustomProfiles,storageCustomProfiles,verifyShipProfile,norm } from './dtr-ship-profiles.mjs';

const PREFS_KEY='dtr:trade-routes:ship-preferences:v1';
const CACHE_KEY='dtr:trade-routes:ship-registry:v1';
const get=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const qty=n=>Number(n).toLocaleString('en-GB');
const legacyId=Object.freeze({
  'freighter-3600':'ship:dsy_corsair_transport',
  'freighter-4300':'ship:pilgrim_liner',
  'freighter-5000':'ship:dsy_advanced_train'
});
function readLocal(key){
  try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}
}
function writeLocal(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
}
function shipRecords(ships){
  return ships.map(ship=>({
    nickname:ship.nickname,name:ship.apiName,type:ship.type,
    hold_size:ship.cargo,cruise_speed:ship.cruise,dock_type:ship.dockType
  }));
}
export function createShipController({readJson,onChange,legacySettings={}}){
  const prefs=readLocal(PREFS_KEY)||{};
  let catalog=FALLBACK_SHIPS.slice(),catalogMode='VERIFIED PRESET',updatedAt=0;
  const cached=readLocal(CACHE_KEY);
  if(cached?.ships&&Number.isFinite(cached.savedAt)){
    try{
      const parsed=normalizeShipRegistry(cached.ships);
      if(parsed.length>=5){catalog=parsed;catalogMode='CACHED DARKSTAT';updatedAt=cached.savedAt;}
    }catch{}
  }
  let customShips=restoreCustomProfiles(prefs.customShips);
  const allShips=()=>[...customShips,...catalog];
  let favorites=resolveSavedFavorites(prefs.favorites,allShips());
  const migrated=legacyId[legacySettings.profile]||legacySettings.profile;
  let selectedId=prefs.selectedId||migrated||DEFAULT_SHIP_ID;
  let current=findProfile(allShips(),selectedId)||findProfile(allShips(),DEFAULT_SHIP_ID)||allShips()[0];
  selectedId=current?.id||DEFAULT_SHIP_ID;
  let availableCargo=Number.isInteger(prefs.availableCargo)&&prefs.availableCargo>0?
    Math.min(prefs.availableCargo,current.cargo):
    Number.isInteger(Number(legacySettings.cargo))&&Number(legacySettings.cargo)>0&&
      Number(legacySettings.cargo)<=current.cargo?Number(legacySettings.cargo):current.cargo;
  let mounted=false,queryTimer=0,editingId=null,loading=false;
  const dialog=()=>get('dtrRoutesShipDialog');
  function save(){
    writeLocal(PREFS_KEY,{
      selectedId,favorites,customShips:storageCustomProfiles(customShips),
      availableCargo
    });
  }
  function renderFavorites(){
    const out=get('dtrRoutesFavorites');
    if(!out)return;
    out.innerHTML=favorites.map((id,i)=>{
      const ship=findProfile(allShips(),id),selected=ship?.id===selectedId;
      return '<div class="dtr-ship-favorite" data-active="'+String(Boolean(selected))+'">'+
        '<button type="button" data-dtr-favorite="'+i+'" aria-pressed="'+String(Boolean(selected))+'"'+
        ' aria-label="Select favorite '+(i+1)+': '+escape(ship?.name||'Not available')+'">'+
        '<small>0'+(i+1)+' // '+escape(ship?.name||'UNAVAILABLE')+'</small>'+
        '<strong>'+escape(ship?qty(ship.cargo):'—')+'</strong>'+
        '<span>'+escape(ship?ship.cruise+' M/S // '+ship.dockLabel:'PROFILE MISSING')+'</span></button>'+
        '<button type="button" class="dtr-ship-pin" data-dtr-ship-pin="'+i+'"'+
        ' title="Pin selected ship to favorite '+(i+1)+'"'+
        ' aria-label="Pin current ship to favorite '+(i+1)+'">★</button>'+
      '</div>';
    }).join('');
  }
  function renderSelected(){
    if(!get('dtrRoutesShipName'))return;
    get('dtrRoutesShipName').textContent=current.name.toUpperCase();
    get('dtrRoutesShipMeta').textContent=current.custom?'SAVED CUSTOM PROFILE':
      current.apiName.toUpperCase()+' // '+current.nickname;
    get('dtrRoutesShipSource').textContent=current.custom?'CUSTOM / LOCAL':catalogMode;
    get('dtrRoutesShipMaxCargo').textContent=qty(current.cargo);
    get('dtrRoutesShipCruise').textContent=current.cruise+' M/S';
    get('dtrRoutesShipDocking').textContent=current.dockLabel;
    const input=get('dtrRoutesCargo');
    input.max=String(current.cargo);
    input.value=String(availableCargo);
    const status=get('dtrRoutesShipCatalogStatus');
    if(status)status.textContent=catalogMode+' // '+qty(catalog.length)+' NAVIGABLE SHIPS';
    renderFavorites();
  }
  function selectProfile(id,{retainSpace=false}={}){
    const selected=findProfile(allShips(),id);
    if(!selected||!verifyShipProfile(selected))return false;
    current=selected;selectedId=selected.id;
    availableCargo=retainSpace?Math.min(availableCargo,current.cargo):current.cargo;
    editingId=null;
    if(get('dtrRoutesCustomForm'))get('dtrRoutesCustomForm').hidden=true;
    renderSelected();save();
    onChange?.(current,availableCargo);
    return true;
  }
  function pinFavorite(slot){
    if(!Number.isInteger(slot)||slot<0||slot>=3)return;
    if(favorites[slot]===selectedId)return;
    const prior=favorites[slot],other=favorites.findIndex((id,i)=>i!==slot&&id===selectedId);
    if(other>=0)favorites[other]=prior;
    favorites[slot]=selectedId;
    renderFavorites();save();
  }
  function renderPicker(query=''){
    const out=get('dtrRoutesShipResults');
    if(!out)return;
    const cleaned=norm(query),pool=allShips();
    // Empty search shows favorite ships first, plus the most useful known names,
    // then the rest of the catalogue. No duplicate IDs.
    const preferred=cleaned?[]:[
      ...favorites.map(id=>findProfile(pool,id)),
      ...['ship:pilgrim_liner','ship:bristol_transport','ship:dsy_mercatante',
          'ship:dsy_advanced_train'].map(id=>findProfile(pool,id))
    ].filter(Boolean);
    const seen=new Set();
    const matches=[...preferred,...searchShipProfiles(pool,query,Math.max(75,pool.length))]
      .filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return true});
    const visible=cleaned?matches.slice(0,60):matches.slice(0,65);
    if(!visible.length){
      out.innerHTML='<p class="dtr-ship-picker-empty">NO MATCHES // SEARCH FOR A SHIP NAME, ALIAS OR INTERNAL ID.</p>';
    }else{
      out.innerHTML=visible.map(ship=>
        '<button type="button" class="dtr-ship-result" data-dtr-ship-select="'+escape(ship.id)+'"'+
        ' data-selected="'+String(ship.id===selectedId)+'">'+
          '<span><strong>'+escape(ship.name)+'</strong><small>'+
            escape(ship.custom?'CUSTOM / LOCAL':ship.apiName+' // '+ship.nickname)+
          '</small></span>'+
          '<span class="dtr-ship-result-stats"><b>'+qty(ship.cargo)+' CARGO</b><b>'+ship.cruise+' CRUISE</b><b>'+ship.dockLabel+'</b></span>'+
        '</button>'
      ).join('');
    }
    get('dtrRoutesShipResultCount').textContent=
      qty(visible.length)+' SHOWN // '+qty(matches.length)+' MATCHING PROFILES // '+
      catalogMode+' // '+qty(catalog.length)+' NAVIGABLE SHIPS. INVALID/NPC-ONLY SPEEDS EXCLUDED.';
  }
  function viewportAdjust(){
    const el=dialog();
    if(!el?.open)return;
    if(window.innerWidth<=760){
      const viewport=window.visualViewport;
      const height=viewport?.height||window.innerHeight;
      const offset=viewport?.offsetTop||0;
      el.style.maxHeight=Math.max(230,Math.floor(height-22))+'px';
      el.style.top=Math.max(6,Math.floor(offset+8))+'px';
      el.style.bottom='auto';
    }else{el.style.maxHeight='';el.style.top='';el.style.bottom='';}
  }
  function showPicker(){
    if(!mounted)return;
    get('dtrRoutesShipSearch').value='';
    renderPicker('');
    const el=dialog();
    if(!el.open)el.showModal();
    document.body.classList.add('modal-open');
    viewportAdjust();
    get('dtrRoutesShipSearch').focus({preventScroll:true});
  }
  function closePicker(){
    if(dialog()?.open)dialog().close();
  }
  function showCustom(){
    if(!mounted)return;
    const pane=get('dtrRoutesCustomForm');
    editingId=current.custom?current.id:null;
    get('dtrRoutesCustomName').value=current.custom?current.name:'';
    get('dtrRoutesCustomCargo').value=String(current.cargo);
    get('dtrRoutesCustomSpeed').value=String(current.cruise);
    get('dtrRoutesCustomDock').value=String(current.dockType);
    get('dtrRoutesCustomDelete').hidden=!current.custom;
    pane.hidden=false;
    pane.scrollIntoView?.({block:'nearest',behavior:'smooth'});
    get('dtrRoutesCustomName').focus({preventScroll:true});
  }
  function hideCustom(){
    get('dtrRoutesCustomForm').hidden=true;editingId=null;
  }
  function saveCustom(event){
    event.preventDefault();
    const pane=get('dtrRoutesCustomForm');
    if(!pane.reportValidity())return;
    const id=editingId||'custom:'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e8).toString(36);
    let record;
    try{
      record=validateCustomProfile({
        name:get('dtrRoutesCustomName').value,cargo:get('dtrRoutesCustomCargo').value,
        cruise:get('dtrRoutesCustomSpeed').value,dockType:get('dtrRoutesCustomDock').value
      },id);
    }catch(error){
      get('dtrRoutesCustomName').setCustomValidity(error.message);
      pane.reportValidity();
      get('dtrRoutesCustomName').setCustomValidity('');
      return;
    }
    const at=customShips.findIndex(p=>p.id===id);
    if(at>=0)customShips[at]=record;
    else{
      if(customShips.length>=30){
        get('dtrRoutesCustomName').setCustomValidity('Maximum 30 saved custom profiles. Edit or delete one first.');
        pane.reportValidity();get('dtrRoutesCustomName').setCustomValidity('');return;
      }
      customShips.push(record);
    }
    hideCustom();
    selectProfile(id);
  }
  function deleteCustom(){
    if(!editingId||!current.custom)return;
    const deleted=editingId;
    customShips=customShips.filter(p=>p.id!==deleted);
    favorites=resolveSavedFavorites(favorites,allShips());
    hideCustom();
    selectProfile(DEFAULT_SHIP_ID);
  }
  async function refreshShips(){
    if(loading)return;
    loading=true;
    const state=get('dtrRoutesShipCatalogStatus');
    if(state)state.textContent='CONTACTING DARKSTAT // SHIP REGISTRY';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await readJson('ships',{},controller.signal);
      const live=normalizeShipRegistry(response);
      if(live.length<100)throw Error('Incomplete ship registry; retaining previous data.');
      catalog=live;catalogMode='LIVE DARKSTAT';updatedAt=Date.now();
      writeLocal(CACHE_KEY,{savedAt:updatedAt,ships:shipRecords(catalog)});
      favorites=resolveSavedFavorites(favorites,allShips());
      if(!findProfile(allShips(),selectedId))selectedId=DEFAULT_SHIP_ID;
      if(!findProfile(allShips(),selectedId))selectedId=allShips()[0]?.id;
      current=findProfile(allShips(),selectedId)||current;
      availableCargo=Math.min(availableCargo,current.cargo);
      renderSelected();save();
      onChange?.(current,availableCargo);
      if(dialog()?.open)renderPicker(get('dtrRoutesShipSearch').value);
    }catch(error){
      if(state)state.textContent=catalogMode+' // '+qty(catalog.length)+' SHIPS // LIVE API UNAVAILABLE';
      const hint=get('dtrRoutesShipSource');
      if(hint&&!current.custom)hint.textContent=catalogMode+' // NOT LIVE';
    }finally{
      clearTimeout(timeout);loading=false;
    }
  }
  function mount(){
    if(mounted)return;
    mounted=true;
    renderSelected();
    onChange?.(current,availableCargo);
    get('dtrRoutesFavorites').addEventListener('click',event=>{
      const pin=event.target.closest('[data-dtr-ship-pin]');
      if(pin){pinFavorite(Number(pin.dataset.dtrShipPin));return;}
      const favorite=event.target.closest('[data-dtr-favorite]');
      if(favorite){const id=favorites[Number(favorite.dataset.dtrFavorite)];if(id)selectProfile(id);}
    });
    get('dtrRoutesShipPickerOpen').addEventListener('click',showPicker);
    get('dtrRoutesCustomOpen').addEventListener('click',showCustom);
    get('dtrRoutesCustomCancel').addEventListener('click',hideCustom);
    get('dtrRoutesCustomDelete').addEventListener('click',deleteCustom);
    get('dtrRoutesCustomForm').addEventListener('submit',saveCustom);
    get('dtrRoutesShipSearch').addEventListener('input',event=>{
      clearTimeout(queryTimer);
      queryTimer=setTimeout(()=>renderPicker(event.target.value),100);
    });
    get('dtrRoutesShipResults').addEventListener('click',event=>{
      const button=event.target.closest('[data-dtr-ship-select]');
      if(!button)return;
      if(selectProfile(button.dataset.dtrShipSelect))closePicker();
    });
    dialog().addEventListener('close',()=>{
      document.body.classList.remove('modal-open');
      get('dtrRoutesShipPickerOpen')?.focus({preventScroll:true});
    });
    get('dtrRoutesShipDialog').querySelector('[data-route-close]')?.addEventListener('click',closePicker);
    window.visualViewport?.addEventListener('resize',viewportAdjust);
    window.visualViewport?.addEventListener('scroll',viewportAdjust);
    window.addEventListener('resize',viewportAdjust);
    get('dtrRoutesCargo').addEventListener('input',()=>{
      const value=Number(get('dtrRoutesCargo').value);
      if(Number.isInteger(value)&&value>0&&value<=current.cargo){
        availableCargo=value;save();
      }
    });
    void refreshShips();
  }
  return {
    mount,refreshShips,
    selectProfile,getCurrent:()=>current,getFavorites:()=>favorites.slice(),
    getRegistryStatus:()=>({source:catalogMode,count:catalog.length,updatedAt,customCount:customShips.length}),
    getAvailableCargo:()=>availableCargo
  };
}
