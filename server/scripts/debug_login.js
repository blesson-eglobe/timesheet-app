// Quick test of the db.ts parameter substitution
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

mysql.createConnection({host:'localhost',port:3306,user:'root',password:'',database:'timesheet_db'}).then(async c => {
  // Simulate db.ts logic exactly
  const text = 'SELECT * FROM users WHERE email = $1 OR username = $2 LIMIT 1';
  const params = ['admin@eglobe.com', 'admin@eglobe.com'];
  
  let mysqlQuery = text;
  const mysqlParams = [];
  mysqlQuery = text.replace(/\$(\d+)/g, (_, indexStr) => {
    mysqlParams.push(params[parseInt(indexStr, 10) - 1]);
    return '?';
  });
  console.log('Query:', mysqlQuery);
  console.log('Params:', mysqlParams);
  
  const [rows] = await c.execute(mysqlQuery, mysqlParams);
  if (rows.length > 0) {
    const user = rows[0];
    console.log('\nUser found:', user.email, '| role:', user.role);
    const valid = await bcrypt.compare('Admin@123', user.password_hash);
    console.log('Password valid:', valid);
  } else {
    console.log('No user found!');
  }
  await c.end();
}).catch(e => console.error('Error:', e.message));
