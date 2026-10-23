import { normalizeDarkstat } from '../trade-core/trade.mjs';
import { findPlanetCrete, enrichBaseOwners, assessAccess } from '../dtr-route-policy.mjs';
const API='https://darkstat.dd84ai.com/api';
async function read(path,body){
  const timer=AbortSignal.timeout(20000);
  const args={method:'POST',signal:timer,headers:{Accept:'application/json'}};
  if(body!==undefined){args.body=JSON.stringify(body);args.headers['Content-Type']='application/json'}
  let result=await fetch(API+'/'+path,args);
  if(!result.ok)throw Error(path+' '+result.status);
  return await result.json();
}
const [pobs,commodities,npcs,factions]=await Promise.allSettled([
  read('pobs'),read('commodities',{include_market_goods:true,filter_to_useful:true}),
  read('npc_bases'),read('factions')
]);
const all={pobs,commodities,npcs,factions};
const status=Object.fromEntries(Object.entries(all).map(([key,result])=>
  [key,result.status==='fulfilled'?{status:'ok',count:Array.isArray(result.value)?result.value.length:'not-array'}:
    {status:'unavailable',reason:String(result.reason)}]));
console.log('DTR TRADE LIVE ENDPOINTS '+JSON.stringify(status));
if(pobs.status!=='fulfilled'||commodities.status!=='fulfilled')process.exitCode=1;
else{
  const ds=normalizeDarkstat(pobs.value,commodities.value);
  ds.bases=enrichBaseOwners(ds,npcs.status==='fulfilled'?npcs.value:[],pobs.value);
  const candidates=ds.bases.filter(x=>/crete/i.test(x.name||'')).map(x=>({id:x.id,name:x.name,system:x.systemName,kind:x.kind}));
  const origin=findPlanetCrete(ds.bases);
  const ac=assessAccess(ds.bases,true,factions.status==='fulfilled'?factions.value:[]);
  console.log('DTR TRADE LIVE DATA '+JSON.stringify({
    marketBases:ds.bases.length,creteCandidates:candidates.slice(0,12),
    defaultOrigin:origin?{id:origin.id,name:origin.name,system:origin.systemName}:null,
    corsairReputationData:ac.indexReady,access:ac.counts,
    creteAccess:origin?ac.byId.get(origin.id):null
  }));
  if(!origin){console.error('PLANET CRETE DEFAULT NOT RESOLVED FROM LIVE FEED');process.exitCode=1;}
}
