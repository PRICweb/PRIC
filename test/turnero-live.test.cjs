const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function fixture(){
 const listeners=[],frames=[],context={window:{__vistaPanelClubActual:'turnero',CLUB_DOC_ID_ACTUAL:'club'},currentClubId:'club',fechaSeleccionada:'2026-11-19',reservasGlobales:[],subReservasInicializada:false,revisionEscuchaReservas:0,revisionDiaExtra:0,unsubReservas:null,unsubReservasFijas:null,unsubReservaDiaExtra:null,fechaEscuchaExtra:null,refrescoTurneroFrame:null,cargasTurnero:new Set(),cargaTurnero(){},serializar:x=>x,obtenerFechaHoy:()=> '2026-11-03',fechaISOOffset:(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10),consultaReservasEmpleado:x=>x,refrescarVistaActiva(){context.draws++},draws:0,requestAnimationFrame:fn=>(frames.push(fn),frames.length),console,alert:message=>{throw Error(message)}};
 const query={doc(){return this},collection(){return this},where(field,op,value){return {...this,filters:[...(this.filters||[]),[field,op,value]]}},onSnapshot(next,error){const entry={filters:this.filters||[],next,error,stopped:false};listeners.push(entry);return()=>entry.stopped=true;}};
 context.firebaseReady=async()=>({db:{collection:()=>query}});
 const merge=html.slice(html.indexOf('  function mezclarReservas('),html.indexOf('  async function guardarColeccionDiff('));
 const stop=html.slice(html.indexOf('    function detenerEscuchaReservas(){'),html.indexOf('  function detenerEscuchasOperativas(){'));
 const listen=html.slice(html.indexOf('  let refrescoTurneroFrame=null;')+'  let refrescoTurneroFrame=null;'.length,html.indexOf('  window.cargarReservaDiaExtra=cargarReservaDiaExtra;'));
 vm.createContext(context);vm.runInContext(merge+stop+"function rangoReservasBase(){return {desde:'2026-10-27',hasta:'2026-11-17'}};"+listen,context);
 return {context,listeners,frames,emit:(entry,rows)=>entry.next({docs:rows.map(r=>({id:r.id,data:()=>r}))}),flush:()=>{while(frames.length)frames.shift()();}};
}
test('November 19 uses one live day subscription, changes arrive without reload, returning to a day subscribes again',async()=>{
 const f=fixture(),c=f.context;await c.iniciarEscuchaReservasTurnero();assert.equal(f.listeners.length,3);const extra=f.listeners[2];assert.deepEqual(JSON.parse(JSON.stringify(extra.filters)),[['fecha','==','2026-11-19']]);
 f.emit(extra,[{id:'r',fecha:'2026-11-19',hora:'10:00'}]);f.flush();assert.equal(c.reservasGlobales[0].id,'r');assert.equal(c.draws,1);
 await c.cargarReservaDiaExtra('2026-11-19');assert.equal(f.listeners.length,3);
 c.fechaSeleccionada='2026-11-20';await c.cargarReservaDiaExtra(c.fechaSeleccionada);assert(extra.stopped);f.emit(extra,[{id:'stale',fecha:'2026-11-19'}]);assert.equal(c.reservasGlobales[0].id,'r');
 c.fechaSeleccionada='2026-11-19';await c.cargarReservaDiaExtra(c.fechaSeleccionada);assert.equal(f.listeners.length,5);f.emit(f.listeners[4],[]);f.flush();assert.equal(c.reservasGlobales.length,0);
 c.detenerEscuchaReservas();assert(f.listeners.every(x=>x.stopped));
});
test('range and fixed snapshots coalesce into one render and obsolete listeners cannot overwrite the new screen',async()=>{
 const f=fixture(),c=f.context;await c.iniciarEscuchaReservasTurnero();f.emit(f.listeners[0],[]);f.emit(f.listeners[1],[]);assert.equal(f.frames.length,1);f.flush();assert.equal(c.draws,1);
 const old=f.listeners[0];await c.iniciarEscuchaReservasTurnero();f.emit(old,[{id:'stale',fecha:'2026-11-03'}]);assert.equal(c.reservasGlobales.length,0);
});
test('a saved manual turn is merged after server confirmation even when an earlier snapshot removed its draft',async()=>{
 const f=fixture(),c=f.context;let complete;const saved={id:'new',fecha:'2026-11-19',hora:'10:00'};
 const ref={collection(){return this},doc(){return this},get:async()=>({exists:false})};c.firebaseReady=async()=>({db:{collection:()=>ref,runTransaction:()=>new Promise(resolve=>complete=resolve)}});c.reemplazarObjetoLocal=(target,value)=>Object.assign(target,value);
 const fn=html.slice(html.indexOf('  async function guardarReservaFirebase('),html.indexOf('// Exponer el guardado para módulos posteriores'));
 vm.runInContext(fn,c);const draft={...saved},pending=c.guardarReservaFirebase(draft);await new Promise(resolve=>setImmediate(resolve));c.mezclarReservas([],{desde:saved.fecha,hasta:saved.fecha});assert.equal(c.reservasGlobales.length,0);complete(saved);await pending;f.flush();assert.equal(c.reservasGlobales[0].id,'new');assert.equal(c.draws,1);
});
