const authService = require('../services/auth.service');

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
    const { email, code } = req.body;

    if (email !== req.userEmail) {
      return res.status(403).json({
        error: "Erro ao verificar o código", details: 'O e-mail fornecido não corresponde ao token' 
      });
    }

    try {
      const result = await authService.verifyTwoFaCode(email, code);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao verificar o código", details: err.message
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
