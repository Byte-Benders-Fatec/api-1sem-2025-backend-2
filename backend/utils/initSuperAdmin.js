const bcrypt = require('bcrypt');
const { queryAsync } = require("../configs/db");

async function initSuperAdmin() {
  const [rows] = await queryAsync('SELECT * FROM user WHERE email = ?', [process.env.ADMIN_EMAIL]);

  if (rows.length > 0) {
    console.log('Usuário admin já existe.');
    return;
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  
  const sql = `
    INSERT INTO user (name, email, password_hash, system_role_id, is_active)
    VALUES (?, ?, ?, ?, ?)
  `;
  const values = [
    process.env.ADMIN_NAME,
    process.env.ADMIN_EMAIL,
    passwordHash,
    1, // ID do system_role "Super Admin"
    1  // is_active
  ];

  await queryAsync(sql, values);
  console.log('Usuário Super Admin criado com sucesso!');
}

module.exports = initSuperAdmin;
