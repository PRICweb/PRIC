(function(){
 'use strict';
 const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>';
 function attach(){document.querySelectorAll('input[type="password"]:not([data-pric-password-toggle])').forEach(input=>{
  input.dataset.pricPasswordToggle='true';const wrapper=document.createElement('div');wrapper.className='pric-password-field';input.before(wrapper);wrapper.append(input);const button=document.createElement('button');button.type='button';button.className='pric-password-toggle';
  function refresh(){const visible=input.type==='text';button.innerHTML=eye+(visible?'':'<path d="m3 3 18 18"/>')+'</svg>';button.setAttribute('aria-label',visible?'Ocultar contraseña':'Mostrar contraseña');button.setAttribute('aria-pressed',String(visible));button.title=visible?'Ocultar contraseña':'Mostrar contraseña';}
  button.onclick=()=>{input.type=input.type==='password'?'text':'password';refresh();};wrapper.append(button);refresh();
 });}
 attach();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);new MutationObserver(attach).observe(document.documentElement,{childList:true,subtree:true});
})();
