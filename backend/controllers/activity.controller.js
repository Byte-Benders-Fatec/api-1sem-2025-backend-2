const activityService = require("../services/activity.service");
const documentService = require("../services/document.service");
const taskService = require("../services/task.service");
const { generateSqlFilters } = require("../utils/generateSqlFilters");

const getAll = async (req, res) => {
  try {
    const activities = await activityService.findAll();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar atividade" });
  }
};

const getByFilter = async (req, res) => {
  try {
    const filters = req.query;
    const { where, values } = generateSqlFilters(filters);

    const projects = await activityService.findByFilters(where, values);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projetos" })
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const activity = await activityService.findById(id);
    if (!activity) return res.status(404).json({ message: "Atividade não encontrada" });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar atividade" });
  }
};

const create = async (req, res) => {
  try {
    const { project_id, name, description, status, allocated_budget, start_date, end_date, created_by_id, responsible_user_id } = req.body;

    if (!project_id) return res.status(400).json({ error: "O id do projeto é obrigatório" });
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!start_date) return res.status(400).json({ error: "A data de início é obrigatória" });
    if (!end_date) return res.status(400).json({ error: "A data de término é obrigatória" });

    const result = await activityService.create({ project_id, name, description, status, allocated_budget, start_date, end_date, created_by_id, responsible_user_id });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar atividade", details: err.message });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { project_id, name, description, status, allocated_budget, start_date, end_date, created_by_id, responsible_user_id } = req.body;

  try {
    const result = await activityService.update(id, { project_id, name, description, status, allocated_budget, start_date, end_date, created_by_id, responsible_user_id });
    res.status(200).json({ message: "Atividade atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: "Erro ao atualizar atividade", details: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await activityService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar atividade" });
  }
};

const getTasksByActivityId = async (req, res) => {
  try {
    const activityId = req.params.id;
    const tasks = await activityService.findTasksByActivityId(activityId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tarefas da atividade", details: err.message });
  }
};

const createTaskForActivity = async (req, res) => {
  try {
    const { id: activityId } = req.params;
    const payload = { ...req.body, activity_id: activityId };

    const result = await taskService.create(payload);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao criar tarefa para a atividade", details: err.message });
  }
};

const getDocumentsByActivityId = async (req, res) => {
  try {
    const activityId = req.params.id;
    const docs = await activityService.findDocumentsByActivityId(activityId);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documentos da atividade", details: err.message });
  }
};

const linkDocumentToActivity = async (req, res) => {
  try {
    const { id: activityId } = req.params;
    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: "O campo 'document_id' é obrigatório." });
    }

    const result = await activityService.addDocumentToActivity(activityId, document_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular documento à atividade", details: err.message });
  }
};

const unlinkDocumentFromActivity = async (req, res) => {
  try {
    const { activityId, documentId } = req.params;
    const result = await activityService.removeDocumentFromActivity(activityId, documentId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover documento da atividade", details: err.message });
  }
};

const uploadAndLinkDocumentToActivity = async (req, res) => {
  try {
    const { id: activityId } = req.params;
    const { originalname, mimetype, buffer } = req.file;

    if (!originalname || !mimetype || !buffer) {
      return res.status(400).json({ error: "Nome, tipo e conteúdo do arquivo são obrigatórios." });
    }

    // Cria o documento
    const document = await documentService.create({
      name: originalname,
      mime_type: mimetype,
      content: buffer,
    });

    // Cria o vínculo com a atividade
    const result = await activityService.addDocumentToActivity(activityId, document.id);

    res.status(201).json({
      message: "Documento criado e vinculado à atividade com sucesso.",
      documentId: document.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar e vincular documento.", details: err.message });
  }
};

const getUsersByActivityId = async (req, res) => {
  try {
    const activityId = req.params.id;
    const users = await activityService.findUsersByActivityId(activityId);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuários da atividade", details: err.message });
  }
};

const linkUserToActivity = async (req, res) => {
  try {
    const { id: activityId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "O campo 'user_id' é obrigatório." });
    }

    const result = await activityService.addUserToActivity(activityId, user_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular usuário à atividade", details: err.message });
  }
};

const unlinkUserFromActivity = async (req, res) => {
  try {
    const { activityId, userId } = req.params;

    const result = await activityService.removeUserFromActivity(activityId, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover vínculo entre atividade e usuário", details: err.message });
  }
};

const getAvailableUsersForActivity = async (req, res) => {
  try {
    const { id: activityId } = req.params;
    const users = await activityService.findAvailableUsersForActivity(activityId);
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: "Erro ao buscar usuários disponíveis", details: err.message });
  }
};

module.exports = {
  getAll,
  getByFilter,
  getById,
  create,
  update,
  remove,
  getTasksByActivityId,
  createTaskForActivity,
  getDocumentsByActivityId,
  linkDocumentToActivity,
  unlinkDocumentFromActivity,
  uploadAndLinkDocumentToActivity,
  getUsersByActivityId,
  linkUserToActivity,
  unlinkUserFromActivity,
  getAvailableUsersForActivity,
};
