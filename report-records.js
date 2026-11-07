(function(){
'use strict';
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(n||0);
document.addEventListener('DOMContentLoaded',()=>{
 const panel=document.getElementById('panel-metricas-club');
 if(!panel)return;
 const box=document.createElement('details');box.id='pric-report-records';box.className='pric-admin-accordion';
 box.innerHTML='<summary>Registros</summary><div class="panel-card-club pric-grouped-report"><div class="pric-report-period"><label>Desde<input class="input-form" type="date" name="from"></label><label>Hasta<input class="input-form" type="date" name="to"></label><button class="btn-modal btn-guardar" type="button">Seleccionar</button></div><label>Categoría<select class="input-form" data-no-search="true"></select></label><p role="status"></p><table class="pric-admin-data-table record-summary report-table" hidden><thead></thead><tbody></tbody><tfoot></tfoot></table><details class="report-details" hidden><summary>Detalles</summary><table class="pric-admin-data-table record-lines report-table"><thead><tr><th>Fecha</th><th>Detalle</th><th>Modalidad / origen</th><th>Cantidad / horas</th><th>Costo unitario medio</th><th>Efectivo</th><th>Transferencia</th><th>Total</th></tr></thead><tbody></tbody></table><button class="pric-media-button" type="button" hidden>Mostrar 50 más</button></details></div>';
 const query=s=>box.querySelector(s),select=query('select'),from=query('[name=from]'),to=query('[name=to]'),buttons=box.querySelectorAll('button'),status=query('[role=status]');
 const groups=window.PricGroupedReports.groups;
 for(const group of groups)select.add(new Option(group.label,group.label));
 const day=new Intl.DateTimeFormat('sv-SE').format(new Date());from.value=day.slice(0,8)+'01';to.value=day;
 panel.insertBefore(box,document.getElementById('pric-sales-margin'));
 let data=null,rows=[],limit=50,version=0,club=null;
 function collect(){
  rows=window.PricGroupedReports.records(data,select.value);
  limit=50;query('.report-details').open=false;render();
 }
 function render(){
  const summary=window.PricGroupedReports.recordSummary(rows,select.value),table=query('.record-summary'),details=query('.report-details');
  const columns=[['nombre','Modalidad / origen']];
  if(['Turnos','Turnos + Ventas','Profesores','Ocasiones especiales'].includes(select.value))columns.push(['turnos','Cantidad'],['horas','Horas']);
  if(select.value==='Compras')columns.push(['unidades','Unidades'],['costo','Costo unitario medio']);
  columns.push(['efectivo','Efectivo'],['transferencia','Transferencia'],['monto','Total']);
  table.hidden=false;details.hidden=false;
  const head=table.querySelector('thead'),body=table.querySelector('tbody'),foot=table.querySelector('tfoot');
  head.replaceChildren();body.replaceChildren();foot.replaceChildren();
  const header=document.createElement('tr');
  for(const [,name] of columns){const th=document.createElement('th');th.textContent=name;header.append(th);}head.append(header);
  for(const row of [...summary.rows,summary.totals]){
   const tr=document.createElement('tr');
   for(const [key,name] of columns){
    const td=document.createElement('td');td.dataset.label=name;td.dataset.mobileLabel=name;
    td.textContent=key==='nombre'?row[key]:['monto','efectivo','transferencia','costo'].includes(key)?key==='costo'&&row===summary.totals&&summary.rows.length>1?'—':money(row[key]):new Intl.NumberFormat('es-AR').format(row[key]);
    tr.append(td);
   }
   (row===summary.totals?foot:body).append(tr);
  }
  const lines=query('.record-lines tbody');lines.replaceChildren();
  const labels=['Fecha','Detalle','Modalidad / origen','Cantidad / horas','Costo unitario medio','Efectivo','Transferencia','Total'];
  for(const r of rows.slice(0,limit)){
   const tr=document.createElement('tr'),values=[r.fecha,r.concepto,r.origen,r.unidades?r.unidades+' unidades':r.turnos?r.turnos+' / '+r.horas+' h':'—',r.unidades?money(r.costo):'—',money(r.efectivo),money(r.transferencia),money(r.monto)];
   values.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;td.dataset.mobileLabel=labels[i];td.dataset.label=labels[i];tr.append(td);});
   lines.append(tr);
  }
  buttons[1].hidden=limit>=rows.length;
  status.textContent='Totales de '+rows.length+' registros. Detalles: '+Math.min(limit,rows.length)+' de '+rows.length+'.';
 }
 function resetTables(){
  for(const node of box.querySelectorAll('.record-summary tbody,.record-summary tfoot,.record-lines tbody'))node.replaceChildren();
  query('.record-summary').hidden=true;query('.report-details').hidden=true;query('.report-details').open=false;buttons[1].hidden=true;
 }
 function clear(){version++;data=null;rows=[];resetTables();status.textContent='Seleccioná el período.';buttons[0].disabled=false;}
 buttons[0].onclick=async()=>{
  if(!from.value||!to.value||from.value>to.value){status.textContent='Elegí un período válido.';return;}
  data=null;const request=++version;club=window.CLUB_DOC_ID_ACTUAL;const currentClub=club;
  buttons[0].disabled=true;status.textContent='Cargando';
  try{const result=await window.cargarInformeNumerico(from.value,to.value);if(request!==version||currentClub!==window.CLUB_DOC_ID_ACTUAL)return;data=result;collect();}
  catch(e){if(request===version){resetTables();status.textContent=e.message;}}
  finally{if(request===version)buttons[0].disabled=false;}
 };
 select.onchange=()=>{if(data&&club===window.CLUB_DOC_ID_ACTUAL)collect();};
 buttons[1].onclick=()=>{limit+=50;render();};
 from.onchange=to.onchange=clear;
 window.addEventListener('pric-session-ended',clear);
 window.addEventListener('pric-view-change',()=>{if(club&&club!==window.CLUB_DOC_ID_ACTUAL)clear();});
});
})();
