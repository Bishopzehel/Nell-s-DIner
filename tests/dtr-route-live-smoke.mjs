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
  read('npc_bases',{}),read('factions',{include_reputations:true,include_bribes:false,filter_to_useful:false})
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
  const corsair=factions.status==='fulfilled'?factions.value.find(f=>f.nickname==='fc_c_grp'):null;
  console.log('DTR TRADE LIVE DATA '+JSON.stringify({
    marketBases:ds.bases.length,creteCandidates:candidates.slice(0,12),
    defaultOrigin:origin?{id:origin.id,name:origin.name,system:origin.systemName}:null,
    corsairReputationData:ac.indexReady,corsairReputationCount:corsair?.reputations?.length||0,
    corsairExample:corsair?.reputations?.slice(0,2)||[],access:ac.counts,
    creteAccess:origin?ac.byId.get(origin.id):null
  }));
  if(!origin){console.error('PLANET CRETE DEFAULT NOT RESOLVED FROM LIVE FEED');process.exitCode=1;}
  else {
    try {
      const { gunzipSync } = await import('node:zlib');
      const { readFile } = await import('node:fs/promises');
      const { search } = await import('../trade-core/search.mjs');
      const { PROFILES } = await import('../trade-core/trade.mjs');
      const { setLaneSpeed } = await import('../dtr-route-policy.mjs');
      const nav = setLaneSpeed(JSON.parse(gunzipSync(await readFile(new URL('../trade-core/data/navigation.json.gz',import.meta.url))).toString('utf8')));
      const profile=PROFILES.find(p=>p.cargo===5000);
      const options={mode:'auto',start:origin.id,cargo:5000,capital:5000000,
        excludePobs:true,blocked:ac.blocked,allowUnknownTime:false,
        returnScope:'system',returnSystem:'',flexiblePickups:true,
        allowEmptyReturn:false,mixedCargo:true,maxMinutes:60,sort:'hourly',
        breadth:18,searchMs:12000,mixedMs:3500,maxChecks:8000,
        timeModel:{dock:30,jump:15,lane:10,charge:5}};
      const found=await search(ds,nav,profile,options);
      console.log('DTR TRADE DEFAULT SEARCH '+JSON.stringify({
        count:found.results.length,stats:found.stats,
        top:found.results.slice(0,3).map(r=>({
          profit:r.profit,seconds:r.seconds,tradeCount:r.tradeCount,
          path:[r.legs[0]?.source,...r.legs.map(l=>l.target)]
        }))
      }));
      if(!found.results.length)console.log('DTR TRADE DEFAULT SEARCH HAS NO RESULTS; USER CAN CHANGE FILTERS.');
    } catch(error) {
      console.error('DTR TRADE DEFAULT SEARCH FAILED',error.stack||String(error));
      process.exitCode=1;
    }
  }
}

const params=[
 ['npc_bases',{}],['npc_bases',{filter_to_useful:true}],
 ['factions',{}],['factions',{include_reputations:true,filter_to_useful:false}],
 ['factions',{include_reputations:true,include_bribes:false,filter_to_useful:true}]
];
const checks=await Promise.all(params.map(async ([path,body])=>{
  try{
    const items=await read(path,body);
    return {path,body,ok:true,count:Array.isArray(items)?items.length:'not-array',
      example:Array.isArray(items)&&items[0]?Object.keys(items[0]).slice(0,20):[]};
  }catch(e){return {path,body,ok:false,error:String(e)}}
}));
console.log('DTR TRADE REQUEST BODY PROBES '+JSON.stringify(checks));
