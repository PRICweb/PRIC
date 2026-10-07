(function(){
 'use strict';
 const nativeShow=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){this.tabIndex=-1;this.setAttribute('autofocus','');nativeShow.call(this);this.focus({preventScroll:true});};
 function dialog(title){const el=document.createElement('dialog');el.className='pric-form-dialog';const heading=document.createElement('h3');heading.textContent=title;el.append(heading);document.body.append(el);return el;}
 window.PricForm=({title,fields})=>new Promise(resolve=>{const el=dialog(title),form=document.createElement('form');let done=false;const prior=document.activeElement;function finish(value){if(done)return;done=true;el.close();el.remove();if(prior&&!prior.matches('input,textarea'))prior.focus({preventScroll:true});resolve(value);}form.method='dialog';form.noValidate=true;const error=document.createElement('p');error.className='pric-form-error';error.setAttribute('role','alert');for(const field of fields){const label=document.createElement('label');label.textContent=field.label;const input=document.createElement('input');input.className='input-form';input.name=field.name;input.type=field.type||'text';input.value=String(field.value??'');input.required=true;if(field.min!==undefined)input.min=field.min;label.append(input);form.append(label);}const actions=document.createElement('div');actions.className='pric-form-actions';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.onclick=()=>finish(null);const save=document.createElement('button');save.type='submit';save.textContent='Guardar';save.className='primary';actions.append(cancel,save);form.append(error,actions);form.onsubmit=e=>{e.preventDefault();if(form.checkValidity())finish(Object.fromEntries(new FormData(form)));else{error.textContent='Revisá los campos: completalos con valores válidos.';}};el.append(form);el.oncancel=e=>{e.preventDefault();finish(null);};el.showModal();el.focus({preventScroll:true});});
 function choose(select){if(select.disabled||select.hidden||select.multiple||select.size>1)return;const title=select.getAttribute('aria-label')||document.querySelector('label[for="'+select.id+'"]')?.textContent||select.closest('label')?.childNodes[0]?.textContent||'Seleccionar opción';const el=dialog(title.trim()),search=document.createElement('input'),list=document.createElement('div');search.type='search';search.className='input-form';search.placeholder='Buscar…';search.setAttribute('aria-label','Buscar opciones');list.className='pric-choice-list';const prior=document.activeElement;let done=false;function close(){if(done)return;done=true;el.close();el.remove();if(prior&&!prior.matches('input,textarea'))prior.focus({preventScroll:true});}function draw(){list.replaceChildren();for(const option of select.options){if(option.hidden||option.disabled||option.parentElement.disabled||!option.textContent.toLowerCase().includes(search.value.toLowerCase()))continue;const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.setAttribute('aria-pressed',String(option.selected));let pressed=false;button.onpointerdown=()=>{pressed=true;};button.onclick=e=>{if(!pressed&&e.detail!==0)return;select.value=option.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));close();};list.append(button);}if(!list.children.length){const empty=document.createElement('p');empty.textContent='Sin opciones disponibles';list.append(empty);}}search.hidden=true;const find=document.createElement('button');find.type='button';find.textContent='Buscar';find.onclick=()=>{search.hidden=false;find.hidden=true;search.focus();};search.oninput=draw;const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.onclick=close;el.oncancel=e=>{e.preventDefault();close();};el.append(find,search,list,cancel);draw();el.showModal();}
 document.addEventListener('pointerdown',e=>{const select=e.target.closest?.('select');if(select&&!select.hidden&&!select.disabled&&!select.multiple&&select.size<=1){e.preventDefault();choose(select);}},true);
 document.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT'&&['Enter',' ','ArrowDown'].includes(e.key)){e.preventDefault();choose(e.target);}},true);
 let outside=null,eatClick=false,openedClick=false;let activeModals=new Set();
 function closeModal(el){if(el.classList.contains('web-dialog-overlay')){el.pricCancel?.();return;}if(el.tagName==='DIALOG'){const cancel=new Event('cancel',{cancelable:true});if(el.dispatchEvent(cancel))el.close();return;}const functions={'modal-acciones':'cerrarModalAcciones','modal-reserva-admin':'cerrarModalReservaAdmin','modal-cobrar-clase':'cerrarModalCobrarClase','modal-agregar-producto':'cerrarModalAgregarProducto','modal-editar-precio':'cerrarModalEditarPrecio','modal-reponer-stock':'cerrarModalReposicion'};const fn=functions[el.id];if(fn&&typeof window[fn]==='function')window[fn]();else el.querySelector('[data-action*="cerrar"],[data-cancel]')?.click();}
 const modalHistory=[];let restoringModal=false,removingHistory=false,modalSequence=0;
 function syncModalHistory(current){
  if(!matchMedia('(max-width:767px)').matches)return;
  if(restoringModal){for(let i=modalHistory.length-1;i>=0;i--)if(!current.has(modalHistory[i].el))modalHistory.splice(i,1);return;}
  let removed=0;
  while(modalHistory.length&&!current.has(modalHistory[modalHistory.length-1].el)){modalHistory.pop();removed++;}
  if(removed){removingHistory=true;history.go(-removed);return;}
  if(removingHistory)return;
  for(const el of current)if(!modalHistory.some(entry=>entry.el===el)){
   const id='pric-modal-'+(++modalSequence);modalHistory.push({el,id});
   history.pushState({...history.state,pricModal:id},'');
  }
 }
 const handledBack=new WeakSet();
 window.pricHandleModalBack=e=>{
  if(handledBack.has(e))return true;
  if(removingHistory){handledBack.add(e);removingHistory=false;e.stopImmediatePropagation();syncModalHistory(activeModals);return true;}
  if(!modalHistory.length)return false;
  handledBack.add(e);e.stopImmediatePropagation();restoringModal=true;
  while(modalHistory.length&&modalHistory[modalHistory.length-1].id!==e.state?.pricModal)closeModal(modalHistory.pop().el);
  queueMicrotask(()=>{restoringModal=false;});return true;
 };
 window.addEventListener('popstate',window.pricHandleModalBack,true);
 function isOutside(el,e){if(el.tagName!=='DIALOG')return e.target===el;const r=el.getBoundingClientRect();return e.target===el&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);}
 window.addEventListener('pointerdown',e=>{eatClick=false;openedClick=false;const el=e.target.closest?.('dialog[open],.modal-overlay:not(.panel-seccion-club),.web-dialog-overlay.open');outside=el&&isOutside(el,e)?el:null;if(outside){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('pointerup',e=>{const el=outside;outside=null;if(!el||!isOutside(el,e))return;eatClick=true;e.preventDefault();e.stopImmediatePropagation();closeModal(el);},true);
 window.addEventListener('pointercancel',()=>outside=null,true);
 window.addEventListener('keydown',()=>{openedClick=false;eatClick=false;},true);
 // A modal opened on pointerup can receive compatibility mouse events from
 // that same touch. Consume them before their default action focuses a field.
 window.addEventListener('mousedown',e=>{if(openedClick||eatClick){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('touchend',e=>{if(openedClick||eatClick)e.preventDefault();},{capture:true,passive:false});
 window.addEventListener('focusin',e=>{if(openedClick&&e.target.matches?.('input,textarea,select')){e.target.blur();const box=e.target.closest('dialog,.modal-content,.web-dialog');if(box){box.tabIndex=-1;box.focus({preventScroll:true});}}},true);
 window.addEventListener('click',e=>{if(e.isTrusted&&(eatClick||openedClick)){eatClick=false;openedClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 new MutationObserver(()=>{const current=new Set([...document.querySelectorAll('dialog[open],.modal-overlay:not(.panel-seccion-club),.web-dialog-overlay.open')].filter(el=>el.getBoundingClientRect().height>0));for(const el of current)if(!activeModals.has(el)){openedClick=true;const focused=document.activeElement;if(focused&&el.contains(focused)&&focused.matches('input,textarea'))focused.blur();if(el.tagName!=='DIALOG'){const box=el.querySelector('.modal-content,.web-dialog');if(box){box.tabIndex=-1;box.focus({preventScroll:true});}}}activeModals=current;syncModalHistory(current);}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','open']});
})();
