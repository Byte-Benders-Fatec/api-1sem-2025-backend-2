const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { queryAsync } = require('../configs/db');
const { sendEmail } = require('../utils/sendEmail');

const validStatuses = ['valid', 'expired', 'blocked'];

const validatePassword = (password) => {
    const errors = [];

    if (!password || typeof password !== 'string') {
        throw new Error("A senha fornecida é inválida.");
    }

    if (password.length < 8) {
        errors.push("A senha deve ter no mínimo 8 caracteres.");
    }

    if (password.length > 64) {
        errors.push("A senha deve ter no máximo 64 caracteres.");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("A senha deve conter ao menos uma letra minúscula.");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("A senha deve conter ao menos uma letra maiúscula.");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("A senha deve conter ao menos um número.");
    }

    if (!/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push("A senha deve conter ao menos um caractere especial.");
    }

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }

    return true;
};

const verifyPassword = async (email, inputPassword) => {
    
    // Configurações de bloqueio
    const configs = {
        times: {
          0 : 1, // 15
          1 : 5, // 30
          2 : 10, // 60
          3 : 15 // 360
        },
        max_attempts: {
          0: 10,
          1: 5,
          2: 2,
          3: 1
        }
    }

    // Verifica se o usuário existe
    const [userCheck] = await queryAsync('SELECT id, name, email FROM user WHERE email = ?', [email]);
    const user = userCheck[0];
    if (!user) throw new Error("Usuário não encontrado.");
    const userId = user.id;
  
    // Busca a senha permanente atual com status válido
    const [pwRows] = await queryAsync(
      `SELECT id, password_hash, attempts, max_attempts, locked_until, lockout_level
       FROM user_password
       WHERE user_id = ? AND is_temp = false AND status = 'valid'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
  
    const current = pwRows[0];
    if (!current) throw new Error("Senha atual não encontrada.");
  
    const now = new Date();
    const lockedUntil = current.locked_until ? current.locked_until : null;
  
    // Caso esteja bloqueada, mas já tenha expirado: resetar
    if (lockedUntil && lockedUntil < now) {
      await queryAsync(
        `UPDATE user_password
         SET locked_until = NULL
         WHERE id = ?`,
        [current.id]
      );
    }
  
    // Se ainda está bloqueada
    if (lockedUntil && lockedUntil >= now) {
      throw new Error(`Senha bloqueada até ${lockedUntil.toLocaleString('pt-BR')}`);
    }
  
    // Verifica se senha é correta
    const match = await bcrypt.compare(inputPassword, current.password_hash);
    if (!match) {
      const newAttempts = current.attempts + 1;
  
      // Se excedeu limite: bloquear
      if (newAttempts >= current.max_attempts) {

        const lockoutTime = configs.times[current.lockout_level];
        const blockUntil = new Date(now.getTime() + lockoutTime * 60 * 1000);
        const newLockoutLevel = current.lockout_level + 1 > 3 ? 3 : current.lockout_level + 1;
        const newMaxAttempts = configs.max_attempts[newLockoutLevel];

        await queryAsync(
          `UPDATE user_password SET attempts = ?, max_attempts = ?, locked_until = ?, lockout_level = ? WHERE id = ?`,
          [0, newMaxAttempts, blockUntil, newLockoutLevel, current.id]
        );
  
        // Envia e-mail de notificação
        await sendEmail({
          to: user.email,
          subject: 'Senha bloqueada temporariamente',
          text: `Detectamos ${current.max_attempts} tentativa(s) incorreta(s) de senha. Seu acesso está bloqueado por ${lockoutTime} minutos, até ${blockUntil.toLocaleString('pt-BR')}.`
        });
  
        throw new Error("Senha bloqueada por tentativas inválidas. Verifique seu e-mail.");
      }
  
      // Apenas incrementa tentativa
      await queryAsync(
        `UPDATE user_password SET attempts = ? WHERE id = ?`,
        [newAttempts, current.id]
      );
  
      throw new Error("Senha atual incorreta.");
    }
  
    // Senha correta: resetar tentativas e desbloqueio
    await queryAsync(
      `UPDATE user_password
       SET attempts = 0, max_attempts = ?, locked_until = NULL, lockout_level = 0
       WHERE id = ?`,
      [configs.max_attempts[0], current.id]
    );
  
    return true;
};

const setPassword = async (email, newPassword, currentPassword = null) => {
  try {

    // Verifica se o usuário existe
    const [userCheck] = await queryAsync('SELECT id, name, email FROM user WHERE email = ?', [email]);
    const user = userCheck[0];
    if (!user) throw new Error("Usuário não encontrado.");
    const userId = user.id;

    // Verifica se a nova senha é válida
    validatePassword(newPassword);

    // Se a senha atual for fornecida, verifica se está correta
    if (currentPassword) {
        await verifyPassword(email, currentPassword);
    }
    
    // Verifica se a nova senha já foi usada
    const [previousPasswords] = await queryAsync(
        `SELECT password_hash FROM user_password
        WHERE user_id = ? AND is_temp = false`,
        [userId]
    );

    for (const row of previousPasswords) {
        const reused = await bcrypt.compare(newPassword, row.password_hash);
        if (reused) {
        throw new Error('Esta senha já foi usada anteriormente. Escolha outra.');
        }
    }

    // Bloqueia senhas anteriores
    await queryAsync(
        `UPDATE user_password
        SET status = 'blocked'
        WHERE user_id = ? AND is_temp = false`,
        [userId]
    );

    // Insere nova senha como válida
    const id = uuidv4();
    const hash = await bcrypt.hash(newPassword, 10);
    await queryAsync(
        `INSERT INTO user_password (
          id, user_id, password_hash, is_temp, attempts, max_attempts, locked_until,
          status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          hash,
          false,       // is_temp
          0,           // attempts
          10,          // max_attempts
          null,        // locked_until
          'valid',     // status
          null,        // expires_at
        ]
    );
      
    // Remove senhas antigas (mantém no máximo 5)
    const [all] = await queryAsync(
        `SELECT id FROM user_password
        WHERE user_id = ? AND is_temp = false
        ORDER BY created_at DESC`,
        [userId]
    );

    if (all.length > 5) {
        const toDelete = all.slice(5).map(row => row.id);
        const placeholders = toDelete.map(() => '?').join(', ');
        await queryAsync(
        `DELETE FROM user_password WHERE id IN (${placeholders})`,
        toDelete
        );
    }

    return { message: 'Senha atualizada com sucesso.' };
  } catch (error) {
    throw error;
  }
};
  
module.exports = {
    validatePassword,
    verifyPassword,
    setPassword,
};
