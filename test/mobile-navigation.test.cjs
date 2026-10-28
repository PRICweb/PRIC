const assert=require('node:assert/strict'),{test}=require('node:test');
const {plan,order}=require('../mobile-navigation');
test('all permission combinations expose every allowed view through tabs, menu or turnero link',()=>{
 for(let mask=0;mask<256;mask++){
  const allowed=order.filter((_,i)=>mask&(1<<i)),result=plan(allowed);
  assert.deepEqual(new Set([...result.direct,...result.more,...result.linked]),new Set(allowed));
  assert.equal(result.direct.length<=5,true);
  assert.equal(new Set([...result.direct,...result.more,...result.linked]).size,result.direct.length+result.more.length+result.linked.length);
  assert.deepEqual(result.views,allowed);
 }
});
test('limited users see their own sections directly without empty navigation slots',()=>{
 assert.deepEqual(plan(['inventario','movimientos']),{views:['movimientos','inventario'],direct:['movimientos','inventario'],more:[],linked:[]});
 assert.deepEqual(plan(['metricas']).direct,['metricas']);
 assert.deepEqual(plan(order).direct,['metricas','movimientos','turnero','inventario','empleados']);
 assert.deepEqual(plan(order).more,['config','actividad']);
 assert.deepEqual(plan(order).linked,['profes']);
 assert.deepEqual(plan(['profes']).more,['profes']);
 assert.deepEqual(plan(['config','actividad']).direct,[]);
});
