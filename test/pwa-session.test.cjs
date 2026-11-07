'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){const events={},domEvents={},nodes={'app-content':{inert:false},'auth-screen':{inert:false},'pwa-offline':{hidden:true,open:false,showModal(){this.open=true;},close(){this.open=false;}},'pwa-offline-retry':{disabled:false}},navigator={onLine:true},window={firebaseReady:()=>{},addEventListener:(name,fn)=>events[name]=fn},document={getElementById:id=>nodes[id],querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>domEvents[name]=fn};vm.runInNewContext(fs.readFileSync(__dirname+'/../pwa-app.js','utf8'),{window,document,navigator,location:{href:'https://pricweb.github.io/PRIC/'},URL,AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:true})});return{events,domEvents,nodes,navigator,window,pwa:window.PricPwa};}
test('connection loss uses top-layer dialog, blocks operations and preserves draft and dirty state after retry',async()=>{const f=fixture(),draft={value:'1500',matches:()=>true,closest:()=>false};f.domEvents.input({target:draft});f.navigator.onLine=false;f.events.offline();assert.equal(f.nodes['pwa-offline'].open,true);assert.equal(f.nodes['app-content'].inert,true);let stopped=false;f.domEvents.submit({preventDefault(){stopped=true;},stopImmediatePropagation(){}});assert(stopped);f.navigator.onLine=true;await f.events.online();assert.equal(f.nodes['pwa-offline'].open,false);assert.equal(f.nodes['app-content'].inert,false);assert.equal(draft.value,'1500');assert.equal(f.pwa.canUpdate(),false);});
test('an update cannot reload a pending operation or dirty form',()=>{const f=fixture();assert.equal(f.pwa.canUpdate(),true);f.pwa.begin();assert.equal(f.pwa.canUpdate(),false);f.pwa.end();assert.equal(f.pwa.canUpdate(),true);f.domEvents.input({target:{matches:()=>true,closest:()=>false}});assert.equal(f.pwa.canUpdate(),false);});

test('pending purchase cart prevents updates even if another form reset clears the dirty flag',()=>{
 const f=fixture();let pending=true,saving=false;
 f.window.PricPurchaseCart={hasItems:()=>pending,isSaving:()=>saving};
 f.domEvents.reset();assert.equal(f.pwa.canUpdate(),false);
 pending=false;saving=true;assert.equal(f.pwa.canUpdate(),false);
 saving=false;assert.equal(f.pwa.canUpdate(),true);
});
