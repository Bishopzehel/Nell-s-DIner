/* DTR // Invicta shipyard. Recipe-backed hull material coverage and live POB inventory. */
(() => {
  'use strict';
  if (window.DTRShipyard) return;

  const POB_KEY='ravenna-invicta';
  const STORAGE_KEY='dtr:shipyard:invicta:hull:v1';
  const CORSAIR_IFF='fc_c_grp';
  const EXOTIC_COMPONENT='commodity_ship_part_exotic';
  const HULLS=Object.freeze([
    Object.freeze({
      key:'murmillo',label:'Murmillo',subtitle:'Corsair Battleship',
      recipeId:'ship_assembly_dsy_venator',productId:'dsy_venator_package',
      aliases:Object.freeze(['Murmillo','Murmillo-class Battleship','Corsair Battleship'])
    }),
    Object.freeze({
      key:'legate',label:'Legate',subtitle:'Corsair Dreadnought',
      recipeId:'ship_assembly_dsy_legate',productId:'dsy_legate_package',
      aliases:Object.freeze(['Legate','Corsair Dreadnought'])
    }),
    Object.freeze({
      key:'consul',label:'Consul',subtitle:'Command Battlecruiser',
      recipeId:'ship_assembly_co_battlecruiser_heavy',productId:'co_battlecruiser_heavy_package',
      aliases:Object.freeze(['Consul','Consul-class Command Battlecruiser','Corsair Command Battlecruiser'])
    }),
    Object.freeze({
      key:'archon',label:'Archon',subtitle:'Modular Miner',
      recipeId:'ship_assembly_medium_miner',productId:'medium_miner_package',
      aliases:Object.freeze(['Archon','Archon Modular Miner','Medium Miner','Modular Miner'])
    })
  ]);
  const numberFormat=new Intl.NumberFormat('en-GB');
  const moneyFormat=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
  let selected='murmillo';
  let panel=null, cards=null, detail=null, stateNode=null;
  const finite=value=> {
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);return Number.isFinite(n)?n:null;
  };
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);
  const fmt=value=>Number.isFinite(value)?numberFormat.format(Math.floor(value)):'—';
  const dollars=value=>Number.isFinite(value)?'$'+moneyFormat.format(value):'—';

  function inventory(base){
    const list=base?.shop_items??base?.shopItems??base?.goods??[];
    return Array.isArray(list)?list:[];
  }
  function itemAliases(item,fields){
    return fields.map(name=>norm(item?.[name])).filter(Boolean);
  }
  function findItem(base,requirement,extraAliases=[]){
    if(!base||!requirement)return null;
    const list=inventory(base);
    const ids=new Set([requirement.id].filter(Boolean).map(norm));
    const aliases=new Set([requirement.name,...extraAliases].filter(Boolean).map(norm));
    const idFields=['nickname','id','item_id','good_id','good'];
    const byId=list.find(item=>itemAliases(item,idFields).some(id=>ids.has(id)));
    if(byId)return byId;
    const displayFields=['name','good_name','commodity_name'];
    return list.find(item=>itemAliases(item,displayFields).some(name=>aliases.has(name)))||null;
  }
  function stock(item){return item?finite(item.quantity??item.amount??item.stock):null;}
  function buyPrice(item) {
    if(!item)return null;
    const price=window.DTRProcurementPrices?.pobPurchasePrice
      ?window.DTRProcurementPrices.pobPurchasePrice(item)
      :finite(item.price_to_sell_to_base??item.sell_price??item.price_sell);
    return price!==null&&price>0?price:null;
  }
  function sellPrice(item){
    if(!item)return null;
    const quoted=window.DTRProcurementPrices?.pobSalePrice?.(item);
    const fromItem=Object.prototype.hasOwnProperty.call(item,'dtrBaseSellPrice')
      ?finite(item.dtrBaseSellPrice)
      :finite(item.price_to_buy_from_base??item.buy_price??item.price_buy??item.price);
    const result=quoted??fromItem;
    return result!==null&&result>0?result:null;
  }
  function inputValue(item,option){
    // The only deliberate exception to BASE BUYS: Invicta produces Exotic
    // Systems and values them at its actual BASE SELLS quote (opportunity value).
    const exotic=option?.id===EXOTIC_COMPONENT;
    return {
      price:exotic?sellPrice(item):buyPrice(item),
      priceSource:exotic?'BASE SELLS':'BASE BUYS'
    };
  }
  function factor(recipe){
    return recipe?.bonuses?.find(b=>b.id===CORSAIR_IFF)?.factor??1;
  }
  function perShip(value,iff){
    const raw=Math.max(0,finite(value)??0)*Math.max(0,finite(iff)??1);
    return raw>0?Math.ceil(raw-1e-9):0;
  }
  function recipeFor(hull){
    const recipe=window.DTR_RECIPE_CATALOG?.recipes?.find(r=>r.id===hull.recipeId);
    if(!recipe||recipe.outputs?.[0]?.id!==hull.productId||!recipe.inputs?.length)return null;
    return recipe;
  }

  function analyze(hull=HULLS.find(h=>h.key===selected)||HULLS[0],base=window.DTRApp?.getState?.()?.bases?.get?.(POB_KEY)||null){
    const recipe=recipeFor(hull);
    const finishedItem=findItem(base,{id:hull.productId,name:recipe?.outputs?.[0]?.name},hull.aliases);
    const finishedStock=stock(finishedItem);
    if(!recipe){
      return {hull,base,recipe:null,recipeReady:false,finishedStock,materials:[],prerequisites:[],
        buildable:null,nextHull:null,bottleneck:null,materialCost:null,priceComplete:false};
    }
    const iff=factor(recipe);
    const materials=recipe.inputs.map(group=>{
      // Ship assembly recipes have one consumed option per component.
      const option=group.options?.[0];
      if(!option)return null;
      const required=perShip(option.qty,iff);
      const item=findItem(base,option);
      const available=stock(item);
      const {price:unitPrice,priceSource}=inputValue(item,option);
      return {
        id:option.id,name:option.name,required,stock:available,unitPrice,priceSource,
        capacity:required>0&&available!==null?Math.max(0,Math.floor(available/required)):null,
        listed:Boolean(item)
      };
    }).filter(Boolean);
    const recipeReady=materials.length===recipe.inputs.length&&materials.every(row=>row.required>0);
    if(!recipeReady)return {hull,base,recipe:null,recipeReady:false,finishedStock,materials:[],
      prerequisites:[],buildable:null,nextHull:null,bottleneck:null,materialCost:null,priceComplete:false};
    const allKnown=materials.every(row=>row.capacity!==null);
    const buildable=allKnown?Math.min(...materials.map(row=>row.capacity)):null;
    const nextHull=buildable===null?null:buildable+1;
    materials.forEach(row=>{
      row.gap=nextHull===null||row.stock===null?null:Math.max(0,nextHull*row.required-row.stock);
      row.tone=row.capacity===null?'muted':row.capacity===0?'danger':row.capacity<2?'warn':'good';
    });
    const bottleneck=allKnown?[...materials].sort((a,b)=>
      a.capacity-b.capacity||(b.gap/b.required)-(a.gap/a.required)
    )[0]:null;
    const prerequisites=(recipe.catalysts||[]).map(req=>{
      const item=findItem(base,req);
      const available=stock(item);
      return {id:req.id,name:req.name,required:req.qty,stock:available,
        tone:available===null?'muted':available>=req.qty?'good':'danger'};
    });
    const priceComplete=materials.every(row=>row.unitPrice!==null);
    const materialCost=priceComplete?materials.reduce((sum,row)=>sum+row.required*row.unitPrice,0):null;
    return {hull,base,recipe,recipeReady,finishedStock,materials,prerequisites,
      buildable,nextHull,bottleneck,materialCost,priceComplete,iff};
  }

  function hullCards(base){
    return HULLS.map(hull=>{
      const a=analyze(hull,base);
      const active=hull.key===selected;
      return '<button type="button" class="dtr-yard-hull'+(active?' active':'')+'" data-yard-hull="'+esc(hull.key)+
        '" aria-pressed="'+active+'"><span class="dtr-yard-hull-index">'+esc(hull.key.toUpperCase())+
        '</span><strong>'+esc(hull.label)+'</strong><small>'+esc(hull.subtitle)+
        '</small><span class="dtr-yard-hull-stock">IN STOCK <b>'+fmt(a.finishedStock)+'</b></span></button>';
    }).join('');
  }
  function materialMarkup(a){
    return a.materials.map(row=>{
      const stockText=row.stock===null?'NOT REPORTED':fmt(row.stock);
      const gapText=row.gap===null?'—':row.gap===0?'READY':('+'+fmt(row.gap));
      return '<tr data-tone="'+row.tone+'"><th scope="row"><strong>'+esc(row.name)+
        '</strong><small>'+esc(row.id)+'</small></th>'+
        '<td data-label="PER SHIP">'+fmt(row.required)+'</td>'+
        '<td data-label="POB STOCK">'+stockText+'</td>'+
        '<td data-label="UNIT VALUE" class="dtr-yard-unit-price">'+dollars(row.unitPrice)+
          '<small>'+row.priceSource+'</small></td>'+
        '<td data-label="NEXT SHIP">'+gapText+'</td></tr>';
    }).join('');
  }
  function prerequisitesMarkup(a){
    return a.prerequisites.map(row=>{
      const comment=row.stock===null?'NOT REPORTED':row.stock>=row.required?'AVAILABLE':'SHORT '+fmt(row.required-row.stock);
      return '<li data-tone="'+row.tone+'"><strong>'+esc(row.name)+'</strong><span>REQUIRED '+fmt(row.required)+
        '</span><small>'+esc(comment)+(row.stock===null?'':' // STOCK '+fmt(row.stock))+'</small></li>';
    }).join('');
  }
  function detailMarkup(a){
    if(!a.recipeReady)return '<div class="dtr-yard-empty" data-tone="warn">SHIP RECIPE DATA UNAVAILABLE. NO BUILD QUANTITY HAS BEEN ASSUMED.</div>';
    const known=a.buildable!==null;
    const coverageText=known?fmt(a.buildable):'—';
    const bottleneck=a.bottleneck
      ?esc(a.bottleneck.name)+(a.bottleneck.gap>0?' // +'+fmt(a.bottleneck.gap):'')
      :'STOCK UNKNOWN';
    const prerequisitesOk=a.prerequisites.every(row=>row.tone==='good');
    const readiness=!a.base?'NO FEED':!known?'STOCK INCOMPLETE':a.buildable===0?'INSUFFICIENT MATERIALS':
      !prerequisitesOk?'CHECK PREREQUISITES':'MATERIALS READY';
    const readinessTone=!a.base||!known?'muted':a.buildable===0?'danger':
      !prerequisitesOk?'warn':'good';
    return '<div class="dtr-yard-detail-head"><div><small>ACTIVE SHIPYARD RECIPE</small><h4>'+
        esc(a.hull.label)+'</h4><span>'+esc(a.hull.subtitle)+' // '+esc(a.recipe.id)+'</span></div>'+
        '<button type="button" class="dtr-yard-calc" data-yard-calculate="'+esc(a.hull.key)+'">COST / CALCULATE 1 SHIP</button></div>'+
      '<div class="dtr-yard-summary">'+
        '<div data-tone="'+readinessTone+'"><small>MATERIALS FOR</small><strong>'+coverageText+
          '</strong><span>'+esc(readiness)+'</span></div>'+
        '<div><small>BOTTLENECK / NEXT SHIP</small><strong>'+bottleneck+'</strong><span>'+
          (a.nextHull===null?'AWAITING COMPLETE STOCK FEED':'BUILD #'+fmt(a.nextHull))+'</span></div>'+
        '<div><small>EST. MATERIAL COST</small><strong>'+dollars(a.materialCost)+'</strong><span>'+
          (a.priceComplete?'BASE BUYS // EXOTIC: BASE SELLS':'BUY / SELL QUOTATION MISSING')+'</span></div>'+
      '</div>'+
      '<div class="dtr-yard-components"><div class="dtr-yard-subhead"><strong>SHIP COMPONENTS</strong><span>LIVE INVICTA STOCK // NEXT BUILD</span></div>'+
      '<div class="dtr-yard-table-wrap"><table class="dtr-yard-table"><thead><tr><th>COMPONENT</th><th>PER SHIP</th><th>POB STOCK</th><th>UNIT VALUE</th><th>NEXT SHIP</th></tr></thead><tbody>'+
        materialMarkup(a)+'</tbody></table></div></div>'+
      '<div class="dtr-yard-prerequisites"><div class="dtr-yard-subhead"><strong>BUILD PREREQUISITES</strong><span>RETAINED // NOT CONSUMED</span></div>'+
        '<ul>'+prerequisitesMarkup(a)+'</ul><p>Reported separately from material coverage. Crew and design schematics must be verified before assembly.</p></div>';
  }

  function render(){
    if(!panel||!cards||!detail||!stateNode)return;
    const state=window.DTRApp?.getState?.();
    const active=state?.view===POB_KEY;
    panel.hidden=!active;
    if(!active)return;
    const base=state?.bases?.get?.(POB_KEY)||null;
    const a=analyze(undefined,base);
    stateNode.textContent=!base?'NO POB FEED':a.recipeReady?'4 HULLS':'RECIPE UNAVAILABLE';
    stateNode.dataset.tone=!base||!a.recipeReady?'warn':'good';
    cards.innerHTML=hullCards(base);
    detail.innerHTML=detailMarkup(a);
  }
  function selectHull(key){
    if(!HULLS.some(h=>h.key===key))return false;
    selected=key;
    try{localStorage.setItem(STORAGE_KEY,key);}catch{}
    render();
    return true;
  }
  function openCalculator(hullKey=selected){
    const hull=HULLS.find(h=>h.key===hullKey);
    if(!hull||!recipeFor(hull))return false;
    return window.DTRCalculator?.openRecipe?.({
      recipeId:hull.recipeId,pobKey:POB_KEY,quantity:1,alternatives:{}
    })??false;
  }
  function init(){
    panel=document.getElementById('shipyardPanel');
    cards=document.getElementById('shipyardHulls');
    detail=document.getElementById('shipyardDetails');
    stateNode=document.getElementById('shipyardState');
    if(!panel||!cards||!detail||!stateNode)return;
    try{
      const stored=localStorage.getItem(STORAGE_KEY);
      if(HULLS.some(h=>h.key===stored))selected=stored;
    }catch{}
    panel.addEventListener('click',event=>{
      const hull=event.target.closest('[data-yard-hull]');
      if(hull){selectHull(hull.dataset.yardHull);return;}
      const calculate=event.target.closest('[data-yard-calculate]');
      if(calculate)openCalculator(calculate.dataset.yardCalculate);
    });
    render();
  }
  window.DTRShipyard=Object.freeze({
    POB_KEY,HULLS,analyze,selectHull,openCalculator,render,
    get selectedHull(){return HULLS.find(h=>h.key===selected)||HULLS[0];}
  });
  window.addEventListener('dtr:statechange',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
