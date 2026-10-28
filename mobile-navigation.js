(function(root){
 'use strict';
 const bottom=['metricas','movimientos','turnero','inventario','empleados'];
 const order=[...bottom,'profes','config','actividad'];
 function plan(allowed){
  const views=order.filter(view=>allowed.includes(view));
  const direct=bottom.filter(view=>views.includes(view));
  const linked=views.includes('profes')&&views.includes('turnero')?['profes']:[];
  const more=['profes','config','actividad'].filter(view=>views.includes(view)&&!linked.includes(view));
  return {views,direct,more,linked};
 }
 if(typeof module==='object'&&module.exports){module.exports={plan,order};return;}
 const mobile=matchMedia('(max-width:767px)');let currentPlan=plan([]),signature='';
 function button(view){return document.querySelector('#sidebar-admin-club [data-sidebar-target="'+view+'"]');}
 function select(view){window.abrirVistaPanelClub?.(view);window.scrollTo({top:0,behavior:'instant'});}
 function menu(){
  let dialog=document.getElementById('pric-mobile-navigation');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='pric-mobile-navigation';dialog.setAttribute('aria-labelledby','pric-mobile-navigation-title');
  const head=document.createElement('div');head.className='pric-mobile-navigation-header';
  const title=document.createElement('h2');title.id='pric-mobile-navigation-title';title.textContent='Menú';
  const close=document.createElement('button');close.type='button';close.className='pric-subview-back';close.textContent='×';close.setAttribute('aria-label','Cerrar opciones');close.onclick=()=>dialog.close();
  head.append(title,close);const list=document.createElement('nav');list.setAttribute('aria-label','Vistas disponibles');dialog.append(head,list);document.body.append(dialog);return dialog;
 }
 function highlight(){
  if(!mobile.matches)return;
  const active=window.__vistaPanelClubActual;
  document.querySelectorAll('#sidebar-admin-club [data-sidebar-target]').forEach(node=>{const selected=node.dataset.sidebarTarget===active;node.classList.toggle('active',selected);if(selected)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});

 }
 function render(){
  const nav=document.querySelector('#sidebar-admin-club .sidebar-menu-club');if(!nav)return;
  currentPlan=plan(order.filter(view=>button(view)&&(!window.PricCanScope||window.PricCanScope(view))));
  const key=mobile.matches+'|'+currentPlan.views.join('|');
  if(key!==signature){
   signature=key;
   for(const view of order){const node=button(view);if(!node)continue;if(mobile.matches&&currentPlan.direct.includes(view))node.dataset.mobileNav='true';else delete node.dataset.mobileNav;}
   const count=currentPlan.direct.length;nav.style.setProperty('--pric-mobile-nav-count',String(Math.max(1,count)));
   document.body.toggleAttribute('data-mobile-nav-empty',mobile.matches&&!count);
  }
  document.querySelectorAll('#pric-mobile-turnero-links button[data-mobile-target]').forEach(node=>node.hidden=!!window.PricCanScope&&!window.PricCanScope(node.dataset.mobileTarget));
  const brand=document.getElementById('pric-mobile-brand');
  if(brand&&!brand.querySelector('button')){
   const account=document.createElement('button');account.id='pric-mobile-menu';account.type='button';account.className='pric-mobile-account';account.setAttribute('aria-label','Abrir menú');account.setAttribute('aria-controls','pric-mobile-navigation');account.setAttribute('aria-expanded','false');
   account.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
   account.onclick=()=>{
    const dialog=menu(),list=dialog.querySelector('nav');list.replaceChildren();
    for(const view of currentPlan.more){
     const original=button(view),item=document.createElement('button');item.type='button';item.className='pric-mobile-navigation-item';item.dataset.mobileView=view;
     const icon=(original.querySelector('.pric-desktop-icon')||original.querySelector('.sidebar-icon-club svg'))?.cloneNode(true);if(icon){icon.removeAttribute('class');item.append(icon);}
     const label=document.createElement('span');label.textContent=window.PricPermissionCatalog?.[view]?.[0]||view;item.append(label);
     if(window.__vistaPanelClubActual===view)item.setAttribute('aria-current','page');item.onclick=()=>window.pricCloseModalThen(dialog,()=>select(view));list.append(item);
    }
    const logout=document.createElement('button');logout.type='button';logout.className='pric-mobile-navigation-item';
    const exitIcon=document.querySelector('.sidebar-logout-club svg')?.cloneNode(true);if(exitIcon)logout.append(exitIcon);const text=document.createElement('span');text.textContent='Cerrar sesión';logout.append(text);
    logout.onclick=()=>window.pricCloseModalThen(dialog,()=>document.querySelector('.sidebar-logout-club')?.click());list.append(logout);
    account.setAttribute('aria-expanded','true');dialog.addEventListener('close',()=>account.setAttribute('aria-expanded','false'),{once:true});dialog.showModal();
   };brand.append(account);
  }

  highlight();
 }
 window.PricMobileNavigation={render,views:()=>currentPlan.views.slice(),highlight};
 document.addEventListener('DOMContentLoaded',()=>{render();new MutationObserver(render).observe(document.querySelector('#sidebar-admin-club .sidebar-menu-club'),{childList:true});});
 window.addEventListener('pric-view-change',render);window.addEventListener('pric-permissions-change',render);mobile.addEventListener('change',()=>{document.getElementById('pric-mobile-navigation')?.close();render();});
})(typeof window==='object'?window:globalThis);
