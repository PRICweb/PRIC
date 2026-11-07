const {test}=require('node:test');
const assert=require('node:assert/strict');
const batch=require('../purchase-batch'),lots=require('../stock-lots');
function database(fail=false){
 const state=new Map([['clubs/demo/inventario/a',{nombre:'Agua',stock:0,costo:5,precio:20}],['clubs/demo/inventario/b',{nombre:'Barra',stock:2,costo:10,precio:30}]]);
 function ref(path){return {path,collection:name=>ref(path+'/'+name),doc:id=>ref(path+'/'+id)};}
 return {state,collection:name=>ref(name),async runTransaction(work){
  const writes=[];let writing=false;
  const result=await work({async get(r){assert(!writing,'all reads must precede writes');return{exists:state.has(r.path),data:()=>structuredClone(state.get(r.path))};},set(r,value){writing=true;writes.push([r.path,structuredClone(value)]);}});
  if(fail)throw Error('sin conexión');
  for(const [path,value] of writes)state.set(path,value);
  return result;
 }};
}
const lines=[{id:'a',cantidad:3,costo:10,venta:25},{id:'b',cantidad:2,costo:15,venta:20},{id:'a',cantidad:1,costo:20,venta:24}];
const options=db=>({db,clubId:'demo',lines,cash:35,transfer:45,id:'compra_qa',stamp:'2026-11-07T12:00:00Z',day:'2026-11-07',stockTools:lots});
test('multiple purchase preserves both payment channels and keeps FIFO costs, sale prices and one shared purchase ID',async()=>{
 const db=database(),result=await batch.save(options(db));
 assert.equal(result.gastos.reduce((s,x)=>s+x.efectivo,0),35);
 assert.equal(result.gastos.reduce((s,x)=>s+x.transferencia,0),45);
 assert.equal(result.gastos.reduce((s,x)=>s+x.monto,0),80);
 const a=db.state.get('clubs/demo/inventario/a'),b=db.state.get('clubs/demo/inventario/b');
 assert.equal(a.stock,4);assert.equal(b.stock,4);
 assert.equal(a.precio,25);assert.equal(b.precio,30);
 assert.deepEqual(lots.lots(a).map(x=>[x.cantidad,x.costoUnitario]),[[3,10],[1,20]]);
 const replay=await batch.save(options(db));
 assert.equal(replay.repetido,true);assert.equal(db.state.get('clubs/demo/inventario/a').stock,4);
 await assert.rejects(batch.save({...options(db),cash:40,transfer:40}),/otra compra/);
});
test('missing products, wrong payment totals and transaction failure cannot leave a partial purchase',async()=>{
 const db=database();
 await assert.rejects(batch.save({...options(db),lines:[...lines,{id:'missing',cantidad:1,costo:1,venta:1}],transfer:46}),/no existe/);
 assert.equal(db.state.get('clubs/demo/inventario/a').stock,0);
 assert.throws(()=>batch.prepare(lines,10,10),/exacto/);
 const failing=database(true);await assert.rejects(batch.save(options(failing)),/conexión/);
 assert.equal(failing.state.get('clubs/demo/inventario/a').stock,0);
 assert.equal([...failing.state.keys()].filter(k=>k.includes('/movimientos/')).length,0);
});
