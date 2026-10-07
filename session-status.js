(function(){
 'use strict';let timer;
 function message(text){const el=document.getElementById('auth-message');if(el){el.textContent=text;el.style.color='#52627a';}}
 document.addEventListener('click',event=>{const button=event.target.closest?.('#btn-login-club');if(!button)return;clearTimeout(timer);
  if(!document.getElementById('login-email')?.value||!document.getElementById('login-password')?.value)return;
  if(typeof window.loginClub!=='function'){event.preventDefault();event.stopImmediatePropagation();message('Todavía no se cargó el servicio de acceso. Esperá unos segundos y reintentá; si continúa, recargá la página y revisá la conexión.');return;}
  message('Conectando…');
  timer=setTimeout(()=>{const auth=document.getElementById('auth-screen');if(auth&&getComputedStyle(auth).display!=='none'&&document.getElementById('auth-message')?.textContent==='Conectando…')message('El acceso está tardando más de lo esperado. Revisá que el celular y la computadora estén en la misma red y que estés usando la cuenta de prueba.');},15000);
 },true);
 new MutationObserver(()=>{const auth=document.getElementById('auth-screen');if(auth&&getComputedStyle(auth).display==='none')clearTimeout(timer);}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['style','class']});
})();
