(() => {
  'use strict';
  const API='https://darkstat.dd84ai.com/api';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
  const money=v=>v===null?'—':'$'+Math.round(v).toLocaleString('en-GB');
  const rows=b=>Array.isArray(b?.shop_items??b?.shopItems??b?.goods)?(b.shop_items??b.shopItems??b.goods):[];
  const nm=i=>String(i?.name??i?.good_name??i?.commodity_name??i?.nickname??i?.good??'Unknown');
  const key=i=>n(nm(i));
  const buys=i=>{const v=i?.price_base_buys_for!==undefined?num(i.price_base_buys_for):num(i?.sell_price??i?.price_to_sell_to_base??i?.price_sell);return v!==null&&v>0?v:null;};
  const sells=i=>{const v=i?.price_base_sells_for!==undefined?(i?.base_sells===false?null:num(i.price_base_sells_for)):num(i?.price??i?.price_to_buy_from_base??i?.buy_price??i?.price_buy);return v!==null&&v>0?v:null;};
  const q=i=>num(i?.quantity??i?.amount??i?.stock);
  const bn=b=>String(b?.display_name??b?.name??b?.base_name??b?.nickname??'Unknown base');
  const loc=b=>[b?.region_name??b?.region,b?.system_name??b?.system].filter(Boolean).join(' / ')||'Location not reported';
  const tabs=document.getElementById('tabs'), frame=document.querySelector('.command-frame');
  if(!tabs||!frame)return;
  const css=document.createElement('style');
  css.textContent='.trade-routes{margin-top:16px;border:1px solid var(--line-hot);background:rgba(5,5,6,.9)}.trade-routes-head,.trade-controls,.trade-legend{padding:14px 17px;border-bottom:1px solid var(--line)}.trade-routes-head h2{margin:0;color:var(--gold);font:22px Oxanium,sans-serif}.trade-routes-head p,.trade-legend{color:var(--muted);font-size:10px;line-height:1.6}.trade-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.trade-controls label{display:grid;gap:6px;color:var(--rose);font:9px Oxanium,sans-serif}.trade-controls select,.trade-controls input,.trade-controls button{min-height:40px;padding:0 12px;border:1px solid var(--line-hot);color:var(--text);background:#080708;font:10px Oxanium,sans-serif}.trade-controls input{width:min(260px,70vw)}.trade-controls input::placeholder{color:var(--muted)}.trade-controls button{cursor:pointer}.trade-status{margin-left:auto;color:var(--gold-soft);font:8px Oxanium,sans-serif}.trade-wrap{overflow:auto}.trade-table{width:100%;min-width:740px;border-collapse:collapse;text-align:left}.trade-table th{padding:10px;color:var(--gold-soft);font:8px Oxanium,sans-serif;letter-spacing:.08em;border-bottom:1px solid var(--line)}.trade-table td{padding:11px;border-bottom:1px solid rgba(255,255,255,.06);color:var(--text);font-size:10px}.trade-table strong{display:block;color:var(--gold);font:600 10px Oxanium,sans-serif}.trade-table small{display:block;margin-top:4px;color:var(--muted);font-size:8px}.trade-margin{color:var(--good)!important}.trade-empty{padding:20px;color:var(--muted);font-size:10px;line-height:1.6}.trade-pick{margin:16px 17px;padding:16px;border:1px solid var(--line-hot);background:rgba(25,12,10,.72)}.trade-results-bar{margin:10px 0;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid #c9a67a;background:#f7eddd;color:#704626;font:600 9px Oxanium,sans-serif;letter-spacing:.07em}.trade-results-bar button{min-height:34px;padding:0 12px;border:1px solid #a94f2b;background:#a94f2b;color:#fffaf0;font:600 9px Oxanium,sans-serif;cursor:pointer}.trade-results-bar button:hover{background:#803d24}.trade-pick{background:#f1e2cb;border-color:#bd5d30;box-shadow:0 8px 22px rgba(91,52,29,.12)}.trade-pick h3{color:#794523}.trade-pick article{background:#fffaf0;border-color:#c9a67a}.trade-pick small{color:#63513e}.trade-pick strong{color:#29251f}.trade-pick .trade-margin{color:#9a4b25!important}.trade-pick-grid article:nth-child(3){background:#754326;border-color:#754326}.trade-pick-grid article:nth-child(3) small{color:#f2dfc4}.trade-pick-grid article:nth-child(3) strong{color:#fffaf0}.trade-pick-grid article:nth-child(3) .trade-margin{color:#ffd17a!important}.trade-pick h3{margin:0 0 12px;color:var(--gold);font:16px Oxanium,sans-serif}.trade-pick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.trade-pick article{padding:12px;border:1px solid var(--line);background:#090809}.trade-pick small{display:block;color:var(--muted);font:8px Oxanium,sans-serif}.trade-pick strong{display:block;margin-top:5px;color:var(--text);font:600 14px Oxanium,sans-serif}.trade-pick .trade-controls{padding:0;border:0;margin-bottom:12px}.trade-pick .trade-controls label{min-width:220px}.trade-quote-table{min-width:650px}@media(max-width:700px){.trade-pick-grid{grid-template-columns:1fr}.trade-pick .trade-controls label{min-width:100%}}.trade-routes{color:#29251f;background:#fffaf0;border-color:#a94f2b}.trade-routes-head,.trade-controls,.trade-legend{background:#fffaf0}.trade-routes-head{background:#f5ead7}.trade-routes-head h2,.trade-pick h3{color:#794523}.trade-routes-head p,.trade-legend,.trade-empty{color:#514536}.trade-controls label{color:#794523}.trade-controls select,.trade-controls input,.trade-controls button{background:#fff;color:#29251f;border-color:#a94f2b}.trade-controls select:focus,.trade-controls input:focus,.trade-controls button:hover{outline:2px solid #bd5d30;outline-offset:1px}.trade-controls input::placeholder{color:#6e6252;opacity:1}.trade-controls select option{color:#29251f;background:#fffaf0}.trade-status{color:#60381f}.trade-table th{background:#eee4d2;color:#604b35}.trade-table td{background:#fffaf0;color:#29251f}.trade-table tbody tr:nth-child(even) td{background:#f6efe3}.trade-table strong{color:#794523}.trade-table small{color:#62594e}.trade-pick{background:#edf4ee;border-color:#32805a}.trade-pick article{background:#fff;border-color:#9ab9a5}.trade-pick small{color:#465b4d}.trade-pick strong{color:#29251f}.trade-pick .trade-margin{color:#226b49!important}.trade-wrap{border-color:#a99a80}.trade-quote-table td{border-bottom-color:#ded3c1!important}';
  document.head.append(css);
  if(!tabs.querySelector('[data-view="trade-routes"]')){const b=document.createElement('button');b.className='tab';b.type='button';b.dataset.view='trade-routes';b.innerHTML='<span>04</span>TRADE ROUTES';tabs.append(b);}
  const panel=document.createElement('section');panel.id='tradeRoutesView';panel.className='view trade-routes';panel.hidden=true;
  panel.innerHTML='<header class="trade-routes-head"><p class="section-kicker">TRAFALGAR JUNKYARDS // MARKET INTELLIGENCE</p><h2>Trade Route Finder</h2><p>Compare live prices across NPC and player-owned markets. Select a commodity to inspect every quoted base, choose where to buy and sell, and see the estimated per-unit margin.</p></header><div class="trade-controls"><label>COMMODITY // SEARCH OR SELECT<input id="tradeCommodityPicker" list="tradeCommodityOptions" placeholder="Type to search or select…" autocomplete="off"><datalist id="tradeCommodityOptions"></datalist></label><label>DESIRED BASE<input id="tradeBaseSearch" type="search" placeholder="Search buy or sell base…" autocomplete="off"></label><button id="tradeRefresh" type="button">REFRESH MARKET</button><span class="trade-status" id="tradeStatus" role="status"></span></div><div class="trade-legend"><b>BASE BUYS</b> = what the base pays you. &nbsp; <b>BASE SELLS</b> = what you pay. Margin is per unit before costs; travel time is Freighter estimate if Darkstat returns it.</div><div id="tradeResults"></div>';
  frame.insertBefore(panel,document.getElementById('errorView')||null);
  let host=null,market=[],marketIndex=new Map(),marketOptions=[],selected='',commodityQueryText='',selectedSource='',selectedDestination='',showAllRoutes=false,status='LOADING MARKET',times=new Map(),serial=0,marketLoaded=false;
  function buildMarketIndex(){
    const grouped=new Map();
    market.forEach(base=>rows(base).forEach(item=>{
      const commodityKey=key(item);
      if(!commodityKey)return;
      if(!grouped.has(commodityKey))grouped.set(commodityKey,[]);
      grouped.get(commodityKey).push({base,buyFromBase:sells(item),sellToBase:buys(item),stock:q(item)});
    }));
    marketIndex=grouped;
    marketOptions=[...grouped].map(([commodityKey,quotes])=>({key:commodityKey,label:nm(rows(quotes[0].base).find(item=>key(item)===commodityKey))})).sort((a,b)=>a.label.localeCompare(b.label));
  }
  const opts=()=>marketOptions;
  const hostFrom=s=>{const found=s?.bases instanceof Map&&s.bases.get('trafalgar-junkyards')||((s?.data||[]).find(b=>n([b?.name,b?.nickname,b?.base_name,b?.display_name].join(' ')).includes('trafalgar junkyards'))||null);return found?{...found,_dtrPob:true}:null;};
  const enc=b=>{const raw=String(b?.nickname??b?.base_name??b?.name??'');if(!b?._dtrPob)return raw;try{return btoa(unescape(encodeURIComponent(raw)));}catch{return raw;}};
  const baseKey=b=>String(b?.nickname??b?.base_name??b?.name??b?.display_name??'').trim().toLowerCase();
  function paint(){
    const picker=panel.querySelector('#tradeCommodityPicker'), datalist=panel.querySelector('#tradeCommodityOptions'), results=panel.querySelector('#tradeResults'), statusNode=panel.querySelector('#tradeStatus');
    const options=opts();
    if(selected!=='all'&&!options.some(o=>o.key===selected))selected='all';
    datalist.innerHTML=options.map(o=>'<option value="'+esc(o.label)+'"></option>').join('');
    picker.value=selected==='all'?commodityQueryText:(options.find(o=>o.key===selected)?.label||commodityQueryText);picker.disabled=!options.length;
    statusNode.textContent=status;
    if(!market.length){results.innerHTML='<div class="trade-empty">Waiting for market telemetry from the Darkstat feed.</div>';return;}
    if(!options.length){results.innerHTML='<div class="trade-empty">The live market feed has no commodity price records yet.</div>';return;}
    const commodityQuery=n(commodityQueryText), baseQuery=n(panel.querySelector('#tradeBaseSearch').value);
    const chosen=(selected==='all'?options:options.filter(o=>o.key===selected)).filter(o=>!commodityQuery||n(o.label).includes(commodityQuery)), out=[];
    if(chosen.length===1){
      const item=chosen[0], quotes=marketIndex.get(item.key)||[];
      const quoteByBase=new Map(quotes.map(quote=>[baseKey(quote.base),quote]));
      const baseMap=new Map();
      market.forEach(base=>{const id=baseKey(base);if(id&&!baseMap.has(id))baseMap.set(id,base);});
      const allBaseOptions=[...baseMap.values()].sort((a,b)=>bn(a).localeCompare(bn(b))).map(base=>quoteByBase.get(baseKey(base))||{base,buyFromBase:null,sellToBase:null,stock:null});
      const dualPriceBases=allBaseOptions.filter(x=>x.buyFromBase!==null&&x.sellToBase!==null),sourceOptions=dualPriceBases,destinationOptions=dualPriceBases;
      if(!sourceOptions.some(x=>baseKey(x.base)===selectedSource))selectedSource='';
      if(!destinationOptions.some(x=>baseKey(x.base)===selectedDestination))selectedDestination='';
      const source=allBaseOptions.find(x=>baseKey(x.base)===selectedSource),destination=allBaseOptions.find(x=>baseKey(x.base)===selectedDestination);
      const hasSourcePrice=source?.buyFromBase!==null&&source?.buyFromBase!==undefined;
      const hasDestinationPrice=destination?.sellToBase!==null&&destination?.sellToBase!==undefined;
      const sameBase=!!source&&!!destination&&baseKey(source.base)===baseKey(destination.base);
      const marginText=!source||!destination?'—':!hasSourcePrice||!hasDestinationPrice?'MARGIN UNAVAILABLE':sameBase?'SAME BASE':(destination.sellToBase-source.buyFromBase>0?'+':'')+money(destination.sellToBase-source.buyFromBase);
      const marginHint=!source||!destination?'Choose both bases to calculate':!hasSourcePrice?'Source buy price is not listed':!hasDestinationPrice?'Destination sell price is not listed':sameBase?'Choose two different bases':'Before travel and other costs';
      const visibleBases=allBaseOptions.filter(x=>x.buyFromBase!==null&&x.sellToBase!==null&&(!baseQuery||n([bn(x.base),loc(x.base)].join(' ')).includes(baseQuery)));
      const pick='<section class="trade-pick"><h3>SELECT A TRADE</h3><div class="trade-controls"><label>BUY FROM // SOURCE BASE<select id="tradeSourceBase"><option value="">CHOOSE ANY SOURCE BASE</option>'+sourceOptions.map(x=>'<option value="'+esc(baseKey(x.base))+'" '+(baseKey(x.base)===selectedSource?'selected':'')+'>'+esc(bn(x.base))+' // '+money(x.buyFromBase)+(x.stock===null?'':' // STOCK '+x.stock.toLocaleString('en-GB'))+'</option>').join('')+'</select></label><label>SELL TO // DESTINATION BASE<select id="tradeDestinationBase"><option value="">CHOOSE ANY DESTINATION BASE</option>'+destinationOptions.map(x=>'<option value="'+esc(baseKey(x.base))+'" '+(baseKey(x.base)===selectedDestination?'selected':'')+'>'+esc(bn(x.base))+' // '+money(x.sellToBase)+'</option>').join('')+'</select></label></div><div class="trade-pick-grid"><article><small>BUY PRICE // BASE SELLS</small><strong>'+money(source?.buyFromBase??null)+'</strong><small>'+(source?esc(bn(source.base))+(source.stock===null?'':' // STOCK '+source.stock.toLocaleString('en-GB')):'Select a source base')+'</small></article><article><small>SELL PRICE // BASE BUYS</small><strong>'+money(destination?.sellToBase??null)+'</strong><small>'+(destination?esc(bn(destination.base)):'Select a destination base')+'</small></article><article><small>ESTIMATED MARGIN / UNIT</small><strong class="trade-margin">'+marginText+'</strong><small>'+marginHint+'</small></article></div></section>';
      results.innerHTML=pick+'<div class="trade-empty">This table shows only bases reporting both a base-sell and base-buy price. Source and destination menus include only bases reporting both prices for this commodity. Margin is before travel and other costs. Zero stock means a price is listed but none is available to buy.</div>'+(visibleBases.length?'<div class="trade-wrap"><table class="trade-table trade-quote-table"><thead><tr><th>BASE / LOCATION</th><th>BASE SELLS // BUY PRICE</th><th>BASE BUYS // SELL PRICE</th><th>STOCK</th></tr></thead><tbody>'+visibleBases.map(x=>'<tr><td><strong>'+esc(bn(x.base))+'</strong><small>'+esc(loc(x.base))+'</small></td><td>'+(x.buyFromBase===null?'—':money(x.buyFromBase))+'</td><td>'+(x.sellToBase===null?'—':money(x.sellToBase))+'</td><td>'+(x.stock===null?'—':x.stock.toLocaleString('en-GB'))+'</td></tr>').join('')+'</tbody></table></div>':baseQuery?'<div class="trade-empty">No bases with both prices match that base search.</div>':'<div class="trade-empty">No bases currently report both prices for this commodity.</div>');
      panel.querySelector('#tradeSourceBase').addEventListener('change',e=>{selectedSource=e.target.value;paint();});
      panel.querySelector('#tradeDestinationBase').addEventListener('change',e=>{selectedDestination=e.target.value;paint();});
      return;
    }
    chosen.forEach(item=>{
      const quotes=marketIndex.get(item.key)||[];
      const twoSidedQuotes=quotes.filter(x=>x.buyFromBase!==null&&x.sellToBase!==null);
      const destinations=twoSidedQuotes.sort((a,b)=>b.sellToBase-a.sellToBase);
      const sources=twoSidedQuotes;
      const matchingDestinations=baseQuery?destinations.filter(x=>n([bn(x.base),loc(x.base)].join(' ')).includes(baseQuery)):destinations;
      let best=null,hasPriceRoute=false;
      sources.forEach(source=>{
        const sourceKey=baseKey(source.base);
        if(destinations.some(destination=>baseKey(destination.base)!==sourceKey))hasPriceRoute=true;
        if(source.stock!==null&&source.stock<=0)return;
        const sourceMatches=baseQuery&&n([bn(source.base),loc(source.base)].join(' ')).includes(baseQuery);
        const candidates=baseQuery&&!sourceMatches?matchingDestinations:destinations;
        const destination=candidates.find(candidate=>baseKey(candidate.base)!==sourceKey);
        if(!destination)return;
        const route={commodity:item.label,from:source.base,to:destination.base,buy:source.buyFromBase,sell:destination.sellToBase,margin:destination.sellToBase-source.buyFromBase,stock:source.stock};
        if(!best||route.margin>best.margin)best=route;
      });
      if(!best){if(selected!=='all'||commodityQuery||baseQuery)out.push({commodity:item.label,unavailable:true,reason:hasPriceRoute?'No source base reports stock above zero.':'No matching two-sided prices are available.'});}
      else out.push(best);
    });
    out.sort((a,b)=>(b.margin??-Infinity)-(a.margin??-Infinity));
    if(!out.length){results.innerHTML='<div class="trade-empty">No routes match those search terms. Try another commodity or base name.</div>';return;}
    const compactDefault=selected==='all'&&!commodityQuery&&!baseQuery;
    const shown=compactDefault&&!showAllRoutes?out.slice(0,12):out;
    results.innerHTML='<div class="trade-empty">'+(baseQuery?'Showing routes that include the searched base; matching alternatives are shown for each commodity.':commodityQuery?'Showing results matching the commodity search.':'Showing the 12 highest-margin available routes. Select a commodity to inspect every quoted base.')+' A route buys where BASE SELLS and sells where BASE BUYS. Only bases with both prices listed are included. Margin is per unit before travel and other costs; stock at the source is shown. Routes with zero recorded source stock are excluded.</div>'+(compactDefault?'<div class="trade-results-bar"><span>SHOWING '+(showAllRoutes?'ALL '+out.length:'TOP '+Math.min(12,out.length))+' AVAILABLE ROUTES</span><button type="button" id="tradeShowAll">'+(showAllRoutes?'SHOW TOP 12':'SHOW ALL '+out.length+' ROUTES')+'</button></div>':'')+'<div class="trade-wrap"><table class="trade-table"><thead><tr><th>COMMODITY</th><th>ROUTE / LOCATION</th><th>BUY AT</th><th>SELL TO</th><th>BUY PRICE</th><th>SELL PRICE</th><th>STOCK AT SOURCE</th><th>MARGIN / UNIT</th></tr></thead><tbody>'+shown.map(x=>x.unavailable?'<tr><td><strong>'+esc(x.commodity)+'</strong></td><td colspan="7" class="trade-empty">'+esc(x.reason)+'</td></tr>':'<tr><td><strong>'+esc(x.commodity)+'</strong></td><td><strong>'+esc(bn(x.from))+' → '+esc(bn(x.to))+'</strong><small>'+esc(loc(x.from))+' → '+esc(loc(x.to))+'</small></td><td><strong>'+esc(bn(x.from))+'</strong><small>BASE SELLS</small></td><td><strong>'+esc(bn(x.to))+'</strong><small>BASE BUYS</small></td><td>'+money(x.buy)+'</td><td>'+money(x.sell)+'</td><td>'+(x.stock===null?'—':x.stock.toLocaleString('en-GB'))+'</td><td><strong class="trade-margin">'+(x.margin>0?'+':'')+money(x.margin)+'</strong><small>per unit before costs</small></td></tr>').join('')+'</tbody></table></div>';
    panel.querySelector('#tradeShowAll')?.addEventListener('click',()=>{showAllRoutes=!showAllRoutes;paint();});
  }
  async function refresh(){
    const id=++serial;status='REFRESHING MARKET…';paint();
    try{
      const [pobResponse,baseResponse]=await Promise.all([fetch(API+'/pobs',{cache:'no-store',signal:AbortSignal.timeout(18000)}),fetch(API+'/npc_bases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({}),cache:'no-store',signal:AbortSignal.timeout(18000)})]);
      if(!pobResponse.ok)throw Error('POB market HTTP '+pobResponse.status);
      const pobData=await pobResponse.json(), pobs=(Array.isArray(pobData)?pobData:(pobData.pobs||pobData.data||[])).map(b=>({...b,_dtrPob:true}));
      let npc=[];
      if(baseResponse.ok){
        const baseData=await baseResponse.json(), allBases=Array.isArray(baseData)?baseData:(baseData.bases||baseData.data||[]);
        const candidates=allBases.filter(b=>((b?.is_pob??b?.IsPob??b?.isPob)!==true)&&((b?.is_pob??b?.IsPob??b?.isPob)!==1)&&((b?.is_pob??b?.IsPob??b?.isPob)!=='true')&&b?.nickname);
        for(let i=0;i<candidates.length;i+=150){
          const chunk=candidates.slice(i,i+150), rr=await fetch(API+'/npc_bases/market_goods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(chunk.map(b=>b.nickname)),signal:AbortSignal.timeout(18000)});
          if(!rr.ok)continue;const answers=await rr.json();
          (Array.isArray(answers)?answers:[]).forEach(answer=>{
            const meta=chunk.find(b=>String(b.nickname)===String(answer.nickname));if(!meta)return;
            const goods=Array.isArray(answer.market_goods)?answer.market_goods:[];
            npc.push({...meta,shop_items:goods.map(g=>({...g,name:g.name??g.good_name??g.nickname,base_sells:g.base_sells,price_base_buys_for:g.price_base_buys_for,price_base_sells_for:g.price_base_sells_for}))});
          });
        }
      }
      if(id!==serial)return;market=[...pobs,...npc];buildMarketIndex();marketLoaded=true;times.clear();status='MARKET UPDATED // '+pobs.length+' POBS + '+npc.length+' NPC BASES // '+opts().length+' COMMODITIES';paint();
    }catch(e){if(id!==serial)return;status='NPC FEED UNAVAILABLE // USING POB QUOTES';try{const r=await fetch(API+'/pobs',{cache:'no-store',signal:AbortSignal.timeout(18000)});const data=await r.json();market=(Array.isArray(data)?data:(data.pobs||data.data||[])).map(b=>({...b,_dtrPob:true}));buildMarketIndex();marketLoaded=true;paint();}catch{market=[];paint();}}
  }
  function sync(){const s=window.DTRApp?.getState?.();if(!s)return;host=hostFrom(s);if(!marketLoaded&&Array.isArray(s.data)&&s.data.length){market=s.data;buildMarketIndex();status='LIVE FEED // '+market.length+' POBS';}if(!panel.hidden)paint();}
  tabs.addEventListener('click',e=>{const tab=e.target.closest('.tab[data-view="trade-routes"]');if(!tab)return;document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='tradeRoutesView');tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===tab));sync();if(!marketLoaded)void refresh();});
  panel.querySelector('#tradeCommodityPicker').addEventListener('input',e=>{commodityQueryText=e.target.value;const match=opts().find(o=>n(o.label)===n(e.target.value));selected=match?match.key:'all';selectedSource='';selectedDestination='';paint();});
  panel.querySelector('#tradeBaseSearch').addEventListener('input',paint);
  panel.querySelector('#tradeRefresh').addEventListener('click',()=>{sync();void refresh();});
  window.addEventListener('dtr:statechange',sync);sync();
})();