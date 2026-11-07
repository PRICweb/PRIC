const assert=require('node:assert/strict'),{test}=require('node:test');
const {plan,order}=require('../mobile-navigation');
test('all permission combinations expose every allowed view through tabs, menu or turnero link',()=>{
 for(let mask=0;mask<512;mask++){
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
 assert.deepEqual(plan(order).more,['config','actividad','ctacte']);
 assert.deepEqual(plan(order).linked,['profes']);
 assert.deepEqual(plan(['profes']).linked,['profes']);
 assert.deepEqual(plan(['config','actividad']).direct,[]);
});

test('swipes stop at bottom-bar boundaries and never navigate out of menu-only views',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),handlers={},opened=[];
 const body={classList:{contains:()=>true}},target={closest:()=>false,parentElement:body,scrollWidth:0,clientWidth:0};
 const win={addEventListener(){},PricMobileScreens:{active:()=>false},PricMobileNavigation:{swipeViews:()=>plan(order).direct,highlight(){}},abrirVistaPanelClub:v=>opened.push(v),scrollTo(){}};
 const doc={body,addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),querySelector:()=>null,querySelectorAll:()=>[]};
 vm.runInNewContext(fs.readFileSync(require.resolve('../club-mobile.js'),'utf8'),{window:win,document:doc,matchMedia:()=>({matches:true}),getComputedStyle:()=>({overflowX:'visible'}),Date,setTimeout});
 function swipe(view,left=true){win.__vistaPanelClubActual=view;opened.length=0;for(const fn of handlers.touchstart)fn({target,touches:[{clientX:200,clientY:100}]});for(const fn of handlers.touchend)fn({changedTouches:[{clientX:left?100:300,clientY:100}]});return opened.slice();}
 assert.deepEqual(swipe('empleados'),[]);
 assert.deepEqual(swipe('metricas',false),[]);
 assert.deepEqual(swipe('turnero'),['inventario']);
 assert.deepEqual(swipe('inventario',false),['turnero']);
 for(const view of ['profes','config','actividad']){assert.deepEqual(swipe(view),[]);assert.deepEqual(swipe(view,false),[]);}
});
