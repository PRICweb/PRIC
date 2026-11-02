const {test}=require('node:test');const assert=require('node:assert/strict');const {message}=require('../payment-status');
test('return URL success alone never confirms reservation',()=>assert.equal(message(null,'success').type,'pending'));
test('confirmed reservation remains valid without WhatsApp and never promises delivery',()=>{const result=message({senaPagada:true},'pending');assert.equal(result.type,'success');assert.match(result.text,/reserva sigue siendo válida/);assert.doesNotMatch(result.text,/te llegará|recibirás/);assert.match(result.text,/contactá al club/);});
test('late paid reservation needs review even with stale confirmed flag',()=>assert.equal(message({estadoPago:'pago_requiere_revision',status:'confirmado'},'success').title,'Pago en revisión'));
test('expiry does not claim that payment failed',()=>assert.equal(message({estado:'vencida'},'success').title,'Plazo de reserva vencido'));
test('cancelled and rejected reservations never display stale confirmation',()=>{
 assert.equal(message({estado:'cancelada',status:'confirmado'},'success').type,'failure');
 assert.equal(message({estadoPago:'pago_no_aprobado',status:'confirmado'},'success').type,'failure');
});

test('paid and no-deposit confirmations use the exact same court and time message',()=>{
 const {confirmationText}=require('../payment-status'),expected='Reserva confirmada en Cancha Central a las 18:30hs. Si no recibís el aviso por WhatsApp, la reserva sigue siendo válida. Ante cualquier duda sobre tu turno, contactá al club.';
 assert.equal(message({estado:'confirmado',senaPagada:true,canchaNombre:'Central',hora:'18:30'},'success').text,expected);
 assert.equal(message({estado:'confirmado',estadoPago:'sin_sena',canchaNombre:'Central',hora:'18:30'}).text,expected);
 assert.equal(confirmationText({canchaNombre:'Cancha Central',hora:'18:30'}),expected);
 assert.match(confirmationText({cancha:'6',hora:'22:00'}),/^Reserva confirmada en Cancha 6 a las 22:00hs\./);
});
