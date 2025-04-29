const taskService = require("../services/task.service");
const documentService = require("../services/document.service");
const { generateSqlFilters } = require("../utils/generateSqlFilters");

const getAll = async (req, res) => {
  try {
    const tasks = await taskService.findAll();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tarefa" });
  }
};

const getByFilter = async (req, res) => {
  try {
    const filters = req.query;
    const { where, values } = generateSqlFilters(filters);

    const projects = await taskService.findByFilters(where, values);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projetos" })
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const task = await taskService.findById(id);
    if (!task) return res.status(404).json({ message: "Tarefa não encontrada" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tarefa" });
  }
};

const create = async (req, res) => {
  try {
    const { activity_id, user_id, title, description, time_spent_minutes, cost } = req.body;

    if (!activity_id) return res.status(400).json({ error: "O id da atividade é obrigatório" });
    if (!title) return res.status(400).json({ error: "O título é obrigatório" });

    const result = await taskService.create({ activity_id, user_id, title, description, time_spent_minutes, cost });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar tarefa", details: err.message });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { activity_id, user_id, title, description, time_spent_minutes, cost } = req.body;

  try {
    const result = await taskService.update(id, { activity_id, user_id, title, description, time_spent_minutes, cost });
    res.status(200).json({ message: "Tarefa atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: "Erro ao atualizar tarefa", details: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await taskService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar tarefa" });
  }
};

const getDocumentsByTaskId = async (req, res) => {
  try {
    const taskId = req.params.id;
    const docs = await taskService.findDocumentsByTaskId(taskId);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documentos da tarefa", details: err.message });
  }
};

const linkDocumentToTask = async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: "O campo 'document_id' é obrigatório." });
    }

    const result = await taskService.addDocumentToTask(taskId, document_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular documento à tarefa", details: err.message });
  }
};

const unlinkDocumentFromTask = async (req, res) => {
  try {
    const { taskId, documentId } = req.params;
    const result = await taskService.removeDocumentFromTask(taskId, documentId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover documento da tarefa", details: err.message });
  }
};

const uploadAndLinkDocumentToTask = async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { originalname, mimetype, buffer } = req.file;

    if (!originalname || !mimetype || !buffer) {
      return res.status(400).json({ error: "Nome, tipo e conteúdo do arquivo são obrigatórios." });
    }

    // Primeiro: cria o documento
    const document = await documentService.create({
      name: originalname,
      mime_type: mimetype,
      content: buffer,
    });

    // Depois: cria o vínculo com a tarefa
    const result = await taskService.addDocumentToTask(taskId, document.id);

    res.status(201).json({
      message: "Documento criado e vinculado à tarefa com sucesso.",
      documentId: document.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar e vincular documento.", details: err.message });
  }
};

module.exports = {
  getAll,
  getByFilter,
  getById,
  create,
  update,
  remove,
  getDocumentsByTaskId,
  linkDocumentToTask,
  unlinkDocumentFromTask,
  uploadAndLinkDocumentToTask,
};
