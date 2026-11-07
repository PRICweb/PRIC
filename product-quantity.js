(function(){
'use strict';
function decorate(input){
 if(!input||input.closest('.pric-product-stepper'))return;
 const controls=document.createElement('span');controls.className='pric-product-stepper';
 input.before(controls);
 for(const [label,delta] of [['−',-1],['+',1]]){
  const button=document.createElement('button');button.type='button';button.className='pric-media-button';button.textContent=label;
  button.setAttribute('aria-label',delta<0?'Restar una unidad':'Sumar una unidad');
  button.onclick=event=>{event.preventDefault();if(input.disabled)return;const min=Number(input.min||0),max=input.max?Number(input.max):1000000;input.value=String(Math.min(max,Math.max(min,Number(input.value||0)+delta)));input.dispatchEvent(new Event('input',{bubbles:true}));};
  if(delta<0)controls.append(button,input);else controls.append(button);
 }
}
document.addEventListener('DOMContentLoaded',()=>{for(const id of ['compra-cantidad','reponer-cantidad','inv-stock','editar-stock-nuevo'])decorate(document.getElementById(id));});
})();
