const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { queryAsync } = require('../configs/db');

const validTypes = ['login', 'password_reset', 'password_change', 'critical_action'];

// Geração segura do código de 6 dígitos com crypto
function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString(); // 6 dígitos
}

// Remove códigos antigos, mantendo no máximo 5 por tipo
const pruneOldTwoFaCodes = async (userId, type) => {
  try {
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo inválido. Tipos permitidos: ${validTypes.join(', ')}`);
    }

    const [userResult] = await queryAsync("SELECT id FROM user WHERE id = ?", [userId]);
    if (userResult.length === 0) {
      throw new Error("Usuário não encontrado.");
    }

    const [olderCodes] = await queryAsync(
      `
      SELECT id FROM (
        SELECT id
        FROM two_fa_code
        WHERE user_id = ? AND type = ?
        ORDER BY created_at DESC
        OFFSET 5
      ) AS codes_to_delete
      `,
      [userId, type]
    );

    if (olderCodes.length === 0) {
      return { message: "Nenhum código antigo para remover." };
    }

    const idsToDelete = olderCodes.map(row => row.id);
    const placeholders = idsToDelete.map(() => '?').join(', ');

    await queryAsync(
      `DELETE FROM two_fa_code WHERE id IN (${placeholders})`,
      idsToDelete
    );

    return { message: `${idsToDelete.length} código(s) antigos removido(s).` };
  } catch (error) {
    throw new Error("Erro ao remover códigos 2FA antigos: " + error.message);
  }
};

// Cria novo código 2FA com controle de tipo e limpeza prévia
const createTwoFaCode = async (userId, type = 'login') => {
  try {
    await pruneOldTwoFaCodes(userId, type); // Limpa antes de criar

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
        id, user_id, code_hash, attempts, max_attempts, status, created_at, expires_at, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [id, userId, code_hash, attempts, maxAttempts, status, createdAt, expiresAt, type];
    await queryAsync(sql, values);

    return { code, expiresAt };
  } catch (error) {
    throw new Error('Falha ao gerar o código de verificação: ' + error.message);
  }
};

module.exports = {
  createTwoFaCode,
  pruneOldTwoFaCodes
};
