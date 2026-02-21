import bcrypt from 'bcryptjs';

const hash = '$2a$10$3q2zARBjk5Bih8rLhN33LO2DhFiToo2AjmkLiBZEZpVJN3bz3iMhS';
const password = 'demo123';
const passwordAdmin = 'admin123';
const passwordAdminDemo = 'admin';

console.log('demo123:', bcrypt.compareSync(password, hash));
console.log('admin123:', bcrypt.compareSync(passwordAdmin, hash));
console.log('admin:', bcrypt.compareSync(passwordAdminDemo, hash));
