import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const [catalogSource,shipyardSource]=await Promise.all([
 readFile(join(root,'recipe-catalog.js'),'utf8'),
 readFile(join(root,'dtr-shipyard.js'),'utf8')
]);
const catalogWindow={};
runInNewContext(catalogSource,{window:catalogWindow});
const catalog=catalogWindow.DTR_RECIPE_CATALOG;
const prices={
  commodity_ship_part_avionics:10,
  commodity_ship_part_interior:10,
  commodity_ship_part_propulsion:10,
  commodity_ship_part_superstructure:10,
  commodity_ship_part_reactor:10,
  commodity_ship_part_exotic:10
};
const components=Object.entries(prices).map(([nickname,buy])=>({
 nickname,name:nickname,quantity:1000,
 price_to_sell_to_base:buy,price_to_buy_from_base:999
}));
const base={shop_items:[
 ...components,
 {nickname:'dsy_venator_package',name:'Corsair Battleship',quantity:2},
 {nickname:'dsy_legate_package',name:'Corsair Dreadnought',quantity:3},
 {nickname:'co_battlecruiser_heavy_package',name:'Corsair Command Battlecruiser',quantity:1},
 {nickname:'medium_miner_package',name:'Modular Miner',quantity:4},
 {nickname:'commodity_crew',name:'Crew',quantity:1200},
 {nickname:'blueprint_medium_miner',name:'Archon Design Schematics',quantity:1}
]};
const appState={view:'ravenna-invicta',bases:new Map([['ravenna-invicta',base]])};
const listeners={};
const calculatorCalls=[];
const save=new Map();
const elements={
 shipyardPanel:{hidden:true,addEventListener(type,listener){listeners[type]=listener;}},
 shipyardHulls:{innerHTML:''},
 shipyardDetails:{innerHTML:''},
 shipyardState:{textContent:'',dataset:{}}
};
const context={
 console,Intl,Map,Set,
 localStorage:{getItem(k){return save.get(k)??null;},setItem(k,v){save.set(k,String(v));}},
 document:{readyState:'complete',getElementById(id){return elements[id]||null;}},
 window:{
  DTR_RECIPE_CATALOG:catalog,
  DTRApp:{getState(){return appState;}},
  DTRCalculator:{openRecipe(options){calculatorCalls.push(options);return true;}},
  DTRProcurementPrices:{
    pobPurchasePrice(item){
      const n=Number(item?.price_to_sell_to_base);
      return Number.isFinite(n)&&n>0?n:null;
    }
  },
  addEventListener(type,handler){listeners['window:'+type]=handler;}
 }
};
runInNewContext(shipyardSource,context);
const yard=context.window.DTRShipyard;
assert(yard,'Invicta shipyard must register');
assert.equal(yard.POB_KEY,'ravenna-invicta','shipyard must belong only to Invicta');
assert.deepEqual(Array.from(yard.HULLS,h=>h.key),['murmillo','legate','consul','archon'],'four specified hulls must exist');
const ids=['ship_assembly_dsy_venator','ship_assembly_dsy_legate','ship_assembly_co_battlecruiser_heavy','ship_assembly_medium_miner'];
assert.deepEqual(Array.from(yard.HULLS,h=>h.recipeId),ids,'shipyard must map hulls to verified recipes');
assert(!elements.shipyardPanel.hidden,'shipyard must render for Invicta');
assert(elements.shipyardHulls.innerHTML.includes('Murmillo'),'hull selector must render');
assert(elements.shipyardHulls.innerHTML.includes('Legate'),'hull selector must render all hulls');
assert(elements.shipyardHulls.innerHTML.includes('Consul'),'hull selector must render Corsair Consul');
assert(elements.shipyardHulls.innerHTML.includes('Archon'),'hull selector must render Archon');
assert(elements.shipyardDetails.innerHTML.includes('SHIP COMPONENTS'),'selected hull needs material detail');

const [murmillo,legate,consul,archon]=yard.HULLS;
const m=yard.analyze(murmillo,base);
assert.equal(m.recipeReady,true);
assert.equal(m.finishedStock,2,'ship stock must match exact output package ID');
assert.deepEqual(Array.from(m.materials,r=>r.required),[42,42,43,60,43,53],'Murmillo must use exact recipe materials');
assert.equal(m.buildable,16,'1000 of every component supports 16 Murmillos');
assert.equal(m.bottleneck.name,'Superstructure Systems');
assert.equal(m.bottleneck.gap,20,'next 17th Murmillo requires 20 more Superstructure Systems');
assert.equal(m.materialCost,2830,'material cost must use BASE BUYS not BASE SELLS');
assert.equal(m.priceComplete,true);
const l=yard.analyze(legate,base);
assert.equal(l.finishedStock,3,'Legate stock must not be confused with Murmillo');
assert.equal(l.buildable,16,'Legate must use its own recipe');
const c=yard.analyze(consul,base);
assert.equal(c.recipe.name,'Corsair Command Battlecruiser','Consul must resolve the catalog Corsair Command Battlecruiser');
assert.deepEqual(Array.from(c.materials,r=>r.required),[343,439,426,255,346,317],
  'Consul must use its own heavy battlecruiser requirements');
assert.equal(c.materialCost,21260);
assert.equal(c.buildable,2);
assert.equal(c.finishedStock,1);
const a=yard.analyze(archon,base);
assert.equal(a.recipe.outputs[0].id,'medium_miner_package');
assert.equal(a.finishedStock,4,'Archon finished ship must be distinguished from schematics');
assert.equal(a.buildable,4);
assert.equal(a.materials.length,5,'Archon does not consume Exotic Systems');
assert(a.prerequisites.some(row=>row.id==='commodity_crew'&&row.required===400),'Archon requires retained Crew');
assert(a.prerequisites.some(row=>row.id==='blueprint_medium_miner'&&row.required===1),
  'Archon requires a separately reported design schematic');
assert.equal(a.materialCost,(180+138+223+197+205)*10,'retained schematics and crew must not enter material costs');

// Unreported stocks are unknown, never silently treated as zero.
const incompleteBase={shop_items:base.shop_items.filter(row=>row.nickname!=='commodity_ship_part_exotic')};
const incomplete=yard.analyze(murmillo,incompleteBase);
assert.equal(incomplete.buildable,null,'unlisted component must not invent a buildable quantity');
assert.equal(incomplete.nextHull,null);
assert.equal(incomplete.bottleneck,null);
assert.equal(incomplete.materials.find(row=>row.name==='Exotic Systems').stock,null);
const noFeed=yard.analyze(murmillo,null);
assert.equal(noFeed.buildable,null,'no POB telemetry is unknown, not zero');
const badPriceBase={shop_items:base.shop_items.map(row=>row.nickname==='commodity_ship_part_reactor'
 ?{...row,price_to_sell_to_base:null,price_to_buy_from_base:999}:row)};
const priceGap=yard.analyze(murmillo,badPriceBase);
assert.equal(priceGap.priceComplete,false,'selling price may not substitute for missing BASE BUYS quote');
assert.equal(priceGap.materialCost,null,'incomplete material price must not be silently converted to zero');

// If a recipe is missing, do not render copied requirements from a different hull.
const fullCatalog=context.window.DTR_RECIPE_CATALOG;
context.window.DTR_RECIPE_CATALOG={recipes:catalog.recipes.filter(r=>r.id!==consul.recipeId)};
const missingRecipe=yard.analyze(consul,base);
assert.equal(missingRecipe.recipeReady,false);
assert.equal(missingRecipe.buildable,null);
assert.deepEqual(Array.from(missingRecipe.materials),[]);
context.window.DTR_RECIPE_CATALOG=fullCatalog;

// Each hull has one dedicated selection and a calculator bridge scoped to Invicta.
const before=calculatorCalls.length;
assert(yard.selectHull('consul'));
assert.equal(yard.selectedHull.key,'consul');
assert.equal(save.get('dtr:shipyard:invicta:hull:v1'),'consul','ship selector should persist locally');
assert(elements.shipyardDetails.innerHTML.includes('BUILD PREREQUISITES'));
assert(yard.openCalculator('consul'));
assert.equal(calculatorCalls.length,before+1);
assert.equal(calculatorCalls.at(-1).recipeId,'ship_assembly_co_battlecruiser_heavy');
assert.equal(calculatorCalls.at(-1).pobKey,'ravenna-invicta');
assert.equal(calculatorCalls.at(-1).quantity,1);
assert.equal(yard.selectHull('invalid'),false,'unknown hull should not override selection');

listeners.click({target:{closest(selector){
 return selector==='[data-yard-hull]'?{dataset:{yardHull:'archon'}}:null;
}}});
assert.equal(yard.selectedHull.key,'archon','hull selector click must change selection');
listeners.click({target:{closest(selector){
 return selector==='[data-yard-calculate]'?{dataset:{yardCalculate:'archon'}}:null;
}}});
assert.equal(calculatorCalls.at(-1).recipeId,'ship_assembly_medium_miner','button should calculate selected Archon');
appState.view='deterrence-sanctum';
yard.render();
assert(elements.shipyardPanel.hidden,'shipyard must be hidden outside Invicta');
console.log('DTR shipyard runtime audit passed (4 hull recipes, stock, costs, prerequisites and calculator).');
