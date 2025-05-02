const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { queryAsync } = require('../configs/db');
const { createTwoFaCode } = require('./twoFa.service');
const { sendEmail } = require('../utils/sendEmail');

const validScopes = ['login'];

const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email e senha são obrigatórios');
  }
  
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
  const user = users[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Credenciais inválidas');
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

module.exports = {
  login,
  verifyTwoFaCode
};
