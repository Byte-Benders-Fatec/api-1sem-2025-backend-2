const activityService = require("../services/activity.service");
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
    const { project_id, name, description, status, allocated_budget, start_date, end_date, created_by } = req.body;

    if (!project_id) return res.status(400).json({ error: "O id do projeto é obrigatório" });
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!start_date) return res.status(400).json({ error: "A data de início é obrigatória" });
    if (!end_date) return res.status(400).json({ error: "A data de término é obrigatória" });

    const result = await activityService.create({ project_id, name, description, status, allocated_budget, start_date, end_date, created_by });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar atividade" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { project_id, name, description, status, allocated_budget, start_date, end_date, created_by, is_active } = req.body;

  try {
    const result = await activityService.update(id, { project_id, name, description, status, allocated_budget, start_date, end_date, created_by, is_active });
    res.status(200).json({ message: "Atividade atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

module.exports = {
  getAll,
  getByFilter,
  getById,
  create,
  update,
  remove,
};
