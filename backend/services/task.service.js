const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

// const allowedStatus = ['Não iniciada', 'Em andamento', 'Concluída', 'Cancelada'];

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM task", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findByFilters = (where, values) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM task ${where}`, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM task WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = async ({ activity_id, user_id, title, description, time_spent_minutes, cost }) => {
  try {

    // Validações básicas obrigatórias
    if (!activity_id || !title) {
      throw new Error("É necessário fornecer id da atividade e título.");
    }

    // Verifica se a atividade existe
    const [activityExists] = await queryAsync("SELECT id FROM activity WHERE id = ?", [activity_id]);
    if (activityExists.length === 0) {
      throw new Error(`Atividade não encontrada, id: ${activity_id}`);
    }

    // Verifica se o usuário criador existe (se informado)
    if (user_id !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [user_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${user_id}`);
      }
    }

    // Valida o tempo gasto em minutos
    if (time_spent_minutes !== undefined) {
      if (isNaN(time_spent_minutes)) {
        throw new Error("O valor de tempo gasto em minutos deve ser um número válido.");
      }

      const minutes = parseInt(time_spent_minutes);
      if (minutes < 0) {
        throw new Error("O valor de tempo gasto em minutos não pode ser negativo.");
      }
    }

    // Valida o custo
    if (cost !== undefined) {
      if (isNaN(cost)) {
        throw new Error("O valor de custo deve ser um número válido.");
      }

      const price = parseFloat(cost);
      if (price < 0) {
        throw new Error("O valor de custo não pode ser negativo.");
      }
    }

    // Monta dinamicamente os campos a serem inseridos
    const id = uuidv4();
    const fields = ["id", "activity_id", "title"];
    const values = [id, activity_id, title];
    const placeholders = ["?", "?", "?"];
    
    if (user_id !== undefined) {
      fields.push("user_id");
      values.push(user_id);
      placeholders.push("?");
    }

    if (description !== undefined) {
      fields.push("description");
      values.push(description);
      placeholders.push("?");
    }

    if (time_spent_minutes !== undefined) {
      fields.push("time_spent_minutes");
      values.push(time_spent_minutes);
      placeholders.push("?");
    }

    if (cost !== undefined) {
      fields.push("cost");
      values.push(cost);
      placeholders.push("?");
    }

    const sql = `INSERT INTO task (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
    await queryAsync(sql, values);

    return { id, title };
  } catch (error) {
    throw error;
  }
};

const update = async (id, { activity_id, user_id, title, description, time_spent_minutes, cost }) => {
  try {
    // Verifica se a tarefa existe
    const [taskExists] = await queryAsync("SELECT id FROM activity WHERE id = ?", [id]);
    if (!taskExists) {
      throw new Error("Tarefa não encontrada");
    }

    // Se o activity_id foi informado, verifica se a atividade existe
    if (activity_id !== undefined) {
      const [activityExists] = await queryAsync("SELECT id FROM activity WHERE id = ?", [activity_id]);
      if (activityExists.length === 0) {
        throw new Error(`Atividade não encontrada, id: ${activity_id}`);
      }
    }

    // Se o user_id foi informado, verifica se o usuário existe
    if (user_id !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [user_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${user_id}`);
      }
    }

    // Valida o tempo gasto em minutos
    if (time_spent_minutes !== undefined) {
      if (isNaN(time_spent_minutes)) {
        throw new Error("O valor de tempo gasto em minutos deve ser um número válido.");
      }

      const minutes = parseInt(time_spent_minutes);
      if (minutes < 0) {
        throw new Error("O valor de tempo gasto em minutos não pode ser negativo.");
      }
    }

    // Valida o custo
    if (cost !== undefined) {
      if (isNaN(cost)) {
        throw new Error("O valor de custo deve ser um número válido.");
      }

      const price = parseFloat(cost);
      if (price < 0) {
        throw new Error("O valor de custo não pode ser negativo.");
      }
    }

    // Monta dinamicamente os campos para o UPDATE
    const fields = [];
    const values = [];

    if (activity_id !== undefined) {
      fields.push("activity_id = ?");
      values.push(activity_id);
    }

    if (user_id !== undefined) {
      fields.push("user_id = ?");
      values.push(user_id);
    }

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(title);
    }

    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if (time_spent_minutes !== undefined) {
      fields.push("time_spent_minutes = ?");
      values.push(time_spent_minutes);
    }

    if (cost !== undefined) {
      fields.push("cost = ?");
      values.push(cost);
    }

    if (fields.length === 0) {
      throw new Error("Nenhum campo válido foi enviado para atualização.");
    }

    const sql = `UPDATE task SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    const result = await queryAsync(sql, values);

    return { id, updated: result[0].affectedRows > 0};
  } catch (error) {
    throw error;
  }
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM task WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const findDocumentsByTaskId = (taskId) => {
  const sql = `
    SELECT d.id, d.name, d.mime_type, d.is_active, d.created_at, d.updated_at, d.deleted_at
    FROM document d
    INNER JOIN task_document td ON td.document_id = d.id
    WHERE td.task_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [taskId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addDocumentToTask = async (taskId, documentId) => {
  try {
    // Verifica se a tarefa existe
    const [task] = await queryAsync("SELECT id FROM task WHERE id = ?", [taskId]);
    if (task.length === 0) {
      throw new Error("Tarefa não encontrada.");
    }

    // Verifica se o documento existe
    const [document] = await queryAsync("SELECT id FROM document WHERE id = ?", [documentId]);
    if (document.length === 0) {
      throw new Error("Documento não encontrado.");
    }

    // Verifica se o vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM task_document WHERE task_id = ? AND document_id = ?",
      [taskId, documentId]
    );
    if (exists.length > 0) {
      throw new Error("Este documento já está vinculado à tarefa.");
    }
    
    // Insere vínculo
    await queryAsync(
      "INSERT INTO task_document (task_id, document_id) VALUES (?, ?)",
      [taskId, documentId]
    );

    return { message: "Documento vinculado com sucesso à tarefa." };
  } catch (error) {
    throw error;
  }
};

const removeDocumentFromTask = async (taskId, documentId) => {
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
      "SELECT * FROM task_document WHERE task_id = ? AND document_id = ?",
      [taskId, documentId]
    );

    if (exists.length === 0) {
      throw new Error("Vínculo entre tarefa e documento não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM task_document WHERE task_id = ? AND document_id = ?",
      [taskId, documentId]
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
  findDocumentsByTaskId,
  addDocumentToTask,
  removeDocumentFromTask,
};
