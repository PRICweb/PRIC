(function(root){
 'use strict';
 const cents=v=>{const n=Number(v??0),result=Math.round(n*100);if(!Number.isFinite(n)||!Number.isSafeInteger(result))throw Error('Importe inválido.');return result;};
 function timeOf(value){if(!value)return '—';if(/^\d{2}:\d{2}(?::\d{2})?$/.test(String(value)))return String(value).slice(0,5);const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);}
 function financeGroups(transactions){const groups=new Map(),result=[];for(const t of transactions){if(!t.reservaId||!['turno','clase'].includes(t.tipo)){result.push({item:t,children:[]});continue;}const key=t.reservaId+'|'+t.fechaTurno;if(!groups.has(key)){const court=t.cancha||String(t.turnoReferencia||t.detalle||'').match(/Cancha\s+([^·]+)/i)?.[1]?.trim()||'sin identificar';const reference=String(t.turnoReferencia||t.detalle||'').replace(/\s*·\s*Cancha\s+[^·]+/i,'');const group={item:{...t,id:'group-'+key,detalle:(t.tipo==='clase'?'Pago clase · cancha ':'Pago cancha ')+court+(reference?' · '+reference:''),efectivo:0,transferencia:0,monto:0},children:[]};groups.set(key,group);result.push(group);}const group=groups.get(key);group.children.push(t);for(const field of ['efectivo','transferencia','monto'])group.item[field]=(cents(group.item[field])+cents(t[field]))/100;}return result;}
 function ordered(items,direction='desc'){
  const groups=new Map();
  for(const item of items){const key=String(item.fecha||'')+'|'+(item.ventaId?'sale:'+item.ventaId:'row:'+item.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  const stamp=t=>{const hour=timeOf(t.horaAsiento||t.fechaRegistro||t.fechaPagoRegistro);const parsed=Date.parse(t.fechaRegistro||t.fechaPagoRegistro||'');return {hour:hour==='—'?'':hour,parsed:Number.isFinite(parsed)?parsed:0};};
  const anchor=group=>group.find(t=>!t.ajusteVenta)||group[0];
  return [...groups.values()].sort((a,b)=>{const x=anchor(a),y=anchor(b),sx=stamp(x),sy=stamp(y);const result=String(x.fecha).localeCompare(String(y.fecha))||sx.hour.localeCompare(sy.hour)||(sx.parsed&&sy.parsed?sx.parsed-sy.parsed:0)||String(x.ventaId||x.id).localeCompare(String(y.ventaId||y.id));return direction==='asc'?result:-result;}).flatMap(group=>group.sort((a,b)=>Number(!!a.ajusteVenta)-Number(!!b.ajusteVenta)||String(a.id).localeCompare(String(b.id))));
 }
 const api={ordered,timeOf,financeGroups};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.PricTransactionHistory=api;
})(typeof window!=='undefined'?window:null);
