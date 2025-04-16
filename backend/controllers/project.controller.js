const projectService = require("../services/project.service");
const { generateSqlFilters } = require("../utils/generateSqlFilters");

const getAll = async (req, res) => {
  try {
    const projects = await projectService.findAll();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projeto" });
  }
};

const getByFilter = async (req, res) => {
  try {
    const filters = req.query;
    const { where, values } = generateSqlFilters(filters);

    const projects = await projectService.findByFilters(where, values);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projetos" })
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

const getAreasByProjectId = async (req, res) => {
  try {
    const projectId = req.params.id;
    const areas = await projectService.findAreasByProjectId(projectId);
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar áreas do projeto" });
  }
};

const linkAreaToProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { area_id } = req.body;

    if (!area_id) {
      return res.status(400).json({ error: "O campo 'area_id' é obrigatório." });
    }

    const result = await projectService.addAreaToProject(projectId, area_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular área ao projeto",  details: err.message });
  }
};

const unlinkAreaFromProject = async (req, res) => {
  try {
    const { projectId, areaId } = req.params;

    const result = await projectService.removeAreaFromProject(projectId, areaId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover vínculo entre projeto e área", details: err.message });
  }
};

const getAvailableAreasForProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const areas = await projectService.findAvailableAreasForProject(projectId);
    res.json(areas);
  } catch (err) {
    res.status(400).json({ error: "Erro ao buscar áreas disponíveis", details: err.message });
  }
};

module.exports = {
  getAll,
  getById,
  getByFilter,
  create,
  update,
  remove,
  getAreasByProjectId,
  linkAreaToProject,
  unlinkAreaFromProject,
  getAvailableAreasForProject,
};
