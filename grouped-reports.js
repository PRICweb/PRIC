(function(root){
'use strict';
const cents=x=>{const n=Number(x??0),c=Math.round(n*100);if(!Number.isFinite(n)||!Number.isSafeInteger(c))throw Error('Hay un importe inválido en los registros del período.');return c;},modes={indoor:'Pádel in',outdoor:'Pádel out',tenis_indoor:'Tenis in',tenis_outdoor:'Tenis out',padel:'Pádel',tenis:'Tenis',sin_modalidad:'Sin modalidad identificada'};
const groups=[...['Turnos','Turnos + Ventas','Profesores'].map((label,i)=>({label,options:Object.entries(modes).map(([mode,name])=>({key:['turnos','combinado','profesores'][i]+':'+mode,label:name,metric:'importe'}))})),{label:'Ventas',options:[['turnos','En turnos · Todas las modalidades'],...Object.entries(modes).map(([mode,name])=>['turnos_'+mode,'En turnos · '+name]),['caja','En caja'],['ctacte','En Cta Cte']].map(([key,label])=>({key:'ventas:'+key,label,metric:'importe'}))},{label:'Ajustes',options:[['ingreso_libre','Ingresos extraordinarios'],['egreso','Egresos extraordinarios'],['retiro_capital','Retiros de capital'],['ajuste_caja','Ajustes de caja'],['ajuste_bancario','Ajustes bancarios']].map(([key,label])=>({key:'ajustes:'+key,label,metric:'importe'}))},{label:'Compras',options:[{key:'compras:cantidad',label:'Cantidad por producto',metric:'unidades'},{key:'compras:costo',label:'Costo unitario medio por producto',metric:'costo'},{key:'compras:total',label:'Importe gastado por producto',metric:'importe'}]},{label:'Empleados',options:[{key:'empleados:sueldos',label:'Sueldos abonados',metric:'importe'}]}];
groups.splice(2,0,groups.splice(3,1)[0]);
groups.splice(2,0,{label:'Ocasiones especiales',options:[['todas','Todas las modalidades'],...Object.entries(modes).filter(([key])=>key!=='sin_modalidad')].map(([key,label])=>({key:'especiales:'+key,label,metric:'importe'}))});
function mode(x){const n=String(x||'').replace(/^padel_/,'');return ['indoor','outdoor','tenis_indoor','tenis_outdoor'].includes(n)?n:'sin_modalidad';}
function matches(actual,wanted){return wanted==='padel'?['indoor','outdoor'].includes(actual):wanted==='tenis'?actual.startsWith('tenis_'):actual===wanted;}
function build(data,key,tools,productFilter){tools=tools||root?.PricProductReports;if(!tools)throw Error('No se pudieron preparar los informes.');const [kind,choice]=key.split(':'),occurrences=data.ocurrencias||[],movements=(data.movimientos||[]).filter(x=>!x.anulado),receipts=(data.pagos||[]).filter(x=>!x.anulado),operations=new Map();
 function get(id,date,source={}){const composite=id||'registro:'+date+':'+operations.size;let o=operations.get(composite);if(!o){o={id:composite,fecha:String(date||''),concepto:source.jugador||source.turnoReferencia||source.detalle||source.titulo||'Turno',modalidad:mode(source.modalidad),esClase:!!source.esClase||source.tipo==='clase',esEspecial:source.esEspecial===true||source.tipoEvento==='Especial',turnos:0,horas:0,service:{efectivo:0,transferencia:0,monto:0},goods:{efectivo:0,transferencia:0,monto:0}};operations.set(composite,o);}return o;}
 for(const o of occurrences){const row=get(o.id||o.reservaId+'@'+o.fecha,o.fecha,o);row.turnos=1;row.horas=Number(o.duracion||0)/60;row.concepto=[o.jugador||'Turno',o.hora?o.hora+' hs':'',o.canchaNombre?'Cancha '+o.canchaNombre:('Cancha '+o.cancha)].filter(Boolean).join(' · ');}
 const label=(r,original)=>original?.concepto||((r.canchaNombre||r.cancha)?[r.jugador||r.turnoReferencia?.split(' · ')[0]||'Turno',r.horaTurno?r.horaTurno+' hs':'','Cancha '+(r.canchaNombre||r.cancha)].filter(Boolean).join(' · '):r.turnoReferencia||r.detalle||'Consumo de turno');
 const credit=[];const add=(into,part)=>{for(const f of ['efectivo','transferencia','monto'])into[f]+=cents(part[f]);};
 for(const r of receipts){if(!['turno','clase'].includes(r.tipo))continue;const baseKey=r.reservaId+'@'+r.fechaTurno,original=operations.get(baseKey),date=r.fecha||r.fechaTurno,key=date===r.fechaTurno?baseKey:baseKey+'#'+date,o=get(key,date,{...original,...r,modalidad:original?.modalidad||r.modalidad}),p=tools.splitReceipt(r);o.concepto=label(r,original);add(o.service,p.service);add(o.goods,p.products);if(r.reclasificadoCtaCte&&p.products.monto)credit.push({...p.products,concepto:r.turnoReferencia||r.detalle||'Venta en Cta Cte',turnos:0,horas:0});}
 for(const r of movements){if(!r.cobroCtaCteId||r.subtipoAjuste!=='cobro_cuenta_corriente')continue;const operation=r.operaciones?.[0],isTurn=operation?.startsWith('turn:'),id=isTurn?operation.slice(5):null;
  if(isTurn){const original=operations.get(id),turnDate=id.slice(id.lastIndexOf('@')+1),key=turnDate===r.fecha?id:id+'#'+r.fecha,o=get(key,r.fecha,{...original,...r,modalidad:original?.modalidad||r.modalidad,esEspecial:original?.esEspecial??r.esEspecial,esClase:original?.esClase||r.esClase===true||Number(r.importeClases)>0});o.concepto=label(r,original);add(o.service,tools.collectionPart(r,o.esClase?'importeClases':'importeTurnos'));add(o.goods,tools.collectionPart(r,'importeProductos'));}
  if(Number(r.importeProductos)>0)credit.push({...tools.collectionPart(r,'importeProductos'),concepto:r.detalle||r.titulo||'Venta en Cta Cte',turnos:0,horas:0});
 }
 function moneyRow(o,goods=false){const v={...o.service};if(goods)for(const f of ['efectivo','transferencia','monto'])v[f]+=o.goods[f];return {...o,...Object.fromEntries(Object.entries(v).map(([k,n])=>[k,n/100]))};}
 let rows=[];
 if(['turnos','combinado','profesores'].includes(kind))rows=[...operations.values()].filter(o=>!o.esEspecial&&o.esClase===(kind==='profesores')&&matches(o.modalidad,choice)).map(o=>moneyRow(o,kind==='combinado'));
 else if(kind==='especiales')rows=[...operations.values()].filter(o=>o.esEspecial&&(choice==='todas'||matches(o.modalidad,choice))).map(o=>moneyRow(o));
 else if(kind==='ventas'){
  if(choice==='ctacte')rows=credit;
  else if(choice==='caja')rows=tools.counterIncome(movements).map(r=>({...r,monto:tools.amount(r),concepto:r.titulo||r.productoNombre||'Venta en caja',turnos:0,horas:0}));
  else rows=receipts.flatMap(r=>{const o=operations.get(r.reservaId+'@'+r.fechaTurno),actual=o?.modalidad||mode(r.modalidad);if(!['turno','clase'].includes(r.tipo)||r.reclasificadoCtaCte||(choice!=='turnos'&&!matches(actual,choice.slice(7))))return[];const part=tools.splitReceipt(r).products;return cents(part.monto)?[{...part,concepto:label(r,o),turnos:0,horas:0}]:[];});
 }else if(kind==='ajustes'){
  rows=movements.filter(r=>{if(r.nominaId||r.cobroCtaCteId&&r.subtipoAjuste==='cobro_cuenta_corriente'||r.esVentaCredito)return false;const type=r.subtipoAjuste||r.tipo;return type===choice&&(!['ingreso_libre','egreso'].includes(choice)||!r.ajusteVenta&&!r.ventaId&&!r.productoId);}).map(r=>({...r,monto:tools.amount(r),concepto:(r.concepto||r.detalle||r.titulo||'Ajuste')+(r.modalidad?' · '+(modes[r.modalidad]||r.modalidad):''),turnos:0,horas:0,...(['egreso','stock'].includes(r.tipo)?{monto:-tools.amount(r),efectivo:-Number(r.efectivo||0),transferencia:-Number(r.transferencia||0)}:{})}));
  if(choice==='ingreso_libre')for(const r of movements)if(!r.anulado&&Number(r.importeOtros)>0)rows.push({...tools.collectionPart(r,'importeOtros'),concepto:r.concepto||r.detalle||r.titulo||'Ingreso cobrado de Cta Cte',turnos:0,horas:0});
  if(['ajuste_caja','ajuste_bancario'].includes(choice)){const f=choice==='ajuste_caja'?'efectivo':'transferencia';for(const r of receipts){const p=tools.splitReceipt(r).adjustment;if(p[f])rows.push({...p,concepto:'Ajuste de cobro · '+(r.turnoReferencia||r.detalle||'Turno'),monto:p[f],efectivo:f==='efectivo'?p[f]:0,transferencia:f==='transferencia'?p[f]:0,turnos:0,horas:0});}}
 }else if(kind==='compras'){
  const byProduct=new Map();for(const r of movements.filter(x=>x.tipo==='stock'&&(!productFilter||String(x.productoId||x.productoNombre||x.titulo)===productFilter))){const id=String(r.fecha)+'|'+(r.productoId||r.productoNombre||r.titulo),q=Number(r.cantidad||0);if(!byProduct.has(id))byProduct.set(id,{fecha:r.fecha,concepto:r.productoNombre||r.titulo||'Mercadería',productoId:r.productoId,unidades:0,monto:0,efectivo:0,transferencia:0,turnos:0,horas:0});const g=byProduct.get(id);g.unidades+=q;for(const f of ['monto','efectivo','transferencia'])g[f]+=cents(f==='monto'?r.monto??r.importe:r[f]);}rows=[...byProduct.values()].map(g=>({...g,monto:g.monto/100,efectivo:g.efectivo/100,transferencia:g.transferencia/100,costo:g.unidades?g.monto/100/g.unidades:0}));
 }else if(kind==='empleados')rows=movements.filter(x=>x.nominaId&&x.subtipoAjuste==='sueldo').map(r=>({...r,monto:tools.amount(r),concepto:r.titulo||r.detalle||'Sueldo',turnos:0,horas:0}));
 rows=rows.sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha))||String(a.concepto).localeCompare(String(b.concepto)));
 const totals={efectivo:0,transferencia:0,monto:0,turnos:0,horas:0,unidades:0,costo:0};for(const r of rows){for(const f of ['efectivo','transferencia','monto'])totals[f]+=cents(r[f]);for(const f of ['turnos','horas','unidades'])totals[f]+=Number(r[f]||0);}for(const f of ['efectivo','transferencia','monto'])totals[f]/=100;totals.costo=totals.unidades?totals.monto/totals.unidades:0;
 return {rows,totals,kind,metric:groups.flatMap(g=>g.options).find(o=>o.key===key)?.metric||'importe'};
}
function daily(result){const days=new Map();for(const r of result.rows){const d=String(r.fecha).slice(0,10);if(!days.has(d))days.set(d,{fecha:d,monto:0,unidades:0,turnos:0,horas:0});const g=days.get(d);g.monto+=cents(r.monto);g.unidades+=Number(r.unidades||0);g.turnos+=Number(r.turnos||0);g.horas+=Number(r.horas||0);}return [...days.values()].map(g=>({...g,monto:g.monto/100,costo:g.unidades?g.monto/100/g.unidades:0}));}
function chartPeriods(result,from,to){
 const rows=daily(result);
 if(!rows.length)return {periods:[],unit:'días'};
 const day=86400000,start=new Date(from+'T00:00:00Z'),end=new Date(to+'T00:00:00Z');
 const month=d=>d.getUTCFullYear()*12+d.getUTCMonth();
 const week=d=>Math.floor((d.getTime()/day+3)/7);
 const year=d=>d.getUTCFullYear();
 const options=[
  ['días',d=>d.getTime()/day],
  ['semanas',week],
  ['meses',month],
  ['trimestres',d=>Math.floor(month(d)/3)],
  ['años',year]
 ];
 const selected=options.find(([,key])=>key(end)-key(start)<7);
 const years=Math.ceil((year(end)-year(start)+1)/7);
 const [unit,key]=selected||['bloques de '+years+' años',d=>Math.floor((year(d)-year(start))/years)];
 const groups=new Map();
 for(const row of rows){
  const id=key(new Date(row.fecha+'T00:00:00Z'));
  let period=groups.get(id);
  if(!period){period={fecha:row.fecha,fin:row.fecha,monto:0,unidades:0,turnos:0,horas:0};groups.set(id,period);}
  period.fin=row.fecha;
  period.monto+=cents(row.monto);
  for(const field of ['unidades','turnos','horas'])period[field]+=row[field];
 }
 return {unit,periods:[...groups.values()].map(p=>({...p,monto:p.monto/100,costo:p.unidades?p.monto/100/p.unidades:0}))};
}
function records(data,label,tools){
  const group=groups.find(g=>g.label===label),kind=group.options[0].key.split(':')[0];
  let options=group.options;
  if(['turnos','combinado','profesores'].includes(kind))options=options.filter(o=>['indoor','outdoor','tenis_indoor','tenis_outdoor','sin_modalidad'].includes(o.key.split(':')[1]));
  if(kind==='especiales')options=options.filter(o=>o.key==='especiales:todas');
  if(kind==='ventas')options=options.filter(o=>['ventas:turnos','ventas:caja','ventas:ctacte'].includes(o.key));
  if(kind==='compras')options=options.filter(o=>o.key==='compras:total');
  const rows=options.flatMap(o=>build(data,o.key,tools).rows.map(r=>({...r,origen:r.modalidad&&r.modalidad!=='sin_modalidad'?modes[r.modalidad]:o.label})));
  rows.sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha))||String(a.concepto).localeCompare(String(b.concepto)));
  return rows;
}
const api={groups,build,daily,chartPeriods,records,modes,mode};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PricGroupedReports=api;
})(typeof window==='object'?window:null);
