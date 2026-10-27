(function(root){
 'use strict';
 const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 function range(key,now=new Date()){
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),from=new Date(today),to=new Date(today);
  if(key==='24h'){const start=new Date(now.getTime()-86400000);return{desde:iso(start),hasta:iso(now),instanteDesde:start,instanteHasta:new Date(now)};}
  if(key==='ayer'){from.setDate(from.getDate()-1);to.setDate(to.getDate()-1);}
  else if(key==='7d')from.setDate(from.getDate()-6);
  else if(key==='30d')from.setDate(from.getDate()-29);
  else if(key==='mes')from.setDate(1);
  else if(key==='mes_anterior'){from.setMonth(from.getMonth()-1,1);to.setDate(0);}
  else if(key!=='hoy')throw Error('Período desconocido');
  return{desde:iso(from),hasta:iso(to)};
 }
 function instant(item,occurrence=false){
  if(occurrence){const d=new Date(String(item.fecha).slice(0,10)+'T'+String(item.hora||''));return Number.isNaN(d.getTime())?null:d;}
  const stamp=item.fechaRegistro||item.fechaPagoRegistro;if(stamp){const d=new Date(stamp);if(!Number.isNaN(d.getTime()))return d;}
  if(/^\d{2}:\d{2}/.test(item.horaAsiento||'')){const day=item.fecha instanceof Date?iso(item.fecha):String(item.fecha).slice(0,10);const d=new Date(day+'T'+item.horaAsiento);if(!Number.isNaN(d.getTime()))return d;}
  return null;
 }
 function within(item,bounds,occurrence=false){if(!bounds)return true;const time=instant(item,occurrence);return !!time&&time>=bounds.instanteDesde&&time<=bounds.instanteHasta;}
 const api={range,instant,within};if(typeof module!=='undefined')module.exports=api;if(root)root.PricMetricPeriods=api;
})(typeof window!=='undefined'?window:null);
