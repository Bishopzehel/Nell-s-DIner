import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(join(root,'dtr-procurement-prices.js'),'utf8');
const sourceItems=[
  {nickname:'commodity_ship_part_exotic',quantity:100,
   price_to_sell_to_base:1,price_to_buy_from_base:50000,price:50000},
  {nickname:'commodity_ship_part_reactor',quantity:200,
   price_to_sell_to_base:10,price_to_buy_from_base:999,price:999},
  {nickname:'commodity_ship_part_interior',quantity:300,
   price_to_sell_to_base:9,price:45000},
  {nickname:'commodity_ship_part_avionics',quantity:400,price_to_sell_to_base:1}
];
const original={shop_items:sourceItems};
const app={getState(){return {bases:new Map([['ravenna-invicta',original]]),previousBases:new Map([['ravenna-invicta',original]])}}};
const sandbox={
 window:{DTRApp:app,addEventListener(){},setTimeout(){}},
 document:{documentElement:{dataset:{}},readyState:'loading',addEventListener(){},querySelectorAll(){return[];}},
 Map
};
runInNewContext(source,sandbox);
const pricing=sandbox.window.DTRProcurementPrices;
assert(pricing,'procurement adapter must initialize');
assert.equal(sandbox.document.documentElement.dataset.dtrProcurementPrice,'base-buys');
assert.equal(pricing.pobPurchasePrice(sourceItems[0]),1,'incoming Exotic Systems offer is only $1');
assert.equal(pricing.pobSalePrice(sourceItems[0]),50000,'outgoing Exotic Systems quote is $50,000');
const adapted=pricing.adaptBase(original);
const exotic=adapted.shop_items[0];
assert.equal(exotic.price,1,'existing generic cost tools must still see incoming $1 quote');
assert.equal(exotic.dtrBaseSellPrice,50000,'sale quote must survive adapter normalization');
assert.equal(exotic.price_to_buy_from_base,50000,'original explicit Darkstat quote must be kept');
assert.equal(pricing.pobSalePrice(exotic),50000,'shipyard must read original outgoing quote on adapted item');
assert.equal(pricing.pobPurchasePrice(exotic),1,'BASE BUYS must remain unchanged');
const reactor=adapted.shop_items[1];
assert.equal(pricing.pobPurchasePrice(reactor),10,'all other materials retain their purchasing quote');
assert.equal(reactor.dtrBaseSellPrice,999,'non-Exotic sale quote may be retained without changing the purchase valuation');
const legacySale=adapted.shop_items[2];
assert.equal(legacySale.dtrBaseSellPrice,45000,'legacy native item.price is preserved as original BASE SELLS quote');
assert.equal(legacySale.price,9,'legacy generic price is still normalized to BASE BUYS for normal cost tools');
const noSale=adapted.shop_items[3];
assert.equal(noSale.dtrBaseSellPrice,null,'missing BASE SELLS quote must remain unknown');
assert.equal(pricing.pobSalePrice(noSale),null,'adapted BASE BUYS of $1 must not leak into missing sale quote');
assert.equal(noSale.price,1,'valid incoming buy quote must remain unaffected');
const current=sandbox.window.DTRApp.getState();
assert.equal(current.bases.get('ravenna-invicta').shop_items[0].dtrBaseSellPrice,50000,'DTRApp state access must expose sale quote');
assert.equal(current.previousBases.get('ravenna-invicta').shop_items[0].dtrBaseSellPrice,50000,'previous state must preserve sale quote');
assert.equal(original.shop_items[0].price,50000,'adapter must never overwrite raw Darkstat input');
console.log('DTR price-direction audit passed (BASE BUYS vs BASE SELLS, Exotic and missing-quote preservation).');
