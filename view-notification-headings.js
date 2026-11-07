(function(){
'use strict';
const ids=['pantalla-club','modal-profesores','panel-inventario-club','panel-movimientos-club','panel-metricas-club','panel-config-club','panel-actividad-club','panel-ctacte-club','panel-empleados-club'];
function hasContent(node){
 if(node.matches('h2,.pwa-view-bell')||node.hidden||getComputedStyle(node).display==='none')return false;
 if(node.matches('button,input,select,textarea'))return true;
 if(node.children.length)return [...node.children].some(hasContent);
 return !!node.textContent.trim();
}
function sync(){
 const bell=document.getElementById('pwa-bell'),brand=document.querySelector('#sidebar-admin-club .sidebar-brand-club');
 const actions=matchMedia('(max-width:767px)').matches?document.getElementById('pric-mobile-actions'):null;
 const target=actions||brand;
 if(bell&&target&&bell.parentElement!==target){if(actions)actions.prepend(bell);else target.append(bell);}
 if(document.body.classList.contains('pwa-root-notifications'))document.body.classList.remove('pwa-root-notifications');
 for(const id of ids){const panel=document.getElementById(id);if(!panel)continue;
  if(!panel.classList.contains('pwa-main-view'))panel.classList.add('pwa-main-view');
  for(const old of panel.querySelectorAll('.pwa-view-bell,[data-pwa-generated-header]'))old.remove();
  let header=[...panel.children].find(n=>n.classList.contains('panel-header-club'));
  const turnTitle=id==='pantalla-club'?document.getElementById('titulo-turnero-panel'):null;
  if(turnTitle)header=turnTitle.parentElement;
  if(!header)continue;
  for(const h of header.querySelectorAll('h2'))if(!h.classList.contains('pwa-principal-title'))h.classList.add('pwa-principal-title');
  const empty=![...header.children].some(hasContent);
  if(header.classList.contains('pwa-empty-header')!==empty)header.classList.toggle('pwa-empty-header',empty);
 }
}
document.addEventListener('DOMContentLoaded',()=>{sync();const app=document.getElementById('app-content');if(app)new MutationObserver(sync).observe(app,{childList:true,subtree:true});});
window.addEventListener('pric-view-change',()=>queueMicrotask(sync));
})();
