const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const tools=require('../cash-register.js');
const receipts=require('../turn-receipts.js');
const products=[{id:'a',nombre:'Agua',stock:5,precio:100},{id:'b',nombre:'Barra',stock:4,precio:250}];
test('multiple products and repeated selections use exact stock and cents',()=>{
  const lines=tools.lines([{id:'a',cantidad:2},{id:'a',cantidad:1},{id:'b',cantidad:2}],products);
  assert.deepEqual(lines.map(x=>[x.id,x.cantidad,x.total]),[['a',3,30000],['b',2,50000]]);
  assert.throws(()=>tools.lines([{id:'a',cantidad:6}],products),/Stock/);
  assert.throws(()=>tools.lines([{id:'a',cantidad:1.5}],products),/entero/);
  assert.throws(()=>tools.lines([{id:'missing',cantidad:1}],products),/existe/);
});
test('split payments preserve every cent and reject unpaid or overpaid sales',()=>{
  const lines=tools.lines([{id:'a',cantidad:2},{id:'b',cantidad:1}],products);
  const paid=tools.allocate(lines,'150.01','299.99');
  assert.equal(paid.reduce((sum,x)=>sum+tools.cents(x.efectivo),0),15001);
  assert.equal(paid.reduce((sum,x)=>sum+tools.cents(x.transferencia),0),29999);
  assert.equal(paid.reduce((sum,x)=>sum+tools.cents(x.monto),0),45000);
  assert.throws(()=>tools.allocate(lines,100,300),/exactamente/);
  assert.throws(()=>tools.allocate(lines,500,0),/exactamente/);
  assert.throws(()=>tools.allocate(lines,-1,451),/válido/);
});
function harness(){
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const cash=html.slice(html.indexOf('  let productosMostrador='),html.indexOf('function transacciones(){',html.indexOf('  let productosMostrador=')));
  const consume=html.slice(html.indexOf('  window.agregarConsumoTurno ='),html.indexOf('  window.accionWhatsApp =',html.indexOf('  window.agregarConsumoTurno =')));
  const elements={},data=new Map(products.map(p=>['clubs/test/inventario/'+p.id,structuredClone(p)]));
  const selected={id:'r',fecha:'2026-10-24',consumos:[],pagoEfectivo:999};data.set('clubs/test/reservas/r',structuredClone(selected));
  let serial=0,retry=false,fail=false;
  const ref=p=>({path:p,collection:name=>ref(p+'/'+name),doc:id=>ref(p+'/'+id)});
  const database={collection:name=>ref(name),runTransaction:async worker=>{
    const attempt=async commit=>{const writes=[];let wrote=false;const tx={get:async target=>{assert.equal(wrote,false,'reads must precede writes');const record=data.get(target.path);return{id:target.path.split('/').at(-1),exists:!!record,data:()=>structuredClone(record)};},set:(target,value)=>{wrote=true;writes.push([target.path,JSON.parse(JSON.stringify(value))]);}};const result=await worker(tx);if(fail)throw Error('forced network failure');if(commit)for(const [key,value]of writes)data.set(key,{...data.get(key),...value});return result;};if(retry)await attempt(false);return attempt(true);
  }};
  const element=id=>elements[id]||(elements[id]={value:'',textContent:'',dataset:{},disabled:false});
  const context={setTimeout:fn=>fn(),console,document:{querySelectorAll:()=>[]},window:{addEventListener(){},PricTurnReceipts:receipts,PricSaleTools:tools,PricProductPicker:{open:async()=>[{id:'a',cantidad:2},{id:'b',cantidad:1}]},CLUB_DOC_ID_ACTUAL:'test',__vistaPanelClubActual:'movimientos',renderizarInventario(){},renderizarModalTurnoAcciones(){}},currentClubId:'test',inventarioGlobal:structuredClone(products),ingresosGlobal:[],gastosGlobal:[],coleccionesCargadas:new Set(),serializar:x=>JSON.parse(JSON.stringify(x)),clonarDatos:x=>JSON.parse(JSON.stringify(x)),firebaseReady:async()=>({db:database}),firebase:{firestore:{FieldValue:{serverTimestamp:()=>null}}},$:element,getValue:id=>element(id).value,setValue:(id,value)=>element(id).value=value,setText:(id,value)=>element(id).textContent=value,esc:String,toInt:value=>Math.trunc(Number(value)||0),textoSeguro:value=>String(value||'').trim(),newId:prefix=>prefix+'-'+(++serial),hoyISO:()=> '2026-10-24',fechaLocalISO:()=> '2026-10-24',asegurarRegistrosTurno:async()=>{},asegurarInventarioActualizado:async()=>{},guardarCacheLocalClub(){},snapshotDatos:()=>({}),refrescarVistaActiva(){},refrescarTodo(){},marcarCambioLocalPendiente(){},normalizarRegistroFinanciero:x=>x,guardarDocumentoColeccion:async(name,item)=>{if(fail)throw Error('failure');data.set('clubs/test/'+name+'/'+item.id,JSON.parse(JSON.stringify(item)));},alert:message=>context.lastAlert=message,cargarColeccionVista:async()=>context.inventarioGlobal,reemplazarObjetoLocal:(target,value)=>Object.assign(target,value),reservaSeleccionada:()=>selected,reservaSeleccionadaFecha:'2026-10-24',fechaSeleccionada:'2026-10-24',fechaInstanciaTurno:(r,fecha)=>fecha,estadoInstanciaTurno:r=>r,aplicarEstadoInstanciaTurno:(r,f,state)=>Object.assign(r,state),prepararReservaFirestore:r=>r};
  vm.createContext(context);vm.runInContext(cash+'\n'+consume,context);
  return{context,data,selected,element,setRetry:v=>retry=v,setFailure:v=>fail=v};
}
test('real checkout saves all line items once, split payment and stock atomically',async()=>{
  const h=harness();await h.context.window.elegirProductosMostrador();assert.equal(h.element('mov-total').textContent,'$450');h.element('mov-efectivo').value='150';h.element('mov-transferencia').value='300';h.setRetry(true);
  await h.context.window.venderProductoMostradorMov();
  assert.equal(h.data.get('clubs/test/inventario/a').stock,3);assert.equal(h.data.get('clubs/test/inventario/b').stock,3);
  const movements=[...h.data].filter(([key])=>key.includes('/movimientos/')).map(([,value])=>value);
  assert.equal(movements.length,2);assert.equal(new Set(movements.map(x=>x.ventaId)).size,1);
  assert.equal(movements.reduce((sum,x)=>sum+x.efectivo,0),150);assert.equal(movements.reduce((sum,x)=>sum+x.transferencia,0),300);
  assert.equal(h.context.ingresosGlobal.length,2);assert.equal(h.element('mov-total').textContent,'$0');
});
test('stale stock and write failures leave the whole sale and draft intact',async()=>{
  for(const failType of ['stock','write','price']){const h=harness();await h.context.window.elegirProductosMostrador();h.element('mov-efectivo').value='450';if(failType==='stock')h.data.get('clubs/test/inventario/b').stock=0;else if(failType==='price')h.data.get('clubs/test/inventario/b').precio=300;else h.setFailure(true);await h.context.window.venderProductoMostradorMov();assert.equal(h.data.get('clubs/test/inventario/a').stock,5);assert.equal([...h.data.keys()].filter(key=>key.includes('/movimientos/')).length,0);assert.equal(h.context.ingresosGlobal.length,0);assert.equal(h.element('mov-total').textContent,'$450');assert.ok(h.context.lastAlert);}
});
test('turn quantity selection and removal preserve concurrent payments and correct stock',async()=>{
  const h=harness();h.data.get('clubs/test/reservas/r').pagoEfectivo=1234;h.setRetry(true);await h.context.window.agregarConsumoTurno();
  assert.equal(h.selected.consumos.length,3);assert.equal(h.selected.pagoEfectivo,1234);assert.equal(h.data.get('clubs/test/inventario/a').stock,3);
  h.data.get('clubs/test/inventario/a').stock=1;await h.context.window.eliminarConsumoTurno(0,'a');assert.equal(h.selected.consumos.length,2);assert.equal(h.data.get('clubs/test/inventario/a').stock,2);assert.equal(h.selected.pagoEfectivo,1234);
});
test('one internal form saves both directions and both payment methods, rejecting invalid input',async()=>{
  const h=harness();for(const tipo of ['egreso','ingreso_libre']){h.element('mov-interno-tipo').value=tipo;h.element('mov-interno-concepto').value='Concepto';h.element('mov-interno-efectivo').value='100';h.element('mov-interno-transferencia').value='50';await h.context.window.agregarMovimientoInterno();}
  assert.equal(h.context.gastosGlobal.length,1);assert.equal(h.context.ingresosGlobal.length,1);assert.equal(h.context.gastosGlobal[0].efectivo,100);assert.equal(h.context.gastosGlobal[0].transferencia,50);assert.equal(h.context.gastosGlobal[0].monto,150);
  h.element('mov-interno-concepto').value='Invalid';h.element('mov-interno-efectivo').value='-1';await h.context.window.agregarMovimientoInterno();assert.equal(h.context.ingresosGlobal.length,1);
});
test('financial history and exports retain signed cash and transfer amounts for expenses',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const source=html.slice(html.indexOf('  function transaccionesDesdeDatos('),html.indexOf('  async function cargarTransaccionesFinanzasRango('));
  const context={normalizarRegistroFinanciero:x=>x,numeroValido:value=>Number(value)||0};vm.createContext(context);vm.runInContext(source,context);
  const rows=context.transaccionesDesdeDatos([{id:'sale',fecha:'2026-10-24',monto:150,efectivo:100,transferencia:50},{id:'cancelled-sale',monto:9999,efectivo:9999,anulado:true}],[{id:'expense',fecha:'2026-10-24',monto:70,efectivo:20,transferencia:50},{id:'cancelled-expense',monto:9999,transferencia:9999,anulado:true}],[]);
  const expense=rows.find(row=>row.id==='expense');assert.equal(expense.efectivo,-20);assert.equal(expense.transferencia,-50);assert.equal(expense.monto,-70);
  assert.equal(rows.reduce((sum,row)=>sum+row.efectivo,0),80);assert.equal(rows.reduce((sum,row)=>sum+row.transferencia,0),0);assert.equal(rows.reduce((sum,row)=>sum+row.monto,0),80);
});

test('cart quantities never fill or change manual payments',async()=>{const h=harness();await h.context.window.elegirProductosMostrador();assert.equal(h.element('mov-efectivo').value,'');assert.equal(h.element('mov-transferencia').value,'');h.element('mov-efectivo').value='99';h.context.window.cambiarCantidadMostrador(0,1);assert.equal(h.element('mov-total').textContent,'$550');h.context.window.cambiarCantidadMostrador(0,-1);h.context.window.quitarProductoMostrador(1);assert.equal(h.element('mov-total').textContent,'$200');assert.equal(h.element('mov-efectivo').value,'99');});
test('grouped consumptions retain historical prices and restore exact stock',async()=>{const h=harness();await h.context.window.agregarConsumoTurno();h.data.get('clubs/test/inventario/a').precio=150;await h.context.window.ajustarGrupoConsumoTurno(0,1);let groups=tools.consumptionGroups(h.selected.consumos);assert.equal(groups[0].cantidad,3);assert.equal(groups[0].total,35000);assert.equal(h.data.get('clubs/test/inventario/a').stock,2);await h.context.window.ajustarGrupoConsumoTurno(0,-1);assert.equal(tools.consumptionGroups(h.selected.consumos)[0].total,20000);h.data.get('clubs/test/reservas/r').pagoEfectivo=777;await h.context.window.ajustarGrupoConsumoTurno(0,0);assert.equal(h.data.get('clubs/test/inventario/a').stock,5);assert.equal(h.selected.consumos.length,1);assert.equal(h.selected.pagoEfectivo,777);});
test('group quantity failure cannot consume stock or alter reservation',async()=>{const h=harness();await h.context.window.agregarConsumoTurno();h.data.get('clubs/test/inventario/a').stock=0;await h.context.window.ajustarGrupoConsumoTurno(0,1);assert.equal(h.selected.consumos.length,3);h.setFailure(true);await h.context.window.ajustarGrupoConsumoTurno(0,0);assert.equal(h.data.get('clubs/test/reservas/r').consumos.length,3);assert.equal(h.data.get('clubs/test/inventario/a').stock,0);});

test('overpayment and underpayment post separate channel adjustments atomically',async()=>{for(const [cash,transfer]of [[200,300],[100,300],[0,0],[500,0],[0,400]]){const h=harness();await h.context.window.elegirProductosMostrador();h.element('mov-efectivo').value=String(cash);h.element('mov-transferencia').value=String(transfer);await h.context.window.venderProductoMostradorMov();assert.equal(h.data.get('clubs/test/inventario/a').stock,3);const rows=[...h.data].filter(([key])=>key.includes('/movimientos/')).map(([,value])=>value);for(const [channel,expected]of [['efectivo',cash],['transferencia',transfer]])assert.equal(rows.reduce((sum,row)=>sum+(row.tipo==='egreso'?-1:1)*row[channel],0),expected);const adjustments=rows.filter(row=>row.ajusteVenta);assert.ok(adjustments.length>0);assert.equal(new Set(rows.map(row=>row.ventaId)).size,1);assert.equal(h.context.gastosGlobal.length,adjustments.filter(row=>row.tipo==='egreso').length);}});
test('adjustment and stock both roll back if saving fails',async()=>{const h=harness();await h.context.window.elegirProductosMostrador();h.element('mov-efectivo').value='500';h.setFailure(true);await h.context.window.venderProductoMostradorMov();assert.equal(h.data.get('clubs/test/inventario/a').stock,5);assert.equal([...h.data.keys()].filter(key=>key.includes('/movimientos/')).length,0);assert.equal(h.element('mov-efectivo').value,'500');});

test('product busy state keeps icons and text while disabling repeated clicks',async()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const source=html.slice(html.indexOf('  async function conBloqueo('),html.indexOf('  const newId =',html.indexOf('  async function conBloqueo(')));const context={accionesEnCurso:new Set()};vm.createContext(context);vm.runInContext(source,context);let finish;const button={tagName:'BUTTON',disabled:false,textContent:'+',attrs:{},closest:()=>true,setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};const pending=context.conBloqueo(button,()=>new Promise(resolve=>finish=resolve),'Procesando...');assert.equal(button.textContent,'+');assert.equal(button.attrs['aria-busy'],'true');assert.equal(button.disabled,true);finish();await pending;assert.equal(button.textContent,'+');assert.equal(button.disabled,false);});
