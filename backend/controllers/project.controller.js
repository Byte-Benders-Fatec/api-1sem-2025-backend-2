const projectService = require("../services/project.service");

const getAll = async (req, res) => {
  try {
    const projects = await projectService.findAll();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projeto" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const project = await projectService.findById(id);
    if (!project) return res.status(404).json({ message: "Projeto não encontrado" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projeto" });
  }
};

const create = async (req, res) => {
  try {
    const { name, code, description, status, start_date, end_date, budget, funding_agency_id, created_by_id } = req.body;

    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!code) return res.status(400).json({ error: "O código é obrigatório" });
    if (!start_date) return res.status(400).json({ error: "A data de início é obrigatória" });
    if (!end_date) return res.status(400).json({ error: "A data de término é obrigatória" });

    const result = await projectService.create({ name, code, description, status, start_date, end_date, budget, funding_agency_id, created_by_id });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar projeto", details: err.message });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, code, description, status, start_date, end_date, budget, funding_agency_id, created_by_id } = req.body;

  try {
    const result = await projectService.update(id, { name, code, description, status, start_date, end_date, budget, funding_agency_id, created_by_id });
    res.status(200).json({ message: "Projeto atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await projectService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar projeto" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
