import assert from 'node:assert/strict';
import { createShipController } from '../dtr-ship-controller.mjs';
const listeners=new Map(),elements=new Map(),storage=new Map();
class Element {
  constructor(id){this.id=id;this.value='';this.max='';this.hidden=false;this.open=false;
    this.textContent='';this.innerHTML='';this.style={};this.dataset={};this.listeners=new Map();}
  addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(callback);}
  fire(name,target=this){for(const fn of this.listeners.get(name)||[])fn({
    target,preventDefault(){},stopPropagation(){}
  });}
  querySelector(){return get('dummy-dialog-close');}
  focus(){}
  scrollIntoView(){}
  showModal(){this.open=true;}
  close(){this.open=false;this.fire('close');}
  reportValidity(){return true;}
  setCustomValidity(msg){this.validationMessage=msg;}
}
function get(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);}
const previous={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage};
globalThis.document={getElementById:get,body:{classList:{add(){},remove(){}}}};
globalThis.window={innerWidth:390,innerHeight:700,
  visualViewport:{height:510,offsetTop:0,addEventListener(){}},
  addEventListener(){}};
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
get('dtrRoutesCustomForm').hidden=true;
const fixtures=[
 ['dsy_mercatante','Correo',600,500,1],
 ['dsy_tribun','Hogosha Frigate',3150,500,2],
 ['dsy_corsair_transport','Corsair Transport',3600,500,2],
 ['dsy_bsgalactica','Corsair Train',4450,350,2],
 ['pilgrim_liner','Pilgrim Liner',4300,415,3],
 ['bristol_transport','Bristol Heavy Explorer',4300,415,3],
 ['dsy_advanced_train','Advanced Train',5000,350,2],
 ...Array.from({length:105},(_,i)=>['dsy_mock_'+i,'Dummy Freighter '+i,1200+i,350,2])
].map(([nickname,name,hold_size,cruise_speed,dock_type])=>
  ({nickname,name,hold_size,cruise_speed,dock_type,type:'transport'}));
let lookupCount=0,profileChanges=[];
try{
  const picker=createShipController({
    legacySettings:{profile:'freighter-3600',cargo:'2800'},
    readJson:async path=>{assert.equal(path,'ships');lookupCount++;return fixtures;},
    onChange:(ship,space)=>profileChanges.push([ship.id,space])
  });
  picker.mount();
  assert.equal(picker.getCurrent().name,'Armicustos','legacy selection should migrate');
  assert.equal(get('dtrRoutesCargo').value,'2800','old saved available cargo should survive migration');
  assert(get('dtrRoutesFavorites').innerHTML.includes('Raba'),'all 3 favorites should render');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(picker.getRegistryStatus().source,'LIVE DARKSTAT');
  assert.equal(picker.getRegistryStatus().count,fixtures.length);
  assert.equal(lookupCount,1,'one catalog request rather than a request per search keystroke');
  assert.equal(picker.getCurrent().dock,'medium');

  get('dtrRoutesShipPickerOpen').fire('click');
  assert.equal(get('dtrRoutesShipDialog').open,true);
  assert(get('dtrRoutesShipResults').innerHTML.includes('Bulwark'),'ship chooser should list Bulwark');
  assert(get('dtrRoutesShipDialog').style.maxHeight.endsWith('px'),'mobile dialog should stay above keyboard');
  const choice={closest:selector=>selector==='[data-dtr-ship-select]'?
    {dataset:{dtrShipSelect:'ship:bristol_transport'}}:null};
  get('dtrRoutesShipResults').fire('click',choice);
  assert.equal(picker.getCurrent().name,'Bulwark','ship chooser should change ship');
  assert.equal(picker.getCurrent().cruise,415);
  assert.equal(picker.getCurrent().dock,'large','dock type must change with the selected ship');
  assert.equal(get('dtrRoutesCargo').max,'4300');
  assert.equal(get('dtrRoutesCargo').value,'4300','new selection should reset to full ship capacity');
  assert.equal(get('dtrRoutesShipDialog').open,false);

  get('dtrRoutesFavorites').fire('click',{
    closest:selector=>selector==='[data-dtr-ship-pin]'?{dataset:{dtrShipPin:'0'}}:null
  });
  assert.equal(picker.getFavorites()[0],'ship:bristol_transport','pin current ship to favorite slot');
  get('dtrRoutesFavorites').fire('click',{
    closest:selector=>selector==='[data-dtr-favorite]'?{dataset:{dtrFavorite:'1'}}:null
  });
  assert.equal(picker.getCurrent().name,'Armicustos','favorite button should select complete ship profile');
  assert.equal(picker.getCurrent().dock,'medium');

  get('dtrRoutesCustomOpen').fire('click');
  assert.equal(get('dtrRoutesCustomForm').hidden,false);
  get('dtrRoutesCustomName').value='My Own Hauler';
  get('dtrRoutesCustomCargo').value='2710';
  get('dtrRoutesCustomSpeed').value='478';
  get('dtrRoutesCustomDock').value='1';
  get('dtrRoutesCustomForm').fire('submit');
  assert.equal(get('dtrRoutesCustomForm').hidden,true);
  assert.equal(picker.getCurrent().name,'My Own Hauler');
  assert.equal(picker.getCurrent().cargo,2710);
  assert.equal(picker.getCurrent().cruise,478);
  assert.equal(picker.getCurrent().dock,'berth');
  assert.equal(get('dtrRoutesCargo').max,'2710');
  assert.equal(get('dtrRoutesCargo').value,'2710');
  const id=picker.getCurrent().id;
  assert(id.startsWith('custom:'));
  assert(storage.has('dtr:trade-routes:ship-preferences:v1'),
    'custom profiles and favorites must persist locally');

  get('dtrRoutesCustomOpen').fire('click');
  assert.equal(get('dtrRoutesCustomDelete').hidden,false,'custom profile can be deleted');
  get('dtrRoutesCustomSpeed').value='499';
  get('dtrRoutesCustomForm').fire('submit');
  assert.equal(picker.getCurrent().id,id,'editing an existing profile must preserve its ID');
  assert.equal(picker.getCurrent().cruise,499);
  get('dtrRoutesCustomOpen').fire('click');
  get('dtrRoutesCustomDelete').fire('click');
  assert.equal(picker.getCurrent().id,'ship:dsy_corsair_transport');
  assert(!storage.get('dtr:trade-routes:ship-preferences:v1').includes('My Own Hauler'),
    'deletion must persist without stale profiles');
  assert(profileChanges.length>=6,'real changes should invalidate route results');
  console.log('DTR ship UI runtime passed (live catalog, 3 favorites, mobile picker, Bulwark, legacy cargo, custom save/edit/delete).');
}finally{
  for(const [key,value] of Object.entries(previous)){
    if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
}
