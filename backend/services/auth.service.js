const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { queryAsync } = require('../configs/db');
const { sendEmail } = require('../utils/sendEmail');

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
        LIMIT 20 OFFSET 4
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

const verifyTwoFaCode = async (email, code) => {
  if (!email || !code) throw new Error('E-mail e código são obrigatórios');

  const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
  const user = users[0];
  if (!user) throw new Error('Usuário não encontrado');

  const [codes] = await queryAsync(
    `SELECT * FROM two_fa_code WHERE user_id = ? AND status = 'pending' AND type = 'login' ORDER BY created_at DESC`,
    [user.id]
  );
  const codeCheck = codes[0];
  if (!codeCheck) throw new Error('Código não encontrado ou já utilizado');

  const isExpired = new Date(codeCheck.expires_at) < new Date();
  const tooManyAttempts = codeCheck.attempts >= codeCheck.max_attempts;
  if (isExpired || tooManyAttempts) {
    await queryAsync(`UPDATE two_fa_code SET status = 'denied' WHERE id = ?`, [codeCheck.id]);
    throw new Error('Código expirado ou número máximo de tentativas atingido');
  }

  const isMatch = await bcrypt.compare(code, codeCheck.code_hash);
  if (!isMatch) {
    await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
    throw new Error('Código incorreto');
  }

  await queryAsync(`UPDATE two_fa_code SET status = 'verified' WHERE id = ?`, [codeCheck.id]);

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];
  if (!system_role) throw new Error('O usuário não possui papel de sistema atribuído');

  const accessToken = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      system_role: system_role.name
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { token: accessToken };
};

const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email e senha são obrigatórios');
  }

  // Busca o usuário pelo e-mail
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
  const user = users[0];

  if (!user) {
    throw new Error('Credenciais inválidas 1');
  }

  // Busca a senha válida e permanente do usuário
  const [passwordRows] = await queryAsync(`
    SELECT * FROM user_password
    WHERE user_id = ? AND is_temp = false AND status = 'valid'
    ORDER BY created_at DESC LIMIT 1
  `, [user.id]);

  const userPassword = passwordRows[0];
  
  if (!userPassword || !(await bcrypt.compare(password, userPassword.password_hash))) {
    throw new Error('Credenciais inválidas 2');
  }

  if (!user.is_active) {
    throw new Error('Usuário inativo, não possui acesso');
  }

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];

  if (!system_role) {
    throw new Error('O usuário não possui papel de sistema atribuído');
  }

  // Geração e envio do código 2FA
  const { code } = await createTwoFaCode(user.id, 'login');

  const disable2FA = process.env.SKIP_2FA === 'true';
  if (!disable2FA) {
    await sendEmail({
      to: user.email,
      subject: 'Seu código de acesso',
      text: `Seu código de verificação é: ${code}`
    });
  }

  const loginToken = jwt.sign(
    { email: user.email, scope: 'verify' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  return {
    login_token: loginToken,
    ...(disable2FA ? { code } : {})
  };
};

module.exports = {
  pruneOldTwoFaCodes,
  createTwoFaCode,
  verifyTwoFaCode,
  login,
};
