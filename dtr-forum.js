/* DTR FORUM // neutral Corsair transmission composer and BBCode export. */
(() => {
  'use strict';
  if (window.DTRForum) return;

  const KEYS = Object.freeze({
    current: 'trafalgar:forum:current:v1',
    drafts: 'trafalgar:forum:drafts:v1',
    identities: 'trafalgar:forum:identities:v1',
    lens: 'trafalgar:forum:lens:v1',
    personalImageMigrated: 'trafalgar:forum:personal-image-migrated:v1'
  });
  const ART = Object.freeze({
    top: '',
    right: '',
    footer: ''
  });
  const DEFAULT = Object.freeze({
    sender: '', role: '', location: '', recipient: '', destination: '', encryption: '', rightImage: '',
    subject: '', opening: '', message: '', closing: '', draftName: '',
    topImage: ART.top, leftImage: '', footerImage: ART.footer
  });
  const COLORS = Object.freeze({line:'#C47A3A',label:'#C47A3A',gold:'#FF8000',text:'#29251F'});
  const FIELDS = Object.keys(DEFAULT);
  let current = loadObject(KEYS.current, DEFAULT);
  let drafts = loadArray(KEYS.drafts);
  let identities = loadArray(KEYS.identities);
  let saveTimer = null;
  let copyFeedbackTimer = null;
  let lens = readText(KEYS.lens, 'write');
  // Previous builds accidentally prefilled this personal Aurelio image for everyone.
  // Remove that inherited default once; explicitly re-entered URLs remain valid.
  const LEGACY_PERSONAL_IMAGE = 'https://i.imgur.com/VylZNj1.gif';
  const $ = id => document.getElementById(id);

  function readText(key, fallback = '') {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }
  function loadObject(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' && !Array.isArray(value) ? cleanState(value) : cleanState(fallback);
    } catch { return { ...fallback }; }
  }
  function loadArray(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  function removeInheritedImage(value) {
    if (!value || typeof value !== 'object') return value;
    return String(value.leftImage || '').trim() === LEGACY_PERSONAL_IMAGE
      ? { ...value, leftImage: '' }
      : value;
  }

  function migrateOldPersonalImage() {
    // Do not repeat on later visits: somebody may intentionally use this URL.
    if (readText(KEYS.personalImageMigrated) === '1') return;
    const originalCurrent = current;
    const originalDrafts = drafts;
    const originalIdentities = identities;
    current = removeInheritedImage(current);
    drafts = drafts.map(entry => {
      if (!entry?.state || typeof entry.state !== 'object') return entry;
      const state = removeInheritedImage(entry.state);
      return state === entry.state ? entry : { ...entry, state };
    });
    identities = identities.map(removeInheritedImage);
    const changedCurrent = current !== originalCurrent;
    const changedDrafts = drafts.some((entry, i) => entry !== originalDrafts[i]);
    const changedIdentities = identities.some((entry, i) => entry !== originalIdentities[i]);
    const saved = (!changedCurrent || store(KEYS.current, current))
      && (!changedDrafts || store(KEYS.drafts, drafts))
      && (!changedIdentities || store(KEYS.identities, identities));
    if (saved) {
      try { localStorage.setItem(KEYS.personalImageMigrated, '1'); } catch {}
    }
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
    const destination = fieldValue(s, 'destination') || 'DESTINATION';
    const subject = fieldValue(s, 'subject') || 'Transmission subject';
    const opening = fieldValue(s, 'opening') || 'To whom it may concern,';
    const closing = fieldValue(s, 'closing');
    const role = fieldValue(s, 'role');
    const body = messageBbcode(s.message.trim()) || 'WRITE YOUR TRANSMISSION HERE';
    const right = safeUrl(s.rightImage);
    const result = ['[quote="' + sender + '"]'];
    result.push('[align=center][size=large][b]— TRAFALGAR STATION // JUNKERS OFFICES —[/b][/size]');
    result.push('[i]Junkers of Trafalgar Station[/i][/align]', '');
    result.push('[table][tr][td]');
    result.push('[size=20][b][color=' + COLORS.line + ']TRANSMISSION // PRIORITY REQUEST[/color][/b][/size]', '');
    result.push('[size=medium][b]From :[/b] [color=#FF8000]' + sender + '[/color][/size]');
    result.push('[size=medium][b]Station :[/b][color=#FF8000] ' + location + '[/color][/size]');
    result.push('[size=medium][b]To :[/b][color=#FF8000] ' + recipient + '[/color][/size]');
    result.push('[size=medium][b]Destination :[/b] [color=#FF8000]' + destination + '[/color][/size]', '');
    result.push('[size=large][b]Subject :[/b][/size] [size=medium][color=#FF8040][b][u]' + subject + '[/u][/b][/color][/size]');
    result.push('[/td]');
    if (right) result.push('[td][align=right][img]' + right + '[/img]' + '[br][size=small][i]' + sender + '[/i][/size][/align][/td]');
    result.push('[/tr][/table]', '', '[hr]', '', opening, '', body, '');
    result.push('[hr]', '');
    if (closing) result.push(closing, '');
    if (role) result.push('[i]' + role + '[/i]', '');
    result.push('[i]Available via station communications[/i]', '');
    result.push('[align=center][size=small][i]“Nothing useful stays lost forever.”[/i][/size][/align]');
    result.push('[/quote]');
    return result.join('\\n');
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
      ['From :', s.sender || 'SENDER ID'],
      ['Station :', s.location || 'LOCATION'],
      ['To :', s.recipient || 'RECIPIENT'],
      ['Destination :', s.destination || 'DESTINATION']
    ];
    return '<article class="dtr-forum-render dtr-trafalgar-template">' +
      '<header class="dtr-template-title"><strong>— TRAFALGAR STATION // JUNKERS OFFICES —</strong><em>Junkers of Trafalgar Station</em></header>' +
      '<div class="dtr-template-letterhead">' +
        '<div class="dtr-template-details"><h3>TRANSMISSION // PRIORITY REQUEST</h3>' +
        rows.map(row => '<p><b>' + esc(row[0]) + '</b> <span>' + esc(row[1]) + '</span></p>').join('') +
        '<p class="dtr-template-subject"><b>Subject :</b> <u>' + esc(s.subject || 'Transmission subject') + '</u></p></div>' +
        '<div class="dtr-template-portrait">' + picture(s.rightImage,'dtr-forum-preview-crest','Sender character portrait') + '<small>' + esc(s.sender || 'SENDER ID') + '</small></div>' +
      '</div><hr><div class="dtr-forum-preview-message">' +
        '<p class="dtr-forum-opening">' + inlinePreview(s.opening.trim() || 'To whom it may concern,') + '</p>' +
        '<div class="dtr-forum-preview-indented">' + previewBody(s.message) + '</div>' +
        '<div class="dtr-forum-preview-signoff">' +
          (s.closing.trim() ? '<p>' + esc(s.closing) + '</p>' : '') +
          (s.role.trim() ? '<span>' + esc(s.role) + '</span>' : '') +
          '<strong><em>' + esc(s.sender || 'SENDER ID') + '</em></strong><span>Available via station communications</span>' +
        '</div><hr><p class="dtr-template-motto">“Nothing useful stays lost forever.”</p>' +
      '</div></article>';
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
    const person={sender:name,role:current.role,location:current.location,closing:current.closing,leftImage:current.leftImage};
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
    ['sender','role','location','closing','leftImage'].forEach(key => { current[key]=profile[key]||''; });
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
  // The generated BBCode panel is hidden on mobile WRITE/PREVIEW lenses.
  // A temporary, selectable textarea keeps the legacy copy path usable in Samsung Internet.
  function copyWithSelection(value) {
    if (typeof document.execCommand !== 'function') return false;
    const field=document.createElement('textarea');
    field.value=value;
    field.setAttribute('readonly','');
    field.setAttribute('aria-hidden','true');
    field.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;font-size:16px;';
    const previous=document.activeElement;
    let copied=false;
    try {
      document.body.appendChild(field);
      field.focus({preventScroll:true});
      field.select();
      field.setSelectionRange?.(0,value.length);
      copied=Boolean(document.execCommand('copy'));
    } catch {
      copied=false;
    } finally {
      field.remove();
      if (previous?.isConnected) {
        try {previous.focus({preventScroll:true});} catch {}
      }
    }
    return copied;
  }

  function showCopyFeedback(copied) {
    const message=copied
      ? 'BB CODE COPIED // READY TO PASTE IN DISCOVERY'
      : 'AUTO-COPY BLOCKED // BB CODE SELECTED FOR MANUAL COPY';
    const feedback=$('dtrForumCopyFeedback');
    if (feedback) {
      feedback.textContent=message;
      feedback.dataset.tone=copied?'good':'warn';
      feedback.hidden=false;
    }
    status(message,copied?'good':'warn');
    const buttons=document.querySelectorAll('#forumView [data-forum-action="copy"]');
    buttons.forEach(button=>{
      button.textContent=copied?'COPIED ✓':'SELECTED // COPY';
      button.dataset.copyState=copied?'good':'warn';
    });
    window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer=window.setTimeout(()=>{
      if(feedback) feedback.hidden=true;
      buttons.forEach(button=>{
        button.textContent='COPY BB CODE';
        delete button.dataset.copyState;
      });
    },4000);
  }

  async function copyCode() {
    current=collect();
    render();
    const value=buildBbcode(current);
    // Try synchronously during the click gesture. On some Android browsers,
    // an asynchronous clipboard rejection consumes the required user activation.
    let copied=copyWithSelection(value);
    if (!copied && typeof navigator.clipboard?.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(value);
        copied=true;
      } catch {}
    }
    if (!copied) {
      // Never try to copy from a hidden lens. Reveal and select real BBCode instead.
      setLens('code');
      const code=$('dtrForumCode');
      if(code) {
        try {
          code.focus({preventScroll:true});
          code.select();
          code.setSelectionRange?.(0,code.value.length);
          code.scrollIntoView?.({block:'nearest'});
        } catch {}
      }
    }
    showCopyFeedback(copied);
    return copied;
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
  migrateOldPersonalImage();
  window.DTRForum=Object.freeze({buildBbcode,previewMarkup,cleanState,defaultState:()=>cleanState(DEFAULT),render,getState:()=>({...current}),setLens});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
