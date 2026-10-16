/* DTR FORUM // neutral Corsair transmission composer and BBCode export. */
(() => {
  'use strict';
  if (window.DTRForum) return;

  const KEYS = Object.freeze({
    current: 'dtr:forum:current:v1',
    drafts: 'dtr:forum:drafts:v1',
    identities: 'dtr:forum:identities:v1',
    lens: 'dtr:forum:lens:v1'
  });
  const ART = Object.freeze({
    top: 'https://i.imgur.com/6eYifrM.png',
    left: 'https://i.imgur.com/VylZNj1.gif',
    right: 'https://i.imgur.com/QFFOGWY.png',
    footer: 'https://i.imgur.com/5RDPUdc.png'
  });
  const DEFAULT = Object.freeze({
    sender: '', role: '', location: '', recipient: '', encryption: '',
    subject: '', opening: '', message: '', closing: '', draftName: '',
    topImage: ART.top, leftImage: ART.left, rightImage: ART.right, footerImage: ART.footer
  });
  const COLORS = Object.freeze({line:'#84070c',label:'#ad0514',gold:'#ab8f66',text:'#DCDCDC'});
  const FIELDS = Object.keys(DEFAULT);
  let current = loadObject(KEYS.current, DEFAULT);
  let drafts = loadArray(KEYS.drafts);
  let identities = loadArray(KEYS.identities);
  let saveTimer = null;
  let lens = readText(KEYS.lens, 'write');
  const $ = id => document.getElementById(id);

  function readText(key, fallback = '') {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }
  function loadObject(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' && !Array.isArray(value) ? { ...fallback, ...value } : { ...fallback };
    } catch { return { ...fallback }; }
  }
  function loadArray(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[char]);
  }
  function safeUrl(value) {
    const valueText = String(value || '').trim();
    if (!valueText) return '';
    try {
      const parsed = new URL(valueText);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
    } catch { return ''; }
  }
  function imgBbcode(url, attrs = '') {
    const safe = safeUrl(url);
    return safe ? '[img' + attrs + ']' + safe + '[/img]' : '';
  }
  function fieldValue(state, key) { return String(state?.[key] ?? '').trim(); }
  function cleanState(raw) {
    const next = {};
    FIELDS.forEach(key => { next[key] = typeof raw?.[key] === 'string' ? raw[key] : DEFAULT[key]; });
    return next;
  }
  function inlineBbcode(message) {
    return String(message || '').replace(/\*\*(.+?)\*\*/g, '[b]$1[/b]');
  }
  function messageBbcode(message) {
    return String(message || '').replace(/\r\n?/g, '\n').split('\n').map(line => {
      if (line.trim().startsWith('## ')) {
        return '[b][color=' + COLORS.label + '][size=16]' + inlineBbcode(line.trim().slice(3)) + '[/size][/color][/b]';
      }
      return inlineBbcode(line);
    }).join('\n');
  }
  function buildBbcode(raw = current) {
    const s = cleanState(raw);
    const sender = fieldValue(s, 'sender') || 'SENDER ID';
    const location = fieldValue(s, 'location') || 'LOCATION';
    const recipient = fieldValue(s, 'recipient') || 'RECIPIENT';
    const encryption = fieldValue(s, 'encryption') || 'ENCRYPTION';
    const subject = fieldValue(s, 'subject');
    const opening = fieldValue(s, 'opening');
    const closing = fieldValue(s, 'closing');
    const role = fieldValue(s, 'role');
    const body = messageBbcode(s.message.trim());
    const gold = COLORS.gold;
    const label = COLORS.label;
    const line = COLORS.line;
    const result = ['[font=Montserrat]'];

    if (imgBbcode(s.topImage)) result.push('[align=center]' + imgBbcode(s.topImage) + '[/align]');
    const left = imgBbcode(s.leftImage, ' float=left');
    const right = imgBbcode(s.rightImage, ' float=right');
    if (left || right) result.push(left + right);
    result.push('[hrc]' + line + '[/hrc][hrc]' + line + '[/hrc][pi amount=25]');
    [
      ['Sender ID', sender],
      ['Location', location],
      ['Recipient - Encryption', recipient + ' - ' + encryption]
    ].concat(subject ? [['Subject', subject]] : []).forEach(entry => {
      result.push('[color=' + label + '][size=19]' + entry[0] + '[/size][/color]');
      result.push('[indent][size=13][color=' + gold + ']' + entry[1] + '[/color][/size][/indent]');
    });
    result.push('[/pi]', '[hrc]' + line + '[/hrc][hrc]' + line + '[/hrc]');
    result.push('', '[pi amount=5][color=' + COLORS.text + ']');
    if (opening) result.push(opening, '');
    result.push('[indent]', body || 'WRITE YOUR TRANSMISSION HERE', '[/indent]', '');
    if (closing) result.push(closing, '');
    result.push('[align=right]');
    if (role) result.push(role);
    result.push('[i][b]' + sender + '[/b][/i]', '[/align]', '[/color]', '[/pi]', '');
    if (imgBbcode(s.footerImage)) result.push('[align=center]' + imgBbcode(s.footerImage) + '[/align]');
    result.push('[/font]');
    return result.join('\n');
  }
  function inlinePreview(raw) {
    let html = esc(raw);
    html = html.replace(/\[url=(https?:\/\/[^\]\s]+)\]([\s\S]*?)\[\/url\]/gi, (_match, url, text) => {
      const href = safeUrl(url.replace(/&amp;/g, '&'));
      return href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>' : text;
    });
    html = html.replace(/\[img\](https?:\/\/[^\]\s]+)\[\/img\]/gi, (_match, url) => {
      const src = safeUrl(url.replace(/&amp;/g, '&'));
      return src ? '<img src="' + esc(src) + '" alt="Forum attachment" loading="lazy">' : '[IMAGE]';
    });
    html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="dtr-forum-preview-quote">$1</blockquote>');
    html = html.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_match, inner) => {
      const entries = String(inner).split(/\[\*\]/gi).slice(1).map(line=>line.trim()).filter(Boolean);
      return entries.length ? '<ul class="dtr-forum-preview-list">' + entries.map(line=>'<li>'+line+'</li>').join('') + '</ul>' : inner;
    });
    [['b','strong'], ['i','em'], ['u','u'], ['s','s']].forEach(([tag, htmlTag]) => {
      const re = new RegExp('\\[' + tag + '\\]([\\s\\S]*?)\\[\\/' + tag + '\\]', 'gi');
      html = html.replace(re, '<' + htmlTag + '>$1</' + htmlTag + '>');
    });
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function paragraphs(text) {
    return String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(group => {
      if (!group.trim()) return '';
      if (group.trim().startsWith('## ')) {
        return '<h4>' + inlinePreview(group.trim().slice(3)) + '</h4>';
      }
      return '<p>' + inlinePreview(group).replace(/\n/g,'<br>') + '</p>';
    }).join('');
  }
  function previewBody(body) {
    const fragments = String(body || '').split(/\[spoiler=([^\]\r\n]+)\]([\s\S]*?)\[\/spoiler\]/gi);
    let html = '';
    for (let i=0; i < fragments.length; i += 3) {
      html += paragraphs(fragments[i]);
      if (i+2 < fragments.length) {
        html += '<details class="dtr-forum-spoiler"><summary>' + esc(fragments[i+1]) + '</summary><div>' + paragraphs(fragments[i+2]) + '</div></details>';
      }
    }
    return html || '<p class="dtr-forum-placeholder">WRITE A TRANSMISSION TO PREVIEW IT HERE.</p>';
  }
  function picture(url, className, alt) {
    const src = safeUrl(url);
    return src ? '<img class="' + className + '" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">' : '';
  }
  function previewMarkup(raw = current) {
    const s = cleanState(raw);
    const rows = [
      ['Sender ID', s.sender || 'SENDER ID'],
      ['Location', s.location || 'LOCATION'],
      ['Recipient - Encryption', (s.recipient || 'RECIPIENT') + ' - ' + (s.encryption || 'ENCRYPTION')]
    ];
    if (s.subject.trim()) rows.push(['Subject',s.subject]);
    return '<article class="dtr-forum-render">' +
      '<div class="dtr-forum-preview-art">' +
        picture(s.topImage,'dtr-forum-preview-logo','Corsair header') +
        '<div class="dtr-forum-preview-side">' + picture(s.leftImage,'','Left Corsair decoration') + picture(s.rightImage,'','Right Corsair decoration') + '</div>' +
      '</div>' +
      '<div class="dtr-forum-rules"></div>' +
      '<div class="dtr-forum-preview-meta">' + rows.map(row => '<div><strong>' + esc(row[0]) + '</strong><span>' + esc(row[1]) + '</span></div>').join('') + '</div>' +
      '<div class="dtr-forum-rules"></div>' +
      '<div class="dtr-forum-preview-message">' +
        (s.opening.trim() ? '<p class="dtr-forum-opening">' + inlinePreview(s.opening) + '</p>' : '') +
        '<div class="dtr-forum-preview-indented">' + previewBody(s.message) + '</div>' +
        '<div class="dtr-forum-preview-signoff">' +
          (s.closing.trim() ? '<p>' + esc(s.closing) + '</p>' : '') +
          '<span>' + esc(s.role) + '</span><strong><em>' + esc(s.sender || 'SENDER ID') + '</em></strong>' +
        '</div>' +
      '</div>' +
      picture(s.footerImage, 'dtr-forum-preview-footer', 'Corsair footer') +
      '</article>';
  }
  function status(text, tone='good') {
    const node = $('dtrForumStatus');
    if (!node) return;
    node.textContent = text;
    node.dataset.tone = tone;
  }
  function collect() {
    const draft = {};
    FIELDS.forEach(key => { draft[key] = $('dtrForum_' + key)?.value ?? current[key]; });
    return cleanState(draft);
  }
  function setFields(state) {
    FIELDS.forEach(key => {
      const node = $('dtrForum_' + key);
      if (node) node.value = state[key] || '';
    });
  }
  function render() {
    const preview = $('dtrForumPreview');
    const code = $('dtrForumCode');
    if (preview) preview.innerHTML = previewMarkup(current);
    if (code) code.value = buildBbcode(current);
    const counter = $('dtrForumCount');
    if (counter) counter.textContent = current.message.length.toLocaleString('en-GB') + ' CHARACTERS';
  }
  function persistSoon() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const saved=store(KEYS.current,current);
      status(saved ? 'LOCAL AUTOSAVE ACTIVE' : 'LOCAL STORAGE UNAVAILABLE',saved ? 'good' : 'danger');
    }, 320);
  }
  function changed() {
    current = collect();
    render();
    persistSoon();
  }
  function optionsFor(entries, prop) {
    return entries.map((entry,index) => '<option value="' + index + '">' + esc(entry[prop] || 'UNTITLED') + '</option>').join('');
  }
  function refreshLists() {
    const draft = $('dtrForumDraftList');
    if (draft) {
      const previous = draft.value;
      draft.innerHTML = '<option value="">SELECT A SAVED DRAFT</option>' + optionsFor(drafts,'name');
      if ([...draft.options].some(o=>o.value === previous)) draft.value = previous;
    }
    const sender = $('dtrForumSenderList');
    if (sender) {
      const previous = sender.value;
      sender.innerHTML = '<option value="">CUSTOM / ENTER SENDER</option>' + optionsFor(identities,'sender');
      if ([...sender.options].some(o=>o.value === previous)) sender.value = previous;
    }
    const count = $('dtrForumDraftCount');
    if (count) count.textContent = drafts.length + ' SAVED';
  }
  function saveDraft() {
    current = collect();
    const name = current.draftName.trim() || current.subject.trim() || 'Transmission ' + new Date().toLocaleString('en-GB');
    current.draftName = name;
    const record = { name, updatedAt:new Date().toISOString(), state:cleanState(current) };
    const index = drafts.findIndex(d => d.name.toLowerCase() === name.toLowerCase());
    if (index < 0) drafts.unshift(record);
    else drafts.splice(index,1,record);
    drafts = drafts.slice(0,40);
    const ok=store(KEYS.drafts,drafts);
    store(KEYS.current,current);
    setFields(current);
    refreshLists();
    render();
    status(ok ? 'DRAFT SAVED // LOCAL DEVICE' : 'DRAFT COULD NOT BE SAVED',ok?'good':'danger');
  }
  function loadDraft() {
    const index = Number($('dtrForumDraftList')?.value);
    const entry = drafts[index];
    if (!entry || $('dtrForumDraftList')?.value === '') return status('CHOOSE A DRAFT FIRST','warn');
    current = cleanState(entry.state);
    setFields(current);
    store(KEYS.current,current);
    render();
    status('DRAFT LOADED // '+ entry.name);
  }
  function removeDraft() {
    const selector = $('dtrForumDraftList');
    if (!selector?.value) return status('CHOOSE A DRAFT FIRST','warn');
    const index=Number(selector.value);
    if (!drafts[index]) return;
    if (typeof window.confirm === 'function' && !window.confirm('Delete this saved transmission draft?')) return;
    drafts.splice(index,1);
    const ok=store(KEYS.drafts,drafts);
    refreshLists();
    status(ok?'DRAFT DELETED':'DRAFT DELETE FAILED',ok?'good':'danger');
  }
  function saveSender() {
    current=collect();
    const name=current.sender.trim();
    if (!name) return status('ENTER SENDER NAME FIRST','warn');
    const person={sender:name,role:current.role,location:current.location,closing:current.closing};
    const index=identities.findIndex(i=>i.sender.toLowerCase()===name.toLowerCase());
    if(index<0) identities.push(person);
    else identities[index]=person;
    const ok=store(KEYS.identities,identities);
    refreshLists();
    status(ok?'SENDER PROFILE SAVED // LOCAL DEVICE':'SENDER SAVE FAILED',ok?'good':'danger');
  }
  function loadSender() {
    const value=$('dtrForumSenderList')?.value;
    if(value==='') return;
    const profile=identities[Number(value)];
    if(!profile) return;
    current=collect();
    ['sender','role','location','closing'].forEach(key => { current[key]=profile[key]||''; });
    setFields(current);render();persistSoon();status('SENDER PROFILE LOADED');
  }
  function removeSender() {
    const select=$('dtrForumSenderList');
    if(!select?.value) return status('CHOOSE A SAVED SENDER FIRST','warn');
    if(!identities[Number(select.value)]) return;
    if(typeof window.confirm === 'function' && !window.confirm('Delete this saved sender profile?')) return;
    identities.splice(Number(select.value),1);
    const ok=store(KEYS.identities,identities);
    refreshLists();
    status(ok?'SENDER PROFILE REMOVED':'SENDER DELETE FAILED',ok?'good':'danger');
  }
  function setLens(next) {
    if(!['write','preview','code'].includes(next)) return;
    lens=next;
    const root=$('forumView');
    if(root) root.dataset.forumLens=next;
    document.querySelectorAll('#forumView button[data-forum-lens]').forEach(button=>{
      const active=button.dataset.forumLens===next;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    });
    try { localStorage.setItem(KEYS.lens,next); }catch {}
    if(next!=='write') {current=collect();render();}
  }
  function formatSelection(kind) {
    const area=$('dtrForum_message');
    if(!area) return;
    const pairs={
      bold:['[b]','[/b]'], italic:['[i]','[/i]'], underline:['[u]','[/u]'],
      quote:['[quote]','[/quote]'], spoiler:['[spoiler=SCREENSHOTS]','[/spoiler]'],
      image:['[img]','[/img]'], url:['[url=https://]','[/url]'],
      heading:['## ',''], list:['[list]\n[*]','\n[/list]']
    };
    const pair=pairs[kind];
    if(!pair) return;
    const start=area.selectionStart ?? area.value.length;
    const end=area.selectionEnd ?? start;
    const selection=area.value.slice(start,end);
    area.setRangeText(pair[0]+selection+pair[1],start,end,'end');
    if(!selection) area.setSelectionRange(start+pair[0].length,start+pair[0].length);
    area.focus();changed();
  }
  async function copyCode() {
    current=collect();render();
    const value=buildBbcode(current);
    let copied=false;
    try {
      if(navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied=true;
      }
    }catch{}
    if(!copied){
      const code=$('dtrForumCode');
      if(code) {
        code.focus();code.select();
        try {copied=Boolean(document.execCommand('copy'));}catch{}
      }
    }
    status(copied?'BB CODE COPIED // READY FOR FORUM':'COPY BLOCKED // SELECT CODE AND COPY MANUALLY',copied?'good':'warn');
  }
  function clearMessage() {
    current=collect();
    if(current.message.trim() && typeof window.confirm === 'function' && !window.confirm('Clear the current message? Sender and recipient fields will stay.')) return;
    current.message='';
    setFields(current);render();persistSoon();
    status('MESSAGE CLEARED // SENDER SETTINGS KEPT');
  }
  function init() {
    const root=$('forumView');
    if(!root)return;
    current=cleanState(current);
    setFields(current);
    refreshLists();
    setLens(['write','preview','code'].includes(lens)?lens:'write');
    render();
    root.addEventListener('input', event => {
      if(event.target.closest('[data-forum-field]')) changed();
    });
    root.addEventListener('change', event => {
      const id=event.target.id;
      if(id==='dtrForumSenderList') {loadSender();return;}
      if(event.target.closest('[data-forum-field]')) changed();
    });
    root.addEventListener('click', event => {
      const format=event.target.closest('[data-forum-format]');
      if(format) {formatSelection(format.dataset.forumFormat);return;}
      const lensButton=event.target.closest('[data-forum-lens]');
      if(lensButton) {setLens(lensButton.dataset.forumLens);return;}
      const action=event.target.closest('[data-forum-action]')?.dataset.forumAction;
      const actions={
        copy:copyCode, save:saveDraft,load:loadDraft,
        delete:removeDraft,saveSender,removeSender,clear:clearMessage
      };
      if(action && actions[action]) actions[action]();
    });
    window.addEventListener('dtr:statechange', () => {
      if(window.DTRApp?.getState?.().view==='forum') render();
    });
    status('LOCAL AUTOSAVE ACTIVE');
  }
  window.DTRForum=Object.freeze({buildBbcode,previewMarkup,cleanState,defaultState:()=>cleanState(DEFAULT),render,getState:()=>({...current}),setLens});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
