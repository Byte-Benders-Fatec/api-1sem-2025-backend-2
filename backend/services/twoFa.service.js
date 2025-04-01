const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { generateVerificationCode } = require('../utils/generateVerificationCode');
const { queryAsync } = require('../configs/db');

async function createTwoFaCode(userId) {
  try {
    const code = generateVerificationCode();
    const code_hash = await bcrypt.hash(code, 10);

    const id = uuidv4();
    const attempts = 0;
    const maxAttempts = 5;
    const status = 'pending';
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    const sql = `
      INSERT INTO two_fa_code (
        id, user_id, code_hash, attempts, max_attempts, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [id, userId, code_hash, attempts, maxAttempts, status, createdAt, expiresAt];
    await queryAsync(sql, values);

    return { code, expiresAt };
  } catch (error) {
    throw new Error('Falha ao gerar o código de verificação');
  }
}

module.exports = { createTwoFaCode };
