const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");
const { formatDate, getDateOnly } = require("../utils/formatDate");

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

const create = async ({ activity_id, user_id, title, description, time_spent_minutes, cost, date }) => {
  try {
    // Validações básicas obrigatórias
    if (!activity_id || !title) {
      throw new Error("É necessário fornecer id da atividade e título.");
    }

    const taskDate = date ? new Date(date) : new Date();

    if (isNaN(taskDate.getTime())) {
      throw new Error("Data inválida fornecida.");
    }

    // Verifica se a atividade existe e recupera o orçamento e projeto associado
    const [activityExists] = await queryAsync(
      "SELECT id, allocated_budget, project_id FROM activity WHERE id = ?",
      [activity_id]
    );
    if (activityExists.length === 0) {
      throw new Error(`Atividade não encontrada, id: ${activity_id}`);
    }

    const projectId = activityExists[0].project_id;

    // Recupera as datas do projeto
    const [projectExists] = await queryAsync(
      "SELECT id, start_date, end_date FROM project WHERE id = ?",
      [projectId]
    );
    if (projectExists.length === 0) {
      throw new Error(`Projeto não encontrado, id: ${projectId}`);
    }

    // Obtém as datas do projeto
    const projectStart = new Date(projectExists[0].start_date);
    const projectEnd = new Date(projectExists[0].end_date);

    const compTaskDate = getDateOnly(taskDate);
    const compProjectStart = getDateOnly(projectStart);
    const compProjectEnd = getDateOnly(projectEnd);

    if (compTaskDate < compProjectStart || compTaskDate > compProjectEnd) {
      throw new Error(
        `A data da tarefa deve estar dentro do período do projeto: de ${formatDate(projectStart)} até ${formatDate(projectEnd)}.`
      );
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

      // Valida custo total das tarefas na atividade
      const [costResult] = await queryAsync(
        `SELECT SUM(cost) AS total_cost FROM task WHERE activity_id = ?`,
        [activity_id]
      );

      const totalCost = parseFloat(costResult[0].total_cost || 0);
      const newTotal = parseFloat((totalCost + price).toFixed(2));
      const activityBudget = parseFloat(activityExists[0].allocated_budget || 0);

      if (newTotal > activityBudget) {
        throw new Error(`O custo total das tarefas (R$ ${newTotal.toFixed(2)}) ultrapassa o orçamento da atividade (R$ ${activityBudget.toFixed(2)}).`);
      }
    }

    // Monta dinamicamente os campos a serem inseridos
    const id = uuidv4();
    const fields = ["id", "activity_id", "title", "date"];
    const values = [id, activity_id, title, compTaskDate];
    const placeholders = ["?", "?", "?", "?"];

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
    const [taskExists] = await queryAsync("SELECT id, activity_id, cost FROM task WHERE id = ?", [id]);
    if (!taskExists) {
      throw new Error("Tarefa não encontrada");
    }

    const currentActivityId = taskExists[0].activity_id;
    const currentCost = parseFloat(taskExists[0].cost) || 0;
    const effectiveActivityId = activity_id !== undefined ? activity_id : currentActivityId;

    // Verifica se a atividade existe
    const [activityExists] = await queryAsync("SELECT id, allocated_budget FROM activity WHERE id = ?", [effectiveActivityId]);
    if (activityExists.length === 0) {
      throw new Error(`Atividade não encontrada, id: ${effectiveActivityId}`);
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

      // Valida custo total das tarefas na atividade
      const [costResult] = await queryAsync(`
        SELECT SUM(cost) AS total_cost
        FROM task
        WHERE activity_id = ?
          AND id != ?
      `, [effectiveActivityId, id]);

      const totalOtherTasks = parseFloat(costResult[0].total_cost || 0);
      const newTotal = parseFloat((totalOtherTasks + price).toFixed(2));
      const activityBudget = parseFloat(activityExists[0].allocated_budget || 0);

      if (newTotal > activityBudget) {
        throw new Error(`O custo total das tarefas (R$ ${newTotal.toFixed(2)}) ultrapassa o orçamento da atividade (R$ ${activityBudget.toFixed(2)}).`);
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

    return { id, updated: result[0].affectedRows > 0 };
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
