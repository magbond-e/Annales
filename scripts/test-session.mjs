const res = await fetch('http://127.0.0.1:3005/api/auth/session');
console.log('STATUS:', res.status);
const text = await res.text();
console.log('BODY:', text);
