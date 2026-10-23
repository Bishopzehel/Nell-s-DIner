/* DTR Trade Routes: conservative docking and origin rules.
   Predictions are based on public faction relations, not a player's actual reputation. */
export const CORSAIR_FACTION = 'fc_c_grp';
export const DOCK_HOSTILE_THRESHOLD = -0.55;
export const LANE_SPEED = 2500;
// Known Corsair no-dock destinations established from player-reported behavior;
// keep the normal planet and separate landing-site market entry paired.
const CORSAIR_NO_DOCK_IDS = new Set(['li01_01_base','ew16_01_base']);
export const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const first=(obj,...keys)=>keys.map(k=>obj?.[k]).find(v=>v!==null&&v!==undefined&&v!=='');
const repNumber=value=>{if(value===undefined||value===null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const idOf=x=>String(first(x,'nickname','base_nickname','id')??'');
export function findPlanetCrete(bases){
  if(!Array.isArray(bases))return null;
  const likely=bases.filter(b=>b?.kind==='npc'&&/\bcrete\b/.test(normalize(b.name+' '+b.id)));
  const gamma=b=>/omicron gamma|omicron_gamma/.test(normalize([b.systemName,b.system].join(' ')))||/gamma/i.test(String(b.system));
  const exact=likely.filter(b=>normalize(b.name)==='planet crete'&&gamma(b));
  if(exact.length===1)return exact[0];
  const inGamma=likely.filter(gamma);
  if(inGamma.length===1)return inGamma[0];
  const nameExact=likely.filter(b=>normalize(b.name)==='planet crete');
  return nameExact.length===1?nameExact[0]:null;
}
export function enrichBaseOwners(dataset, npcBases=[], pobs=[]){
  const byId=new Map();
  for(const b of [...(Array.isArray(npcBases)?npcBases:[]),...(Array.isArray(pobs)?pobs:[])]){
    const id=idOf(b);
    if(!id)continue;
    byId.set(normalize(id),b);
  }
  return dataset.bases.map(base=>{
    const row=byId.get(normalize(base.id));
    return {...base,
      factionNickname:first(row,'faction_nickname','faction_nick','faction'),
      factionName:first(row,'faction_name','factionName','faction_display_name'),
      dockingMode:first(row,'defense_mode','docking')
    };
  });
}
export function reputationIndex(factions){
  const rows=Array.isArray(factions)?factions:[];
  const corsair=rows.find(x=>normalize(x?.nickname)===normalize(CORSAIR_FACTION))||
    rows.find(x=>normalize(x?.name)==='corsairs');
  const relation=new Map();
  const names=new Map();
  for(const row of rows)if(row?.nickname){names.set(normalize(row.nickname),row.nickname);if(row.name)names.set(normalize(row.name),row.nickname);}
  for(const r of corsair?.reputations||[]){
    const nick=first(r,'nickname','faction_nickname')||names.get(normalize(first(r,'name','faction_name')));
    const value=repNumber(first(r,'rep','reputation'));
    if(nick&&value!==null)relation.set(normalize(nick),value);
  }
  return {ready:Boolean(corsair&&Array.isArray(corsair.reputations)),names,relation};
}
export function baseAccess(base, corsairEnabled, index) {
  if(!corsairEnabled)return {state:'unverified',reason:'OTHER ID // PERSONAL REPUTATION UNKNOWN'};
  if(!base)return {state:'unverified',reason:'BASE UNKNOWN'};
  const name=normalize(base.name),system=normalize(base.systemName);
  if(CORSAIR_NO_DOCK_IDS.has(normalize(base.id))||
     (name.startsWith('planet manhattan')&&
      (system==='new york'||system.includes('manhattan atmosphere')||name.includes('landing site'))))
    return {state:'restricted',reason:'KNOWN CORSAIR NO-DOCK // MANHATTAN OR LANDING SITE'};
  if(base.kind==='pob')return {state:'unverified',reason:'POB WHITELIST / OWNER RULES UNKNOWN'};
  const owner=first(base,'factionNickname','factionName');
  if(!owner)return {state:'unverified',reason:'FACTION OWNER NOT REPORTED'};
  const nick=index?.names?.get(normalize(owner))||String(owner);
  if(normalize(nick)===normalize(CORSAIR_FACTION)||normalize(owner)==='corsairs')
    return {state:'likely',reason:'CORSAIR FACTION OWNED // PERSONAL REP UNVERIFIED'};
  const score=index?.relation?.get(normalize(nick));
  if(!Number.isFinite(score))return {state:'unverified',reason:'NO VERIFIED CORSAIR REP RELATION'};
  if(score<DOCK_HOSTILE_THRESHOLD) return {state:'restricted',score,reason:'HOSTILE CORSAIR FACTION RELATION'};
  return {state:'likely',score,reason:'CORSAIR RELATION ABOVE DOCKING THRESHOLD'};
}
export function assessAccess(bases,corsairEnabled,factions,{includeUnverified=false}={}){
  const index=reputationIndex(factions);
  const byId=new Map();
  for(const base of bases||[])byId.set(base.id,baseAccess(base,corsairEnabled,index));
  const counts={likely:[...byId.values()].filter(a=>a.state==='likely').length,
    restricted:[...byId.values()].filter(a=>a.state==='restricted').length,
    unverified:[...byId.values()].filter(a=>a.state==='unverified').length};
  // Fail CLOSED for Corsair ID. Unknown standing is NOT docking permission.
  // An explicit opt-in may include unverified candidates but never known denials.
  const blocked=corsairEnabled?[...byId].filter(([,a])=>
    a.state==='restricted'||(!includeUnverified&&a.state==='unverified')).map(([id])=>id):[];
  return {byId,indexReady:index.ready,blocked,counts,includeUnverified:Boolean(includeUnverified),
    filteredUnknown:corsairEnabled&&!includeUnverified?counts.unverified:0};
}
export function setLaneSpeed(navigation,speed=LANE_SPEED){
  if(!navigation||!Array.isArray(navigation.links))throw Error('Navigation data missing.');
  if(!(speed>0))throw Error('Invalid lane speed.');
  return {...navigation,links:navigation.links.map(link=>link.kind==='lane'?{...link,speed}:link)};
}
