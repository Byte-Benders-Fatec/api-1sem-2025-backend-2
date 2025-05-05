const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { queryAsync } = require('../configs/db');
const { sendEmail } = require('../utils/sendEmail');
const { verifyPassword } = require('./userPassword.service'); 
const { create } = require('domain');

const validTypes = ['login', 'password_reset', 'password_change', 'critical_action'];

// Geração segura do código de 6 ou 12 dígitos com crypto
function generateVerificationCode(double = false) {
  const codePart1 = crypto.randomInt(100000, 1000000).toString(); // 6 dígitos
  let codePart2 = null;
  if (double) {
    codePart2 = crypto.randomInt(100000, 1000000).toString(); // 6 dígitos
  }
  const code = double ? codePart1 + codePart2 : codePart1;
  return {code, part1: codePart1, part2: codePart2}
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
const createTwoFaCode = async (user, type = 'login', minutes = 10) => {
  try {
    const userId = user.id;
    await pruneOldTwoFaCodes(userId, type); // Limpa os antigos

    // Validação de tipo
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de código 2FA inválido. Tipos permitidos: ${validTypes.join(', ')}`);
    }

    // Variável de ambiente define se token será criado
    const useToken = process.env.TWO_FA_WITH_TOKEN === 'true';

    const { code, part1, part2 } = generateVerificationCode(useToken); // Gera código simples ou duplo
     const code_hash = await bcrypt.hash(code, 10);
    // const code_hash = code;

    const id = uuidv4();
    const attempts = 0;
    const maxAttempts = 5;
    const status = 'pending';
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    const formattedExpiration = expiresAt.toLocaleString('pt-BR');

    const sql = `
      INSERT INTO two_fa_code (
        id, user_id, code_hash, is_double, attempts, max_attempts, status, created_at, expires_at, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [id, userId, code_hash, useToken, attempts, maxAttempts, status, createdAt, expiresAt, type];
    await queryAsync(sql, values);

    // Criação do token com parte2 (caso código duplo)
    let twoFaToken = null;
    if (useToken) {
      const seconds = minutes * 60;
      twoFaToken = jwt.sign(
        { code: part2, type },
        process.env.JWT_SECRET,
        { expiresIn: seconds }
      );
    }

    // Envio do e-mail
    const disable2FA = process.env.SKIP_2FA === 'true';
    if (!disable2FA) {
      const subjectMap = {
        login: 'Código de acesso ao sistema',
        password_reset: 'Recuperação de senha',
        password_change: 'Confirmação de alteração de senha',
        critical_action: 'Confirmação de ação crítica'
      };

      const bodyMap = {
        login: `Use o código abaixo para fazer login no sistema.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        password_reset: `Recebemos uma solicitação de recuperação de senha.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        password_change: `Você solicitou a alteração de sua senha.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        critical_action: `Confirme a ação crítica com o código abaixo.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`
      };

      await sendEmail({
        to: user.email,
        subject: subjectMap[type] || 'Código de verificação',
        text: bodyMap[type] || `Código: ${part1}\nVálido até: ${formattedExpiration}`
      });
    }

    return { code, part1, part2, token: twoFaToken };
  } catch (error) {
    throw new Error('Falha ao gerar o código de verificação: ' + error.message);
  }
};

const verifyTwoFaCode = async (email, submittedCode, tokenCode = null, type = 'login') => {
  if (!email || !submittedCode) throw new Error('E-mail e código são obrigatórios');

  // Validação de tipo
  if (!validTypes.includes(type)) {
    throw new Error(`Tipo de verificação inválido. Tipos permitidos: ${validTypes.join(', ')}`);
  }

  // Busca usuário ativo
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ? AND is_active = TRUE', [email]);
  const user = users[0];
  if (!user) throw new Error('Usuário não encontrado ou inativo');

  // Busca o código mais recente pendente do tipo correto
  const [codes] = await queryAsync(
    `SELECT * FROM two_fa_code 
     WHERE user_id = ? AND type = ? AND status = 'pending'
     ORDER BY created_at DESC`,
    [user.id, type]
  );
  const codeCheck = codes[0];
  if (!codeCheck) throw new Error('Código não encontrado ou já utilizado');

  // Verifica expiração ou excesso de tentativas
  const isExpired = new Date(codeCheck.expires_at) < new Date();
  const tooManyAttempts = codeCheck.attempts >= codeCheck.max_attempts;
  if (isExpired || tooManyAttempts) {
    await queryAsync(`UPDATE two_fa_code SET status = 'denied' WHERE id = ?`, [codeCheck.id]);
    throw new Error('Código expirado ou número máximo de tentativas atingido');
  }

  // Verificação com ou sem token
  if (codeCheck.is_double) {
    if (!tokenCode) {
      // Conta como tentativa inválida
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Token de verificação ausente para código duplo');
    }

    let decoded;
    try {
      decoded = jwt.verify(tokenCode, process.env.JWT_SECRET);
      if (decoded.type !== type) {
        await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
        throw new Error('Token inválido para este tipo de verificação');
      }
    } catch (err) {
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Token inválido ou expirado');
    }

    const fullCode = submittedCode + decoded.code;
    const isMatch = await bcrypt.compare(fullCode, codeCheck.code_hash);
    if (!isMatch) {
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Código incorreto');
    }
  } else {
    const isMatch = await bcrypt.compare(submittedCode, codeCheck.code_hash);
    if (!isMatch) {
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Código incorreto');
    }
  }

  // Marca como verificado
  await queryAsync(`UPDATE two_fa_code SET status = 'verified' WHERE id = ?`, [codeCheck.id]);

  return { success: true, user };
};

const funcao = async () => {
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
}

const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email e senha são obrigatórios');
  }

  // Busca o usuário pelo e-mail
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ? AND is_active = TRUE', [email]);
  const user = users[0];

  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  // Será removido em breve... 

  // Busca a senha válida e permanente do usuário
  // const [passwordRows] = await queryAsync(`
  //   SELECT * FROM user_password
  //   WHERE user_id = ? AND is_temp = false AND status = 'valid'
  //   ORDER BY created_at DESC LIMIT 1
  // `, [user.id]);

  // const userPassword = passwordRows[0];
  
  // if (!userPassword || !(await bcrypt.compare(password, userPassword.password_hash))) {
  //   throw new Error('Credenciais inválidas');
  // }

  // if (!user.is_active) {
  //   throw new Error('Usuário inativo, não possui acesso');
  // }

  await verifyPassword(email, password);

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];

  if (!system_role) {
    throw new Error('O usuário não possui papel de sistema atribuído');
  }

  // Geração e envio do código 2FA
  const { part1, token } = await createTwoFaCode(user, 'login', 120);
  const code = part1
  const disable2FA = process.env.SKIP_2FA === 'true';

  const loginToken = jwt.sign(
    { email: user.email, scope: 'verify' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  console.log('Código 2FA gerado:', code);
  console.log('Token de login gerado:', loginToken);
  console.log('Token 2FA gerado:', token);

  return {
    login_token: loginToken,
    ...(token ? { twofa_login_token: token } : {}),
    ...(disable2FA ? { code } : {})
  };
};

const finalizeLogin = async (email, submittedCode, tokenCode = null, type = 'login') => {
  const verification = await verifyTwoFaCode(email, submittedCode, tokenCode, type);

  if (!verification.success || !verification.user) {
    throw new Error('Verificação falhou');
  }

  const user = verification.user;

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
  pruneOldTwoFaCodes,
  createTwoFaCode,
  verifyTwoFaCode,
  login,
  finalizeLogin,
};
