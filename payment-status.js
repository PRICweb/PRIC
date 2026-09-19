(function(root){
  function message(reservation, result){
    const r=reservation||{};
    const states=[r.estadoPago,r.estado,r.status].map(v=>String(v||'').toLowerCase());
    if(states.includes('pago_requiere_revision')||states.includes('pago_monto_invalido'))return {type:'pending',title:'Pago en revisión',text:'El pago requiere revisión del club. Tu turno todavía no está confirmado. Contactá al club antes de realizar otro pago.'};
    if(reservation&&(r.senaPagada===true||states.includes('sena_pagada')||states.includes('confirmado')))return {type:'success',title:'Reserva confirmada',text:'Tu reserva quedó confirmada.'};
    if(states.includes('vencida'))return {type:'pending',title:'Plazo de reserva vencido',text:'El turno no está confirmado. Si realizaste el pago, contactá al club antes de volver a pagar.'};
    if(states.includes('pago_no_aprobado')||result==='failure')return {type:'failure',title:'Reserva sin confirmar',text:'No tenemos confirmación de la reserva. Si se debitó el pago, contactá al club antes de volver a pagar.'};
    return {type:'pending',title:'Verificando tu reserva',text:'Estamos esperando la confirmación del sistema. No realices otro pago. Si la confirmación no llega, contactá al club.'};
  }
  root.PRICPaymentStatus={message};
  if(typeof module==='object'&&module.exports)module.exports={message};
})(typeof window==='object'?window:globalThis);
