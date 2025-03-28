const db = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM user", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM user WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, email, password_hash }) => {
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe um usuário com o mesmo email
    db.query("SELECT id FROM user WHERE email = ?", [email], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe um usuário com esse e-mail."));
      }

      const id = uuidv4();
      const is_active = true;
      const system_role_id = "3"; // default system role = user (3)

      // Se não existir, cria o novo usuário
      db.query("INSERT INTO user (id, name, email, password_hash, is_active, system_role_id) VALUES (?, ?, ?, ?, ?, ?)", 
        [id, name, email, password_hash, is_active, system_role_id], 
        (err, result) => {
          if (err) return reject(err);
          resolve({ id, name });
        }
      );
    });
  });
};

const update = (id, {name, email, password_hash, is_active, system_role_id}) => {
  return new Promise((resolve, reject) => {
    // Verifica se já existe um usuário com o mesmo email (evita duplicação)
    db.query("SELECT id FROM user WHERE email = ? AND id != ?", [email, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe um usuário com esse e-mail."));

      // Monta dinamicamente os campos a serem atualizados
      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
      }

      if (email !== undefined) {
        fields.push("email = ?");
        values.push(email);
      }

      if (password_hash !== undefined) {
        fields.push("password_hash = ?");
        values.push(password_hash);
      }

      if (is_active !== undefined) {
        fields.push("is_active = ?");
        values.push(is_active);
      }

      if (system_role_id !== undefined) {
        fields.push("system_role_id = ?");
        values.push(system_role_id);
      }

      // Garante que ao menos um campo será atualizado
      if (fields.length === 0) {
        return reject(new Error("Nenhum dado para atualizar."));
      }

      const sql = `UPDATE user SET ${fields.join(", ")} WHERE id = ?`;
      values.push(id);

      // Realiza o update
      db.query(sql, values, (err, result) => {
          if (err) return reject(err);
          resolve(result);
      });
    });
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM user WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
