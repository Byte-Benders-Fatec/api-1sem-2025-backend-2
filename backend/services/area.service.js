const db = require("../db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM area", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM area WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, description }) => {
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe uma área com o mesmo nome
    db.query("SELECT id FROM area WHERE name = ?", [name], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe uma área com esse nome."));
      }

      const id = uuidv4();
      const is_active = true;

      // Se não existir, cria uma nova área
      db.query("INSERT INTO area (id, name, description, is_active) VALUES (?, ?, ?, ?)", 
        [id, name, description, is_active], 
        (err, result) => {
          if (err) return reject(err);
          resolve({ id, name });
        }
      );
    });
  });
};

const update = (id, {name, description, is_active}) => {
  return new Promise((resolve, reject) => {
    // Verifica se já existe uma área com o mesmo nome (evita duplicação)
    db.query("SELECT id FROM area WHERE name = ? AND id != ?", [name, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe uma área com esse nome."));

      // Monta dinamicamente os campos a serem atualizados
      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
      }

      if (description !== undefined) {
        fields.push("description = ?");
        values.push(description);
      }

      if (is_active !== undefined) {
        fields.push("is_active = ?");
        values.push(is_active);
      }

      // Garante que ao menos um campo será atualizado
      if (fields.length === 0) {
        return reject(new Error("Nenhum dado para atualizar."));
      }

      const sql = `UPDATE area SET ${fields.join(", ")} WHERE id = ?`;
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
    db.query("DELETE FROM area WHERE id = ?", [id], (err, result) => {
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
