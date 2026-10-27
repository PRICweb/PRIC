(function(){
 'use strict';
 document.addEventListener('beforeinput',event=>{
  const input=event.target;
  if(input?.tagName!=='INPUT'||input.type!=='number'||input.disabled||input.readOnly||!String(event.inputType||'').startsWith('insert'))return;
  if(input.value.trim()!==''&&Number(input.value)===0)input.value='';
 },true);
})();
