const res = await fetch('https://saas-q8nb.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'super@eduyantra.com', password: 'demo123' })
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
