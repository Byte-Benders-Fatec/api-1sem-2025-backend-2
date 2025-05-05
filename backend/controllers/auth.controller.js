const authService = require('../services/auth.service');
const userPasswordService = require('../services/userPassword.service');

const AuthController = {
  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      const result = await authService.login(email, password);
      return res.status(200).json({
        message: 'Código enviado por e-mail',
        ...result
      });
    } catch (err) {
      return res.status(401).json({
        error: "Erro ao fazer login", details: err.message
      });
    }
  },

  checkCode: async (req, res) => {
    const { email, code, type = 'login' } = req.body;
  
    if (email !== req.userEmail) {
      return res.status(403).json({
        error: "Erro ao verificar o código",
        details: "O e-mail fornecido não corresponde ao token"
      });
    }
  
    try {
      // Identifica dinamicamente o token correto conforme o tipo
      const tokenKey = `twofa_${type}_token`;
      const token = req.body[tokenKey];
  
      const result = await authService.verifyTwoFaCode(email, code, token, type);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao verificar o código",
        details: err.message
      });
    }
  },

  finalizeLogin: async (req, res) => {
    const { email, code, type = 'login' } = req.body;
  
    if (email !== req.userEmail) {
      return res.status(403).json({
        error: "Erro ao finalizar login",
        details: "O e-mail fornecido não corresponde ao token"
      });
    }
  
    try {
      // Identifica dinamicamente o token correto conforme o tipo
      const tokenKey = `twofa_${type}_token`;
      const token = req.body[tokenKey];
  
      const result = await authService.finalizeLogin(email, code, token, type);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao finalizar login",
        details: err.message
      });
    }
  },
  
  resetPassword: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Erro ao solicitar recuperação de senha",
        details: "E-mail é obrigatório"
      });
    }

    try {
      const result = await userPasswordService.resetPassword(email);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({
        error: "Erro ao solicitar recuperação de senha",
        details: err.message
      });
    }
  },

  validate: async (req, res) => {
    return res.status(200).json({ valid: true, user: req.user });
  },

  me: async (req, res) => {
    return res.status(200).json(req.user);
  }  
};

module.exports = AuthController;
