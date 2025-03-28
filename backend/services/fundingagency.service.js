const db = require("../db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM funding_agency", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM funding_agency WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = async ({ name, acronym, cnpj, website }) => {
  try {
    if (!name || !acronym || !cnpj) {
      throw new Error("É necessário fornecer nome, sigla e CNPJ.");
    }

    // Verifica duplicidade de name
    const [nameExists] = await queryAsync("SELECT id FROM funding_agency WHERE name = ?", [name]);
    if (nameExists.length > 0) {
      throw new Error(`Já existe uma agência com o nome: ${name}`);
    }

    // Verifica duplicidade de acronym
    const [acronymExists] = await queryAsync("SELECT id FROM funding_agency WHERE acronym = ?", [acronym]);
    if (acronymExists.length > 0) {
      throw new Error(`Já existe uma agência com a sigla: ${acronym}`);
    }

    // Verifica duplicidade de cnpj
    const [cnpjExists] = await queryAsync("SELECT id FROM funding_agency WHERE cnpj = ?", [cnpj]);
    if (cnpjExists.length > 0) {
      throw new Error(`Já existe uma agência com o CNPJ: ${cnpj}`);
    }

    const id = uuidv4();
    const is_active = true;
    const fields = ["id", "name", "acronym", "cnpj", "is_active"];
    const values = [id, name, acronym, cnpj, is_active];
    const placeholders = ["?", "?", "?", "?", "?"];

    if (website !== undefined) {
      fields.push("website");
      values.push(website);
      placeholders.push("?");
    }

    const sql = `INSERT INTO funding_agency (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
    await queryAsync(sql, values);

    return { id, name };
  } catch (error) {
    throw error;
  }
};

// Wrapper para transformar db.query em uma Promise
function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve([results]);
    });
  });
}

const update = async (id, { name, acronym, cnpj, website, is_active }) => {
  try {
    if (name) {
      // Verifica duplicidade de name
      const [nameExists] = await queryAsync("SELECT id FROM funding_agency WHERE name = ? AND id != ?", [name, id]);
      if (nameExists.length > 0) {
        throw new Error(`Já existe uma agência com o nome: ${name}`);
      }
    }

    if (acronym) {
      // Verifica duplicidade de acronym
      const [acronymExists] = await queryAsync("SELECT id FROM funding_agency WHERE acronym = ? AND id != ?", [acronym, id]);
      if (acronymExists.length > 0) {
        throw new Error(`Já existe uma agência com a sigla: ${acronym}`);
      }
    }

    if (cnpj) {
      // Verifica duplicidade de cnpj
      const [cnpjExists] = await queryAsync("SELECT id FROM funding_agency WHERE cnpj = ? AND id != ?", [cnpj, id]);
      if (cnpjExists.length > 0) {
        throw new Error(`Já existe uma agência com o CNPJ: ${cnpj}`);
      }
    }

    // Monta dinamicamente os campos a serem atualizados
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (acronym !== undefined) {
      fields.push("acronym = ?");
      values.push(acronym);
    }

    if (cnpj !== undefined) {
      fields.push("cnpj = ?");
      values.push(cnpj);
    }

    if (website !== undefined) {
      fields.push("website = ?");
      values.push(website);
    }

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active);
    }

    // Garante que ao menos um campo será atualizado
    if (fields.length === 0) {
      throw new Error("Nenhum dado para atualizar.");
    }

    const sql = `UPDATE funding_agency SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    const result = await queryAsync(sql, values);
    return result;
  } catch (error) {
    throw error;
  }
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM funding_agency WHERE id = ?", [id], (err, result) => {
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
