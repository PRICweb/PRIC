(function(){
 'use strict';
 const mobile=matchMedia('(max-width:767px)'),tabs=['actividad','movimientos','turnero','inventario','config'];
 const group=v=>['profes','torneos'].includes(v)?'turnero':['finanzas','metricas'].includes(v)?'inventario':v;
 let restoring=false,historyStarted=false;
 let professorGroups=[];
 let closeConfiguration=false;
 function prepareAudit(){const panel=document.getElementById('panel-actividad-club'),toolbar=panel?.querySelector('.actividad-toolbar'),retention=panel?.querySelector('.actividad-periodo');if(!panel||!toolbar||!retention)return;let footer=document.getElementById('pric-mobile-audit-footer');if(!footer){footer=document.createElement('div');footer.id='pric-mobile-audit-footer';footer.className='pric-mobile-only';const more=document.createElement('button');more.type='button';more.id='pric-mobile-audit-more';more.className='btn-modal btn-guardar';more.textContent='Más';more.dataset.action='window.cargarMasActividadClub()';more.disabled=true;footer.append(more);panel.append(footer);}if(mobile.matches){if(retention.parentElement!==footer)footer.prepend(retention);}else if(retention.parentElement!==toolbar)toolbar.prepend(retention);}
 window.PricMobileAuditState=state=>{const button=document.getElementById('pric-mobile-audit-more');if(button){button.disabled=state.loading||!state.hasMore;button.textContent=state.loading?'Cargando…':'Más';button.title=state.hasMore?'Cargar 20 registros más':'No hay más registros';}};
 function configureSave(){
  const panel=document.getElementById('panel-config-club'),save=panel?.querySelector('.pric-config-save'),row=document.getElementById('pric-mobile-exit'),header=panel?.querySelector('.panel-header-club');if(!save||!row||!header)return;
  const onboarding=!!document.getElementById('pric-onboarding');
  if(mobile.matches&&!onboarding){if(save.parentElement!==row)row.prepend(save);if(closeConfiguration&&document.getElementById('pric-config-info')){panel.querySelectorAll('.seccion-acordeon>.contenido-acordeon').forEach(el=>el.hidden=true);panel.querySelectorAll('.header-acordeon[aria-expanded]').forEach(el=>el.setAttribute('aria-expanded','false'));panel.querySelectorAll('details[open]').forEach(el=>el.open=false);closeConfiguration=false;}}
  else {if(save.parentElement!==header)header.append(save);save.classList.remove('pric-floating-save');}
  const active=mobile.matches&&!onboarding&&document.body.classList.contains('panel-activo')&&window.__vistaPanelClubActual==='config';
  const nav=document.getElementById('sidebar-admin-club'),bottom=innerHeight-(nav?.offsetHeight||80),rect=row.getBoundingClientRect();
  if(mobile.matches&&!onboarding){const gap=parseFloat(getComputedStyle(row).columnGap)||0;const width=(row.getBoundingClientRect().width-gap)/2;save.style.setProperty('--pric-save-width',width+'px');const right=innerWidth-row.getBoundingClientRect().right;save.style.setProperty('--pric-save-right',Math.max(0,right)+'px');}
  save.classList.toggle('pric-floating-save',active&&(rect.top<0||rect.top+48>bottom));
 }
 let administrationGroups=[];
 function administrationAccordions(){
  const label=document.querySelector('#sidebar-admin-club [data-sidebar-target=inventario]>span:last-child');if(label)label.textContent=mobile.matches?'Administración':'Inventario';
  if(!mobile.matches){for(const item of administrationGroups){item.marker.replaceWith(item.node);item.wrapper.remove();}administrationGroups=[];return;}
  if(administrationGroups.length)return;
  const stock=document.getElementById('tabla-inventario')?.closest('.panel-card-club');
  for(const [title,node]of [['Categorías de producto',document.getElementById('card-categorias-inventario')],['Stock actual',stock],['Historial de transacciones',document.querySelector('#panel-finanzas-club .panel-card-historial')],['Exportar balance',document.querySelector('#panel-finanzas-club .panel-exportar-balance')]]){
   if(!node)continue;const marker=document.createComment('Original '+title),wrapper=document.createElement('details'),summary=document.createElement('summary');wrapper.className='pric-admin-accordion';summary.textContent=title;node.before(marker,wrapper);wrapper.append(summary,node);administrationGroups.push({marker,node,wrapper});
  }
 }
 function professorAccordions(){
  if(!mobile.matches){for(const item of professorGroups){item.marker.replaceWith(item.node);item.wrapper.remove();}professorGroups=[];document.querySelector('#modal-profesores .pric-prof-legacy')?.classList.remove('pric-prof-legacy');return;}
  if(professorGroups.length)return;
  const panel=document.querySelector('#modal-profesores .panel-view-content');if(!panel)return;
  for(const [title,node]of [['Crear',panel.querySelector('.profesores-form-row')],['Lista',panel.querySelector('.profesores-lista-box')],['Cobro',document.getElementById('ac-clases')]]){
   if(!node)continue;const marker=document.createComment('Original '+title);node.before(marker);if(title==='Cobro')node.parentElement.classList.add('pric-prof-legacy');
   const wrapper=document.createElement('details');wrapper.className='pric-prof-accordion';const summary=document.createElement('summary');summary.textContent=title;wrapper.append(summary,node);panel.append(wrapper);professorGroups.push({marker,node,wrapper});
  }
 }
 function open(v){window.abrirVistaPanelClub?.(v);window.scrollTo({top:0,behavior:'instant'});highlight();}
 window.addEventListener('pric-view-change',e=>{if(!mobile.matches||!document.body.classList.contains('panel-activo'))return;if(e.detail==='config')closeConfiguration=true;configureSave();const state={pricMobile:true,view:e.detail};if(!historyStarted){history.replaceState(state,'');historyStarted=true;}else if(!restoring&&history.state?.view!==e.detail){history.pushState(state,'');}highlight();});
 function back(){if(history.state?.pricMobile&&historyStarted&&window.__vistaPanelClubActual!=='turnero')history.back();else open('turnero');}
 window.addEventListener('popstate',e=>{if(window.pricHandleModalBack?.(e))return;if(!mobile.matches||!document.body.classList.contains('panel-activo'))return;restoring=true;open(e.state?.pricMobile?e.state.view:'turnero');restoring=false;});
 function fitTables(){const app=document.getElementById('app-content');if(app){let brand=document.getElementById('pric-mobile-brand');if(!brand){brand=document.createElement('div');brand.id='pric-mobile-brand';brand.className='pric-mobile-only';document.getElementById('sidebar-admin-club').after(brand);}const name=window.CLUB_DOC_ID_ACTUAL||document.getElementById('sidebar-club-id')?.textContent||'';const text='PRIC · '+name;if(brand.textContent!==text)brand.textContent=text;const turnero=document.getElementById('pantalla-club');if(turnero&&!document.getElementById('pric-mobile-turnero-description')){const subtitle=document.createElement('p');subtitle.id='pric-mobile-turnero-description';subtitle.className='pric-mobile-only';subtitle.textContent='Turnos, profesores y torneos';turnero.querySelector('h2')?.after(subtitle);}}if(mobile.matches)document.querySelectorAll('#tabla-inventario tr').forEach(row=>{const category=row.querySelector('td:first-child small');if(category&&row.getBoundingClientRect().height){const top=category.getBoundingClientRect().top-row.getBoundingClientRect().top+(category.getBoundingClientRect().height-28)/2;row.style.setProperty('--pric-category-action-top',Math.max(0,top)+'px');}});document.querySelectorAll('#lista-profesores button').forEach(button=>{if(button.querySelector('.pric-professor-pencil'))return;if((button.dataset.action||'').includes('editarTarifaProfe')){const icon=document.createElement('span');icon.className='pric-mobile-only pric-professor-pencil';icon.setAttribute('aria-hidden','true');icon.textContent='✏️';const text=document.createElement('span');text.className='pric-professor-edit-text';text.textContent=button.textContent;button.replaceChildren(icon,text);button.setAttribute('aria-label','Editar tarifa del profesor');}else if((button.dataset.action||'').includes('eliminarProfe'))button.setAttribute('aria-label','Borrar profesor');});if(mobile.matches){const title=document.querySelector('#pantalla-club h2');if(title&&title.textContent!=='Turnero')title.textContent='Turnero';const grid=document.querySelector('.turnero-grid'),count=grid?.querySelectorAll('.turnero-cancha-head').length||1;if(grid)grid.style.setProperty('--pric-court-font',(count>6?8:count>4?9:11)+'px');}document.querySelectorAll('#app-content table').forEach(table=>{if(table.closest('.turnero-grid-shell'))return;const headings=[...table.querySelectorAll('thead th')].map(el=>el.textContent.trim());if(!headings.length)return;table.classList.add('pric-mobile-table');table.querySelectorAll('tbody tr').forEach(row=>{[...row.children].forEach((cell,i)=>{if(cell.tagName==='TD'&&cell.colSpan===1&&cell.dataset.mobileLabel!==headings[i])cell.dataset.mobileLabel=headings[i]||'';});});});document.querySelectorAll('#modal-profesores,#modal-torneos .panel-header-club').forEach(panel=>{const title=panel.matches('#pantalla-club')?panel.querySelector('h2'):panel.querySelector('h2');if(title&&!title.querySelector('.pric-mobile-back')){const button=document.createElement('button');button.type='button';button.className='pric-mobile-only pric-mobile-back';button.setAttribute('aria-label','Volver atrás');button.textContent='←';button.onclick=back;title.prepend(button);}});}
 function highlight(){if(!mobile.matches)return;const current=group(window.__vistaPanelClubActual||'turnero');document.querySelectorAll('#sidebar-admin-club [data-sidebar-target]').forEach(b=>{b.classList.toggle('active',b.dataset.sidebarTarget===current);if(b.dataset.sidebarTarget===current)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
 function prepare(){
  const turnero=document.getElementById('pantalla-club'),config=document.getElementById('panel-config-club'),sidebar=document.getElementById('sidebar-admin-club');if(!turnero||!config||!sidebar)return;
  if(!document.getElementById('pric-mobile-turnero-links')){const links=document.createElement('nav');links.id='pric-mobile-turnero-links';links.className='pric-mobile-only';links.setAttribute('aria-label','Más opciones del turnero');for(const [v,title]of [['profes','Profesores'],['torneos','Torneos']]){const button=document.createElement('button');button.type='button';button.textContent=title;{const icon=sidebar.querySelector(v==='profes'?'[data-sidebar-target=profes] .pric-desktop-icon':'[data-sidebar-target=torneos] svg')?.cloneNode(true);if(icon){icon.classList.remove('pric-desktop-icon');icon.classList.add('pric-mobile-professor-icon');button.prepend(icon);}}button.onclick=()=>{if(v==='torneos'){window.webAlert?.('No disponible todavía.','Torneos');return;}open(v);};links.append(button);}turnero.append(links);}
  let exitBox=document.getElementById('pric-mobile-exit');if(!exitBox){exitBox=document.createElement('div');exitBox.id='pric-mobile-exit';exitBox.className='pric-mobile-only';config.append(exitBox);}
  const exit=document.querySelector('.sidebar-logout-club');if(exit){if(mobile.matches){exitBox.append(exit);exit.classList.remove('pric-fixed-mobile-exit');}else sidebar.append(exit);}
  if(!document.getElementById('pric-mobile-professor-title')){const title=document.createElement('h2');title.id='pric-mobile-professor-title';title.className='pric-mobile-only';title.textContent='Profesores';document.querySelector('#modal-profesores .panel-view-content')?.prepend(title);}
  professorAccordions();
  administrationAccordions();
  configureSave();
  prepareAudit();
  highlight();
 }
 document.addEventListener('DOMContentLoaded',()=>{prepare();fitTables();new MutationObserver(fitTables).observe(document.getElementById('app-content'),{childList:true,subtree:true});mobile.addEventListener('change',()=>{prepare();if(document.body.classList.contains('panel-activo'))open(group(window.__vistaPanelClubActual||'turnero'));});
  new MutationObserver(()=>{if(mobile.matches&&!document.getElementById('pric-mobile-exit'))prepare();configureSave();}).observe(document.getElementById('panel-config-club'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','aria-expanded']});
  new ResizeObserver(()=>requestAnimationFrame(configureSave)).observe(document.getElementById('panel-config-club'));
  document.addEventListener('scroll',()=>requestAnimationFrame(configureSave),{passive:true,capture:true});window.addEventListener('resize',configureSave);document.addEventListener('click',()=>requestAnimationFrame(configureSave));
 });
 document.addEventListener('click',()=>{if(mobile.matches)setTimeout(highlight,0);});
 document.addEventListener('toggle',e=>requestAnimationFrame(()=>{fitTables();if(!mobile.matches||!e.target.matches?.('.pric-admin-accordion,.pric-prof-accordion'))return;const summary=e.target.querySelector('summary'),rect=summary?.getBoundingClientRect(),nav=document.getElementById('sidebar-admin-club');if(rect&&(rect.top<16||rect.bottom>innerHeight-(nav?.offsetHeight||80)-12))summary.scrollIntoView({block:'start',behavior:'smooth'});}),true);window.addEventListener('resize',()=>requestAnimationFrame(fitTables));
 let gesture=null,holdingTurnero=false,pendingTurneroRender=null;
 document.addEventListener('DOMContentLoaded',()=>{const original=window.renderizarPantallas;if(typeof original==='function')window.renderizarPantallas=function(...args){if(holdingTurnero){pendingTurneroRender=()=>original.apply(this,args);return;}return original.apply(this,args);};});
 window.addEventListener('touchstart',e=>{holdingTurnero=!!e.target.closest?.('#lista-reservas-club');},{passive:true,capture:true});
 const finishTouch=()=>{holdingTurnero=false;const pending=pendingTurneroRender;pendingTurneroRender=null;if(pending)setTimeout(pending,0);};window.addEventListener('touchend',finishTouch,{passive:true,capture:true});window.addEventListener('touchcancel',finishTouch,{passive:true,capture:true});
 document.addEventListener('touchstart',e=>{
  gesture=null;if(!mobile.matches||!document.body.classList.contains('panel-activo')||e.touches.length!==1)return;
  if(document.querySelector('dialog[open],.web-dialog-overlay.open')||[...document.querySelectorAll('.modal-overlay:not(.panel-seccion-club)')].some(el=>el.getBoundingClientRect().height>0))return;
  if(e.target.closest('input,textarea,select,button,a,canvas,.turnero-card,#sidebar-admin-club'))return;
  for(let el=e.target;el&&el!==document.body;el=el.parentElement){const style=getComputedStyle(el);if(el.scrollWidth>el.clientWidth+2&&/auto|scroll/.test(style.overflowX))return;}
  const t=e.touches[0];gesture={x:t.clientX,y:t.clientY,time:Date.now()};
 },{passive:true});
 document.addEventListener('touchmove',e=>{if(!gesture||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;if(Math.abs(dy)>30&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)*1.5){gesture.horizontal=true;if(e.cancelable)e.preventDefault();}},{passive:false});
 let suppressClickUntil=0;document.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('touchcancel',()=>gesture=null,{passive:true});
 document.addEventListener('touchend',e=>{const start=gesture;gesture=null;if(!start||e.changedTouches.length!==1)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)<60||Math.abs(dy)>60||Math.abs(dx)<Math.abs(dy)*1.5)return;const idx=tabs.indexOf(group(window.__vistaPanelClubActual||'turnero')),next=idx+(dx<0?1:-1);if(next>=0&&next<tabs.length){suppressClickUntil=Date.now()+350;open(tabs[next]);}},{passive:true});
})();




