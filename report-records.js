(function(root,factory){
'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(!root)return;root.PricRecordTables=api;
const money=n=>n==null?'No calculable':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(n),num=n=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n||0);
document.addEventListener('DOMContentLoaded',()=>{
 const panel=document.getElementById('panel-metricas-club');if(!panel)return;
 const box=document.createElement('details');box.id='pric-report-records';box.className='pric-admin-accordion';
 box.innerHTML='<summary>Registros</summary><div class="panel-card-club pric-grouped-report pric-records"><div class="pric-report-period"><label>Desde<input class="input-form" type="date" name="from"></label><label>Hasta<input class="input-form" type="date" name="to"></label><button type="button" class="btn-modal btn-guardar record-load">Seleccionar</button></div><fieldset class="record-categories"><legend>Categorías</legend><div class="record-categories-options"></div><button type="button" class="pric-media-button record-select-all">Seleccionar todas</button></fieldset><p role="status" class="record-status" aria-live="polite"></p><div class="record-tables"></div></div>';
 const $=s=>box.querySelector(s),from=$('[name=from]'),to=$('[name=to]'),load=$('.record-load'),status=$('[role=status]'),output=$('.record-tables'),checks=$('.record-categories-options'),all=$('.record-select-all');
 for(const category of api.categories){const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');input.type='checkbox';input.value=category;input.checked=category==='Turnos';text.textContent=category;label.append(input,text);checks.append(label);}
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());from.value=day.slice(0,8)+'01';to.value=day;
 panel.insertBefore(box,document.getElementById('pric-sales-margin'));
 let revision=0,club=null;
 const selected=()=>[...checks.querySelectorAll('input:checked')].map(n=>n.value);
 function clear(message='Presioná Seleccionar para consultar las categorías elegidas.'){revision++;output.replaceChildren();status.textContent=message;load.disabled=false;all.textContent=selected().length===api.categories.length?'Quitar selección':'Seleccionar todas';}
 function cell(row,value,key,label,header=false){const cell=document.createElement(header?'th':'td');cell.textContent=header?label:key==='nombre'||key==='categoria'?String(value??''):['turnos','horas','unidades'].includes(key)?num(value):money(value);if(header)cell.scope='col';else{cell.dataset.label=label;cell.dataset.mobileLabel=label;}row.append(cell);}
 function table(title,columns,rows,totals){const section=document.createElement('section');section.className='record-category-result';const heading=document.createElement('h3');heading.textContent=title;const table=document.createElement('table');table.className='pric-admin-data-table record-summary report-table';table.setAttribute('aria-label',title);const head=document.createElement('thead'),body=document.createElement('tbody'),foot=document.createElement('tfoot'),header=document.createElement('tr');for(const [key,label]of columns)cell(header,'',key,label,true);head.append(header);
  for(const row of rows){const tr=document.createElement('tr');for(const [key,label]of columns)cell(tr,row[key],key,label);body.append(tr);}
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=columns.length;td.textContent='Sin movimientos en el período.';tr.append(td);body.append(tr);}
  const total=document.createElement('tr');for(const [key,label]of columns)cell(total,key==='nombre'||key==='categoria'?'Total:':totals[key],key,label);foot.append(total);table.append(head,body,foot);section.append(heading,table);output.append(section);return section;
 }
 function render(result){output.replaceChildren();for(const report of result.tables){const section=table(report.title,report.columns,report.rows,report.totals);if(report.note){const note=document.createElement('p');note.className='panel-muted record-note';note.textContent=report.note;section.append(note);}}
  const section=table('Resumen general',[['categoria','Categoría'],['monto','Total de la categoría'],['impacto','Impacto en el total']],result.summary,{monto:undefined,impacto:result.total});section.classList.add('record-grand-total');const note=document.createElement('p');note.className='panel-muted record-note';note.textContent='Total de las categorías seleccionadas: ingresos y margen de ventas menos sueldos y egresos. Compras y retiros son informativos y no se descuentan otra vez. No incluye saldos pendientes de cobro.';section.append(note);
  // There is no useful sum of gross amounts alongside the signed result.
  section.querySelector('tfoot tr').children[1].textContent='—';
  status.textContent=result.tables.length+' categorías · '+from.value.split('-').reverse().join('/')+' al '+to.value.split('-').reverse().join('/')+(result.total==null?' · Hay costos incompletos: el total no es calculable.':'')+(result.warnings.length?' · '+result.warnings.join(' '):'');
 }
 load.onclick=async()=>{const labels=selected(),start=from.value,end=to.value;if(!start||!end||start>end){clear('Elegí un período válido.');return;}if(!labels.length){clear('Seleccioná al menos una categoría.');return;}const request=++revision,currentClub=root.CLUB_DOC_ID_ACTUAL;club=currentClub;load.disabled=true;output.replaceChildren();status.textContent='Cargando';
  try{const [data,sales]=await Promise.all([root.cargarInformeNumerico(start,end),labels.includes('Ventas')?root.cargarVentasMargen(start,end):Promise.resolve([])]);if(request!==revision||currentClub!==root.CLUB_DOC_ID_ACTUAL)return;render(api.build({...data,ventasMargen:sales},labels,{R:root.PricGroupedReports,P:root.PricProductReports,F:root.PricFinancialReport}));}
  catch(e){if(request===revision){output.replaceChildren();status.textContent=e.message||'No se pudieron generar los registros.';}}
  finally{if(request===revision)load.disabled=false;}
 };
 checks.addEventListener('change',()=>clear());all.onclick=()=>{const next=selected().length!==api.categories.length;checks.querySelectorAll('input').forEach(n=>n.checked=next);clear();};from.onchange=to.onchange=()=>{clear();};
 root.addEventListener('pric-session-ended',()=>{club=null;clear();});root.addEventListener('pric-view-change',()=>{if(club&&club!==root.CLUB_DOC_ID_ACTUAL){club=null;clear();}});
});
})(typeof window==='object'?window:null,function(){
'use strict';
const categories=['Turnos','Ventas','Profesores','Ocasiones especiales','Ajustes','Ingresos y egresos','Compras','Sueldos','Retiros de capital'];
const C=x=>{const v=Number(x??0);if(!Number.isFinite(v)||!Number.isSafeInteger(Math.round(v*100)))throw Error('Hay un importe inválido en los registros.');return Math.round(v*100);};
function build(data,selection,{R,P,F}={}){if(!R||!P||!F)throw Error('No se pudieron preparar los registros.');if(!Array.isArray(selection)||selection.some(s=>!categories.includes(s)))throw Error('Seleccioná categorías válidas.');const chosen=categories.filter(c=>selection.includes(c));if(!chosen.length)throw Error('Seleccioná al menos una categoría.');const tables=[],summary=[],warnings=[],cashSaleIds=new Set((data.movimientos||[]).filter(x=>!x.anulado&&x.tipo==='venta_producto'&&!x.esVentaCredito).map(x=>x.ventaId));
 for(const title of chosen){let rows,totals,columns=[['nombre','Modalidad / origen']],note='',informative=title==='Compras'||title==='Retiros de capital';
  if(title==='Ventas'){const sales=F.productMargins(data,{R,P});rows=sales.byMode.map(x=>({nombre:x.nombre,unidades:x.unidades,revenue:x.revenue,cost:x.cost,monto:x.margin}));totals={unidades:rows.reduce((s,x)=>s+x.unidades,0),revenue:sales.revenue,cost:sales.cost,monto:sales.margin};columns.push(['revenue','Ventas cobradas'],['cost','Costo de mercadería vendida'],['monto','Margen']);note='Incluye productos cobrados en caja, turnos y Cta Cte. El total es el margen: ventas menos costo histórico. En pagos parciales se reconoce el costo proporcional a lo cobrado.';warnings.push(...sales.warnings);}
  else{let source;
   if(['Turnos','Profesores','Ocasiones especiales','Compras'].includes(title))source=R.records(data,title,P);
   else if(title==='Sueldos')source=R.build(data,'empleados:sueldos',P).rows.map(x=>({...x,monto:-Math.abs(x.monto),efectivo:-Math.abs(x.efectivo||0),transferencia:-Math.abs(x.transferencia||0)}));
   else{const types=title==='Ajustes'?['ajuste_caja','ajuste_bancario']:title==='Retiros de capital'?['retiro_capital']:['ingreso_libre','egreso'];source=types.flatMap(type=>R.build(data,'ajustes:'+type,P).rows.map(x=>({...x,categoriaRegistro:({ajuste_caja:'Ajuste de caja',ajuste_bancario:'Ajuste bancario',ingreso_libre:'Ingreso',egreso:'Egreso',retiro_capital:'Retiro de capital'})[type]}))).filter(x=>!(x.ajusteVenta&&x.tipo==='egreso'&&cashSaleIds.has(x.ventaId)));}
   const grouped=R.recordSummary(source,['Ajustes','Ingresos y egresos','Retiros de capital'].includes(title)?'Ajustes':title==='Sueldos'?'Empleados':title);rows=grouped.rows;totals=grouped.totals;
   if(['Turnos','Profesores','Ocasiones especiales'].includes(title)){columns.push(['turnos','Cantidad'],['horas','Horas']);note='Importes cobrados por cancha, sin productos.';}
   if(title==='Compras')columns.push(['unidades','Unidades']);
   columns.push(['efectivo','Efectivo'],['transferencia','Transferencia'],['monto','Total']);
   if(informative)note='Informativo: no se descuenta del total final.';
   if(title==='Ajustes')note='Sobrantes positivos y faltantes negativos. Los faltantes de ventas ya descontados de su ingreso no se descuentan otra vez.';
  }
  const impacto=informative?0:totals.monto;tables.push({title,rows,totals,columns,note,informative});summary.push({categoria:title+(informative?' · Informativo':''),monto:totals.monto,impacto});
 }
 const total=summary.some(x=>x.impacto==null)?null:summary.reduce((n,x)=>n+C(x.impacto),0)/100;
 return{tables,summary,total,warnings:[...new Set(warnings)]};
}
return{categories,build};
});
