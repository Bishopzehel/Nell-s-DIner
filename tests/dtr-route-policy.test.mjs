import assert from 'node:assert/strict';
import { findPlanetCrete,enrichBaseOwners,reputationIndex,baseAccess,assessAccess,setLaneSpeed,LANE_SPEED } from '../dtr-route-policy.mjs';
assert.equal(LANE_SPEED,2500);
const bases=[
{id:'planet_crete',name:'Planet Crete',system:'om_gamma',systemName:'Omicron Gamma',kind:'npc'},
{id:'remote',name:'Station Liberty',system:'li01',kind:'npc'},
{id:'friend',name:'Friendly Station',kind:'npc'},
{id:'unknown',name:'Unnamed Port',kind:'npc'},
{id:'pob',name:'Private Base',kind:'pob'}];
assert.equal(findPlanetCrete(bases)?.id,'planet_crete');
assert.equal(findPlanetCrete([{id:'planet_not_crete',name:'Planet Crete',kind:'npc',systemName:'New London'},{...bases[0]}])?.id,'planet_crete');
assert.equal(findPlanetCrete([{id:'other',name:'Planet Malta',kind:'npc'}]),null,'no invented Crete default');
const withOwner=enrichBaseOwners({bases},[
{nickname:'planet_crete',faction_name:'Corsairs'},
{nickname:'remote',faction_name:'Liberty Navy'},
{nickname:'friend',faction_nickname:'gd_z_grp'}]);
const factions=[
{nickname:'fc_c_grp',name:'Corsairs',reputations:[{nickname:'li_n_grp',rep:-0.75},{nickname:'gd_z_grp',rep:0.1}]},
{nickname:'li_n_grp',name:'Liberty Navy',reputations:[]},
{nickname:'gd_z_grp',name:'Zoners',reputations:[]}];
const status=assessAccess(withOwner,true,factions);
assert(status.indexReady);
assert.equal(status.byId.get('planet_crete').state,'likely');
assert.equal(status.byId.get('remote').state,'restricted');
assert.equal(status.byId.get('friend').state,'likely');
assert.equal(status.byId.get('pob').state,'unverified');
assert.equal(status.byId.get('unknown').state,'unverified');
assert.deepEqual(status.blocked,['remote','unknown','pob'],
  'Corsair ON must reject both known hostile and unknown docking by default');
assert.equal(assessAccess(withOwner,false,factions).blocked.length,0,'other player IDs are not restricted by Corsair data');
const missingReps=assessAccess(withOwner,true,[]);
assert.deepEqual(missingReps.blocked,['remote','friend','unknown','pob'],
  'a missing faction feed must fail closed instead of inventing docking access');
const override=assessAccess(withOwner,true,factions,{includeUnverified:true});
assert.deepEqual(override.blocked,['remote'],
  'explicit unverified-dock opt-in must still exclude known hostile NPCs');
const manhattan={
  id:'li01_01_base',name:'Planet Manhattan',systemName:'New York',
  kind:'npc',factionName:'Liberty Police, Inc.'
};
const landing={
  id:'ew16_01_base',name:'Planet Manhattan, Landing Site',systemName:'Planet Manhattan Atmosphere',
  kind:'npc',factionName:'Freelancers'
};
const otherLanding={id:'x_new',name:'Planet Manhattan, Landing Site',
  systemName:'Planet Manhattan Atmosphere',kind:'npc',factionName:'Freelancers'};
const rebuiltFactions=[
  ...factions,
  {nickname:'fc_freelancer',name:'Freelancers',reputations:[]},
  {nickname:'li_p_grp',name:'Liberty Police, Inc.',reputations:[]}
];
const index=reputationIndex([
  {...factions[0],reputations:[...factions[0].reputations,
    {nickname:'fc_freelancer',rep:0},{nickname:'li_p_grp',rep:-0.65}]},
  ...rebuiltFactions.slice(1)
]);
assert.equal(baseAccess(manhattan,true,index).state,'restricted');
assert.equal(baseAccess(landing,true,index).state,'restricted',
  'separate Manhattan landing site must not escape through neutral Freelancer ownership');
assert.equal(baseAccess(otherLanding,true,index).state,'restricted','Manhattan site name fallback required');
const denied=assessAccess([manhattan,landing,otherLanding],true,[
  {...factions[0],reputations:[...factions[0].reputations,
    {nickname:'fc_freelancer',rep:0},{nickname:'li_p_grp',rep:-0.65}]},
  ...rebuiltFactions.slice(1)
],{includeUnverified:true});
assert.deepEqual(denied.blocked,['li01_01_base','ew16_01_base','x_new'],
  'even allowing unknown docks must never override known Manhattan denial');
assert.equal(assessAccess([manhattan,landing],false,factions).blocked.length,0,
  'other-faction users may search without the Corsair-only bans');
assert.equal(baseAccess({kind:'pob',factionName:'Corsairs'},true,reputationIndex(factions)).state,'unverified');
assert.equal(baseAccess({kind:'npc',factionName:'Liberty Navy'},true,reputationIndex(factions)).score,-0.75);
const nav=setLaneSpeed({schema:1,nodes:[],links:[{kind:'lane',speed:2250},{kind:'jump'},{kind:'cruise'}]});
assert.equal(nav.links[0].speed,2500);
assert.equal(nav.links[1].speed,undefined);
assert.throws(()=>setLaneSpeed({links:[]},0));
console.log('DTR route-policy audit passed (fail-closed unknown docks, Manhattan, Corsair toggle, 2500 lanes).');
