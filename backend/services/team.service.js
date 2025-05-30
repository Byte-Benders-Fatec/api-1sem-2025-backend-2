const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM team", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findByFilters = (where, values) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM team ${where}`, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM team WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, description }) => {
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe um time com o mesmo nome
    db.query("SELECT id FROM team WHERE name = ?", [name], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe um time com esse nome."));
      }

      const id = uuidv4();
      const is_active = true;

      // Se não existir, cria o novo time
      db.query("INSERT INTO team (id, name, description, is_active) VALUES (?, ?, ?, ?)", 
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
    // Verifica se já existe um time com o mesmo nome (evita duplicação)
    db.query("SELECT id FROM team WHERE name = ? AND id != ?", [name, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe um time com esse nome."));

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

      const sql = `UPDATE team SET ${fields.join(", ")} WHERE id = ?`;
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
    db.query("DELETE FROM team WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const findUsersByTeamId = (teamId) => {
  const sql = `
    SELECT u.*
    FROM user u
    INNER JOIN user_team ut ON ut.user_id = u.id
    WHERE ut.team_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [teamId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findAvailableUsersForTeam = async (teamId) => {
  try {
    // Verifica se o time existe
    const [team] = await queryAsync("SELECT id FROM team WHERE id = ?", [teamId]);
    if (team.length === 0) {
      throw new Error("Time não encontrado.");
    }

    // Retorna usuários ativos que ainda não estão vinculados ao time
    const sql = `
      SELECT u.*
      FROM user u
      LEFT JOIN user_team ut ON ut.user_id = u.id AND ut.team_id = ?
      WHERE u.is_active = 1
        AND ut.user_id IS NULL
    `;

    const [result] = await queryAsync(sql, [teamId]);
    return result;
  } catch (error) {
    throw error;
  }
};

const addUserToTeam = async (teamId, userId) => {
  try {
    // Verifica se time existe
    const [team] = await queryAsync("SELECT id FROM team WHERE id = ?", [teamId]);
    if (team.length === 0) { 
      throw new Error("Time não encontrado.");
    }

    // Verifica se usuário existe
    const [user] = await queryAsync("SELECT id FROM user WHERE id = ?", [userId]);
    if (user.length === 0) {
      throw new Error("Usuário não encontrado.");
    }

    // Verifica se vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM user_team WHERE team_id = ? AND user_id = ?",
      [teamId, userId]
    );
    if (exists.length > 0) {
      throw new Error("Usuário já está vinculado ao time.");
    }

    // Insere vínculo
    await queryAsync(
      "INSERT INTO user_team (team_id, user_id) VALUES (?, ?)",
      [teamId, userId]
    );

    return { message: "Usuário vinculado com sucesso ao time." };
  } catch (error) {
    throw error;
  }
};

const removeUserFromTeam = async (teamId, userId) => {
  try {
    // Verifica se o vínculo existe
    const [exists] = await queryAsync(
      "SELECT * FROM user_team WHERE team_id = ? AND user_id = ?",
      [teamId, userId]
    );
    if (exists.length === 0) {
      throw new Error("Vínculo entre usuário e time não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM user_team WHERE team_id = ? AND user_id = ?",
      [teamId, userId]
    );

    return { message: "Usuário removido do time com sucesso." };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  findAll,
  findByFilters,
  findById,
  create,
  update,
  remove,
  findUsersByTeamId,
  findAvailableUsersForTeam,
  addUserToTeam,
  removeUserFromTeam,
};
