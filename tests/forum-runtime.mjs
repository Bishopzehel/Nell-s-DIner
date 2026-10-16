import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(join(root,'dtr-forum.js'),'utf8');
const html=await readFile(join(root,'index.html'),'utf8');
const css=await readFile(join(root,'dtr-forum.css'),'utf8');
assert(!html.includes('id="dtrForum_rightImage"'),'editor cannot change the right crest');
assert(html.includes('DTR SERPENT CREST / RIGHT (FIXED)'),'editor must explain fixed crest');
assert(css.includes('.dtr-forum-preview-header'),'preview layout must align portrait and crest with sender metadata');
const storage=new Map();
const sandbox={
  window:{},URL,
  document:{readyState:'loading',addEventListener(){}},
  localStorage:{
    getItem(key){return storage.get(key)??null;},
    setItem(key,value){storage.set(key,String(value));}
  }
};
runInNewContext(source,sandbox);
const api=sandbox.window.DTRForum;
assert(api,'DTR forum must expose its BBCode generator');
const defaults=api.defaultState();
const CREST='https://i.imgur.com/QFFOGWY.png';
assert(!Object.hasOwn(defaults,'rightImage'),'right crest must not be an editable field');
assert.equal(api.cleanState({rightImage:'https://example.com/other.png'}).rightImage,undefined,'saved old right-image settings must be ignored');

assert.equal(defaults.leftImage, '', 'personal character GIF must never be prefilled');
assert(!api.buildBbcode(defaults).includes('VylZNj1'), 'fresh BBCode must not include a personal image');
assert(!api.previewMarkup(defaults).includes('VylZNj1'), 'fresh preview must not include a personal image');
assert(source.includes('leftImage:current.leftImage'), 'sender profile must remember its own image');
assert(source.includes("'closing','leftImage'"), 'choosing sender must restore own image');

for (const key of ['sender','role','location','recipient','encryption','subject','message','closing']) {
  assert.equal(defaults[key],'',key+' must be neutral by default');
}
const state={
  ...defaults,sender:'Test Corsair',role:'Commander',location:'Omicron Gamma',recipient:'Corsair Court',
  encryption:'High Encryption',opening:'Honored Elders,',closing:'Con respeto,',subject:'Test report',
  message:'This is **important**.\n\n[spoiler=Screenshots]\n[url=https://example.com/image][img]https://example.com/test.png[/img][/url]\n[/spoiler]'
};
const code=api.buildBbcode(state);
assert(!code.includes('[size=19]Subject[/size]'), 'BBCode header must not contain a Subject row');
assert(!code.includes('Test report'), 'internal subject must not appear in exported forum post');
assert(code.includes('[img float=right]'+CREST+'[/img]'),'fixed DTR serpent must always appear on the right');
assert(code.indexOf('[img float=right]'+CREST+'[/img]')===code.lastIndexOf('[img float=right]'+CREST+'[/img]'),'right serpent must be included exactly once');
const customPortrait=api.buildBbcode({...state,leftImage:'https://example.com/portrait.gif'});
assert(customPortrait.includes('[img float=left]https://example.com/portrait.gif[/img]'),'character portraits must float left');
assert(customPortrait.indexOf('[img float=left]') < customPortrait.indexOf('[img float=right]'),'personal picture must appear before the DTR crest');
const legacyReplacement=api.buildBbcode({...state,rightImage:'https://example.com/overwrite.png'});
assert(!legacyReplacement.includes('https://example.com/overwrite.png'),'legacy right image may not replace the official crest');
assert(legacyReplacement.includes('[img float=right]'+CREST+'[/img]'),'legacy drafts still get the fixed crest');
const blankReplacement=api.buildBbcode({...state,rightImage:'',topImage:'',footerImage:'',leftImage:''});
assert(blankReplacement.includes('[img float=right]'+CREST+'[/img]'),'even an empty saved right-image override cannot remove crest');

assert(code.startsWith('[font=Montserrat]'),'Corsair template must retain Montserrat');
assert(code.includes('[hrc]#84070c[/hrc]'),'template must retain its crimson divider');
assert(code.includes('[color=#ab8f66]Test Corsair[/color]'),'sender must be substituted');
assert(code.includes('Corsair Court - High Encryption'),'recipient and cipher must combine');
assert(code.includes('Omicron Gamma'),'location must be substituted');
assert(code.includes('[spoiler=Screenshots]'),'screenshot spoiler markup must remain intact');
assert(code.includes('[img]https://example.com/test.png[/img]'),'message images must be preserved');
assert(code.includes('[i][b]Test Corsair[/b][/i]'),'signature must follow sender');
assert(code.includes('Commander'),'signature role must be editable');
assert(code.includes('[b]important[/b]'),'inline markdown bold must convert to forum BBCode');
assert(!code.includes('Aurelio de Cruz'),'sample character must not be hardcoded');
const preview=api.previewMarkup({
  ...state,message:'<script>alert(1)</script>\n\n[spoiler=Evidence][img]https://example.com/evidence.png[/img][/spoiler]'
});
assert(!preview.includes('<script>'),'preview must escape untrusted HTML');
assert(!preview.includes('Test report'), 'preview header must not contain internal draft subject');
assert(!preview.includes('>Subject<'), 'preview must not render a Subject row');
assert(preview.includes('&lt;script&gt;'),'escaped message should still be legible');
assert(preview.includes('<details class="dtr-forum-spoiler">'),'spoilers should appear in preview');
assert(preview.includes('https://example.com/evidence.png'),'HTTPS image should appear');
assert(preview.includes('class="dtr-forum-preview-header"'),'preview must place both emblems around metadata');
assert(preview.includes('class="dtr-forum-preview-crest" src="'+CREST+'"'),'right DTR serpent must be visible in the preview');
const oldPreview=api.previewMarkup({...state,rightImage:'https://example.com/overwrite.png',leftImage:'https://example.com/portrait.gif'});
assert(oldPreview.includes('class="dtr-forum-preview-portrait" src="https://example.com/portrait.gif"'),'personal sender image must appear in the left portrait slot');
assert(!oldPreview.includes('https://example.com/overwrite.png'),'legacy right image cannot replace the preview crest');
assert(!oldPreview.includes('Test report'), 'legacy preview must not render draft subject either');
assert(oldPreview.indexOf('class="dtr-forum-preview-portrait"') < oldPreview.indexOf('class="dtr-forum-preview-meta"'),'portrait must appear before sender metadata');
assert(oldPreview.indexOf('class="dtr-forum-preview-meta"') < oldPreview.indexOf('class="dtr-forum-preview-crest-slot"'),'serpent crest must appear after sender metadata');
const bare=api.buildBbcode({...defaults,topImage:'',leftImage:'',rightImage:'',footerImage:''});
assert(bare.includes('[img float=right]'+CREST+'[/img]'),'right serpent crest is mandatory');
assert(!bare.includes('[img float=left]'),'left image is optional');
const unsafe=api.previewMarkup({...state,topImage:'javascript:alert(1)'});
assert(!unsafe.includes('src="javascript:'),'preview must reject script URL');
const formats=api.previewMarkup({...state,message:'[quote]A quoted transmission[/quote]\n\n[list]\n[*]First\n[*]Second\n[/list]'});
assert(formats.includes('dtr-forum-preview-quote'),'preview must render quote markup');
assert(formats.includes('dtr-forum-preview-list'),'preview must render BBCode lists');
// Existing v1 browser storage may contain the accidentally prefilled image.
const legacyUrl = 'https://i.imgur.com/VylZNj1.gif';
const savedValues = new Map([
  ['dtr:forum:current:v1', JSON.stringify({ ...state, leftImage: legacyUrl })],
  ['dtr:forum:drafts:v1', JSON.stringify([{ name: 'Old', state: { ...state, leftImage: legacyUrl } }])],
  ['dtr:forum:identities:v1', JSON.stringify([{ sender: 'Old Sender', leftImage: legacyUrl }])]
]);
const legacySandbox = {
  window: {}, URL, document: { readyState:'loading', addEventListener() {} },
  localStorage: {
    getItem(key){ return savedValues.get(key) ?? null; },
    setItem(key, value){ savedValues.set(key, String(value)); }
  }
};
runInNewContext(source, legacySandbox);
assert.equal(legacySandbox.window.DTRForum.getState().leftImage, '', 'legacy current draft must remove the inherited picture');
assert.equal(JSON.parse(savedValues.get('dtr:forum:drafts:v1'))[0].state.leftImage, '', 'legacy named drafts must remove inherited picture');
assert.equal(JSON.parse(savedValues.get('dtr:forum:identities:v1'))[0].leftImage, '', 'legacy sender profiles must remove inherited picture');
assert.equal(savedValues.get('dtr:forum:personal-image-migrated:v1'), '1', 'migration must run once');
savedValues.set('dtr:forum:current:v1', JSON.stringify({ ...state, leftImage: legacyUrl }));
runInNewContext(source, { ...legacySandbox, window: {} });
assert.equal(JSON.parse(savedValues.get('dtr:forum:current:v1')).leftImage, legacyUrl, 'user-entered picture must persist after one-time migration');
assert(api.buildBbcode({ ...defaults, sender: 'Custom Sender', leftImage:'https://example.com/custom.gif' }).includes('https://example.com/custom.gif'), 'custom sender image must be accepted');

console.log('DTR forum runtime audit passed (neutral BBCode, meta, image, spoiler and escape tests).');
