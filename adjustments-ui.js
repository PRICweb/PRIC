(function(root){
'use strict';
const sections={
 'Ajustes':[['ajuste_caja','Ajuste de caja'],['ajuste_bancario','Ajuste bancario']],
 'Ingresos y egresos':[['ingreso_libre','Ingreso'],['egreso','Egreso']],
 'Retiro de capital':[['retiro_capital','Retiro de capital']]
};
function belongs(row,title){return (sections[title]||[]).some(([type])=>type===(row.subtipoAjuste||row.tipo));}
const api={sections,belongs};if(typeof module==='object'&&module.exports)module.exports=api;if(!root)return;
document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id),select=$('mov-interno-tipo'),card=select?.closest('.pric-internal-card'),original=card?.closest('details');if(!card||!original)return;
 let current='Ajustes';const views=new Map([['Ajustes',original]]);
 original.dataset.adjustmentSection='Ajustes';
 for(const title of ['Ingresos y egresos','Retiro de capital']){const view=document.createElement('details');view.className=original.className;view.dataset.adjustmentSection=title;const summary=document.createElement('summary');summary.textContent=title;view.append(summary);views.set(title,view);original.parentElement.append(view);}
 const direction=document.createElement('label');direction.id='mov-ajuste-direccion-wrap';direction.textContent='Sentido del ajuste';const directionSelect=document.createElement('select');directionSelect.id='mov-ajuste-direccion';directionSelect.className='input-form';directionSelect.dataset.noSearch='true';directionSelect.append(new Option('Sobrante','entrada'),new Option('Faltante','salida'));direction.append(directionSelect);select.parentElement.after(direction);
 const modality=document.createElement('label');modality.id='mov-ajuste-modalidad-wrap';modality.textContent='Modalidad';const modalitySelect=document.createElement('select');modalitySelect.id='mov-ajuste-modalidad';modalitySelect.className='input-form';modalitySelect.dataset.noSearch='true';modalitySelect.append(new Option('Elegí una modalidad',''));
 for(const [id,name] of [['indoor','Pádel in'],['outdoor','Pádel out'],['tenis_indoor','Tenis in'],['tenis_outdoor','Tenis out']])modalitySelect.add(new Option(name,id));modality.append(modalitySelect);direction.after(modality);
 function fields(){const cash=select.value==='ajuste_caja',bank=select.value==='ajuste_bancario',adjustment=cash||bank,credit=window.PricCreditPayment?.active('ajuste_ingreso');direction.hidden=!adjustment;$('mov-interno-concepto').parentElement.hidden=adjustment;$('mov-interno-efectivo').parentElement.hidden=bank||credit;$('mov-interno-transferencia').parentElement.hidden=cash||credit;modality.hidden=select.value==='retiro_capital';modalitySelect.required=!modality.hidden;}
 select.addEventListener('change',()=>queueMicrotask(fields));
 const cancel=document.createElement('button');cancel.id='ajustes-cancelar';cancel.type='button';cancel.className='pric-media-button';cancel.hidden=true;cancel.textContent='Cancelar edición';cancel.dataset.action='window.cancelarEdicionAjuste()';card.querySelector('.pric-internal-movement').append(cancel);
 const history=document.createElement('div');history.className='pric-adjustments-history';history.innerHTML='<h3 id="ajustes-historial-titulo">Últimos ajustes</h3><p id="ajustes-estado" role="status"></p><table class="pric-admin-data-table"><thead><tr><th>Concepto</th><th>Tipo de movimiento</th><th>Monto</th><th>Acciones</th></tr></thead><tbody id="ajustes-lista"></tbody></table><button type="button" id="ajustes-mas" class="pric-media-button" data-action="window.cargarMasAjustes()" hidden>Cargar 10 más</button>';card.append(history);
 const buttonLabel=()=>current==='Ajustes'?'Registrar ajuste':current==='Retiro de capital'?'Registrar retiro':'Registrar movimiento';
 root.PricAdjustments={includes:row=>belongs(row,current),allows:type=>sections[current].some(([key])=>key===type),buttonLabel,openSection(title){if(!views.has(title))return;current=title;if(card.parentElement!==views.get(title))views.get(title).append(card);window.cancelarEdicionAjuste?.();select.replaceChildren(...sections[title].map(([id,name])=>new Option(name,id)));select.value=sections[title][0][0];select.parentElement.hidden=title==='Retiro de capital';directionSelect.value='entrada';select.dispatchEvent(new Event('change',{bubbles:true}));fields();$('btn-movimiento-interno').textContent=buttonLabel();$('ajustes-historial-titulo').textContent=title==='Ajustes'?'Últimos ajustes':title==='Retiro de capital'?'Últimos retiros de capital':'Últimos ingresos y egresos';window.reiniciarListaAjustes?.();}};
 for(const [title,view]of views)view.addEventListener('toggle',()=>{if(view.open&&card.parentElement!==view){root.PricAdjustments.openSection(title);window.cargarAjustesHistorial?.();}});
 root.PricAdjustments.openSection('Ajustes');
 const professors=$('lista-profesores')?.closest('table');if(professors){professors.classList.add('pric-admin-data-table');const head=professors.createTHead();head.innerHTML='<tr><th>Profesor / contacto / tarifa</th><th>Acciones</th></tr>';}
});
})(typeof window==='object'?window:null);
