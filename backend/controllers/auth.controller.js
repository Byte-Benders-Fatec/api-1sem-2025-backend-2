const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { queryAsync } = require("../configs/db");
const { createTwoFaCode } = require('../services/twoFa.service');
const { sendEmail } = require('../utils/sendEmail');

const AuthController = {
  
  login: async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios' });

        const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
          return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        if (!user.is_active) return res.status(401).json({ message: 'Usuário inativo, não possui acesso' });
        
        const [system_roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
        const system_role = system_roles[0];

        if (!system_role) return res.status(401).json({ message: 'O usuário não possui papel de sistema atribuido' });

         // Gera código aleatório de 6 dígitos
        const { code } = await createTwoFaCode(user.id);

        const disable2FA = process.env.SKIP_2FA === 'true';

        // Envia e-mail (usando nodemailer ou outro)
        if (!disable2FA) {
          await sendEmail({
            to: user.email,
            subject: 'Seu código de acesso',
            text: `Seu código de verificação é: ${code}`
          });
        }

        // Gera token temporário de verificação (login_token)
        const loginToken = jwt.sign(
          { email: user.email, scope: 'verify' },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );

        if(!disable2FA) {
          return res.json({ message: 'Código enviado por e-mail', login_token: loginToken });
        }
        else {
          return res.json({ message: 'Código enviado por e-mail', code: code, login_token: loginToken });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erro interno', details: err.message });
    }
  },

  checkCode: async (req, res) => {
    const { email, code } = req.body;
  
    if (email !== req.userEmail) {
      return res.status(403).json({ message: 'O e-mail fornecido não corresponde ao token' });
    }

    try {
      const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
      const user = users[0];
      if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  
      const [codes] = await queryAsync(
        `
        SELECT * FROM two_fa_code
        WHERE user_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        `,
        [user.id]
      );
      const code_check = codes[0];

      if (!code_check) {
        return res.status(400).json({ message: 'Código não encontrado ou já utilizado' });
      }
  
      const isExpired = new Date(code_check.expires_at) < new Date();
      const tooManyAttempts = code_check.attempts >= code_check.max_attempts;
  
      if (isExpired || tooManyAttempts) {
        await queryAsync(
          `UPDATE two_fa_code SET status = 'denied' WHERE id = ?`,
          [code_check.id]
        );
        return res.status(400).json({ message: 'Código expirado ou número máximo de tentativas atingido' });
      }
  
      const isMatch = await bcrypt.compare(code, code_check.code_hash);
  
      if (!isMatch) {
        await queryAsync(
          `UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`,
          [code_check.id]
        );
        return res.status(400).json({ message: 'Código incorreto' });
      }
  
      await queryAsync(
        `UPDATE two_fa_code SET status = 'verified' WHERE id = ?`,
        [code_check.id]
      );
  
      const [system_roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
      const system_role = system_roles[0];

      if (!system_role) return res.status(401).json({ message: 'O usuário não possui papel de sistema atribuido' });

      const token = jwt.sign(
        { id: user.id, system_role: system_role.name, name: user.name, email: user.email},
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({ token });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao verificar o código', details: error.message });
    }
  },
  
  validate: async (req, res) => {
    res.status(200).json({ valid: true, user: req.user });
  },

  me: async (req, res) => {
    return res.json(req.user);
  }
};

module.exports = AuthController;
