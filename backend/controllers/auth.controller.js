const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { queryAsync } = require("../configs/db");

const AuthController = {
  login: async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios' });

        const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
        const user = users[0];

        if (!user) return res.status(401).json({ message: 'Usuário não encontrado' });       
        if (!user.is_active) return res.status(401).json({ message: 'Usuário inativo, não possui acesso' });
        
        const [system_roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
        const system_role = system_roles[0];

        if (!system_role) return res.status(401).json({ message: 'O usuário não possui papel de sistema atribuido' });

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ message: 'Senha incorreta' });

        const token = jwt.sign(
        { id: user.id, system_role: system_role.name, name: user.name, email: user.email},
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
        );

        return res.json({ token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erro interno', details: err.message });
    }
  },

  me: async (req, res) => {
    return res.json(req.user);
  }
};

module.exports = AuthController;
