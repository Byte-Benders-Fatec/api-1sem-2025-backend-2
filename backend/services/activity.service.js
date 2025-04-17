const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const allowedStatus = ['Não iniciada', 'Em andamento', 'Concluída', 'Cancelada'];

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM activity", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findByFilters = (where, values) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM activity ${where}`, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM activity WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = async ({ project_id, name, description, status, allocated_budget, start_date, end_date, created_by }) => {
  try {

    // Validações básicas obrigatórias
    if (!project_id || !name || !start_date || !end_date) {
      throw new Error("É necessário fornecer id do projeto, nome, data de início e data de término.");
    }

    // Verifica se o projeto existe
    const [projectExists] = await queryAsync("SELECT id FROM project WHERE id = ?", [project_id]);
    if (projectExists.length === 0) {
      throw new Error(`Projeto não encontrado, id: ${project_id}`);
    }

    // Verifica se o usuário criador existe (se informado)
    if (created_by !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [created_by]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${created_by}`);
      }
    }

    // Valida se as datas são válidas e coerentes
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Datas inválidas fornecidas.");
    }

    if (start > end) {
      throw new Error("A data de início não pode ser posterior à data de término.");
    }

    // Valida status permitido
    if (status !== undefined && !allowedStatus.includes(status)) {
      throw new Error(`Status inválido: '${status}'. Os valores permitidos são: ${allowedStatus.join(", ")}`);
    }

    // Valida allocated_budget
    if (allocated_budget !== undefined) {
      if (isNaN(allocated_budget)) {
        throw new Error("O valor de orçamento alocado deve ser um número válido.");
      }

      const budget = parseFloat(allocated_budget);
      if (budget < 0) {
        throw new Error("O valor de orçamento alocado não pode ser negativo.");
      }
    }

    // Monta dinamicamente os campos a serem inseridos
    const id = uuidv4();
    const is_active = true;
    const fields = ["id", "project_id", "name", "start_date", "end_date", "is_active"];
    const values = [id, project_id, name, start_date, end_date, is_active];
    const placeholders = ["?", "?", "?", "?", "?", "?"];
    
    if (description !== undefined) {
      fields.push("description");
      values.push(description);
      placeholders.push("?");
    }

    if (status !== undefined) {
      fields.push("status");
      values.push(status);
      placeholders.push("?");
    }

    if (allocated_budget !== undefined) {
      fields.push("allocated_budget");
      values.push(allocated_budget);
      placeholders.push("?");
    }

    if (created_by !== undefined) {
      fields.push("created_by");
      values.push(created_by);
      placeholders.push("?");
    }

    const sql = `INSERT INTO activity (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
    await queryAsync(sql, values);

    return { id, name };
  } catch (error) {
    throw error;
  }
};

const update = async (id, { project_id, name, description, status, allocated_budget, start_date, end_date, created_by, is_active }) => {
  try {
    // Verifica se a atividade existe
    const [activityExists] = await queryAsync("SELECT id, start_date, end_date FROM activity WHERE id = ?", [id]);
    if (!activityExists) {
      throw new Error("Atividade não encontrada");
    }

    // Se o project_id foi informado, verifica se o projeto existe
    if (project_id !== undefined) {
      const [projectExists] = await queryAsync("SELECT id FROM project WHERE id = ?", [project_id]);
      if (projectExists.length === 0) {
        throw new Error(`Projeto não encontrado, id: ${project_id}`);
      }
    }

    // Se o created_by foi informado, verifica se o usuário existe
    if (created_by !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [created_by]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${created_by}`);
      }
    }

    // Valida status permitido
    if (status !== undefined && !allowedStatus.includes(status)) {
      throw new Error(`Status inválido: '${status}'. Os valores permitidos são: ${allowedStatus.join(", ")}`);
    }

    // Valida orçamento alocado
    if (allocated_budget !== undefined) {
      if (isNaN(allocated_budget)) {
        throw new Error("O valor de orçamento alocado deve ser um número válido.");
      }

      const budget = parseFloat(allocated_budget);
      if (budget < 0) {
        throw new Error("O valor de orçamento alocado não pode ser negativo.");
      }
    }

    // Validação de datas mesmo se apenas uma for enviada
    let start = start_date ? new Date(start_date) : null;
    let end = end_date ? new Date(end_date) : null;

    if (start || end) {
      if (!start) start = activityExists[0].start_date;
      if (!end) end = activityExists[0].end_date;

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Datas inválidas fornecidas.");
      }

      if (start > end) {
        throw new Error("A data de início não pode ser posterior à data de término.");
      }
    }

    // Monta dinamicamente os campos para o UPDATE
    const fields = [];
    const values = [];

    if (project_id !== undefined) {
      fields.push("project_id = ?");
      values.push(project_id);
    }

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    if (allocated_budget !== undefined) {
      fields.push("allocated_budget = ?");
      values.push(allocated_budget);
    }

    if (start_date !== undefined) {
      fields.push("start_date = ?");
      values.push(start_date);
    }

    if (end_date !== undefined) {
      fields.push("end_date = ?");
      values.push(end_date);
    }

    if (created_by !== undefined) {
      fields.push("created_by = ?");
      values.push(created_by);
    }

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active);
    }

    if (fields.length === 0) {
      throw new Error("Nenhum campo válido foi enviado para atualização.");
    }

    const sql = `UPDATE activity SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    const result = await queryAsync(sql, values);

    return { id, updated: result[0].affectedRows > 0 };
  } catch (error) {
    throw error;
  }
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM activity WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const findTasksByActivityId = (activityId) => {
  const sql = `
    SELECT * FROM task
    WHERE activity_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [activityId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findDocumentsByActivityId = (activityId) => {
  const sql = `
    SELECT d.id, d.name, d.mime_type, d.is_active, d.created_at, d.updated_at, d.deleted_at
    FROM document d
    INNER JOIN activity_document ad ON ad.document_id = d.id
    WHERE ad.activity_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [activityId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addDocumentToActivity = async (activityId, documentId) => {
  try {
    // Verifica se a atividade existe
    const [activity] = await queryAsync("SELECT id FROM activity WHERE id = ?", [activityId]);
    if (activity.length === 0) {
      throw new Error("Atividade não encontrada.");
    }

    // Verifica se o documento existe
    const [document] = await queryAsync("SELECT id FROM document WHERE id = ?", [documentId]);
    if (document.length === 0) {
      throw new Error("Documento não encontrado.");
    }

    // Verifica se o vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM activity_document WHERE activity_id = ? AND document_id = ?",
      [activityId, documentId]
    );
    if (exists.length > 0) {
      throw new Error("Este documento já está vinculado à atividade.");
    }

    // Insere vínculo
    await queryAsync(
      "INSERT INTO activity_document (activity_id, document_id) VALUES (?, ?)",
      [activityId, documentId]
    );

    return { message: "Documento vinculado com sucesso à atividade." };
  } catch (error) {
    throw error;
  }
};

const removeDocumentFromActivity = async (activityId, documentId) => {
  try {
    // Verifica se o documento existe
    const [docResult] = await queryAsync(
      "SELECT * FROM document WHERE id = ?",
      [documentId]
    );
    if (docResult.length === 0) {
      throw new Error("Documento não encontrado.");
    }

    // Verifica se o vínculo existe
    const [exists] = await queryAsync(
      "SELECT * FROM activity_document WHERE activity_id = ? AND document_id = ?",
      [activityId, documentId]
    );

    if (exists.length === 0) {
      throw new Error("Vínculo entre atividade e documento não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM activity_document WHERE activity_id = ? AND document_id = ?",
      [activityId, documentId]
    );
    
    // Remove o documento em si
    await queryAsync("DELETE FROM document WHERE id = ?", [documentId]);

    return { message: "Documento removido com sucesso." };
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
  findTasksByActivityId,
  findDocumentsByActivityId,
  addDocumentToActivity,
  removeDocumentFromActivity,
};
