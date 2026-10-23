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
assert.deepEqual(status.blocked,['remote'],'only verified hostile owners should be excluded');
assert.equal(assessAccess(withOwner,false,factions).blocked.length,0,'other player IDs are not restricted by Corsair data');
assert.equal(assessAccess(withOwner,true,[]).blocked.length,0,'unavailable faction feed cannot blacklist bases');
assert.equal(baseAccess({kind:'pob',factionName:'Corsairs'},true,reputationIndex(factions)).state,'unverified');
assert.equal(baseAccess({kind:'npc',factionName:'Liberty Navy'},true,reputationIndex(factions)).score,-0.75);
const nav=setLaneSpeed({schema:1,nodes:[],links:[{kind:'lane',speed:2250},{kind:'jump'},{kind:'cruise'}]});
assert.equal(nav.links[0].speed,2500);
assert.equal(nav.links[1].speed,undefined);
assert.throws(()=>setLaneSpeed({links:[]},0));
console.log('DTR route-policy audit passed (Crete, access, faction controls and 2500 lane model).');
