const projectService = require("../services/project.service");
const activityService = require("../services/activity.service");
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

const getFundingAgenciesByProjectId = async (req, res) => {
  try {
    const projectId = req.params.id;
    const agencies = await projectService.findFundingAgenciesByProjectId(projectId);
    res.json(agencies);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agências do projeto", details: err.message });
  }
};

const linkFundingAgencyToProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { agency_id } = req.body;

    if (!agency_id) {
      return res.status(400).json({ error: "O campo 'agency_id' é obrigatório." });
    }

    const result = await projectService.addFundingAgencyToProject(projectId, agency_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular agência ao projeto", details: err.message });
  }
};

const unlinkFundingAgencyFromProject = async (req, res) => {
  try {
    const { projectId, agencyId } = req.params;

    const result = await projectService.removeFundingAgencyFromProject(projectId, agencyId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover vínculo entre projeto e agência", details: err.message });
  }
};

const getAvailableFundingAgenciesForProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const agencies = await projectService.findAvailableFundingAgenciesForProject(projectId);
    res.json(agencies);
  } catch (err) {
    res.status(400).json({ error: "Erro ao buscar agências disponíveis", details: err.message });
  }
};

const getInstitutionsByProjectId = async (req, res) => {
  try {
    const projectId = req.params.id;
    const institutions = await projectService.findInstitutionsByProjectId(projectId);
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar instituições do projeto", details: err.message });
  }
};

const linkInstitutionToProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { institution_id } = req.body;

    if (!institution_id) {
      return res.status(400).json({ error: "O campo 'institution_id' é obrigatório." });
    }

    const result = await projectService.addInstitutionToProject(projectId, institution_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular instituição ao projeto", details: err.message });
  }
};

const unlinkInstitutionFromProject = async (req, res) => {
  try {
    const { projectId, institutionId } = req.params;

    const result = await projectService.removeInstitutionFromProject(projectId, institutionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover vínculo entre projeto e instituição", details: err.message });
  }
};

const getAvailableInstitutionsForProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const institutions = await projectService.findAvailableInstitutionsForProject(projectId);
    res.json(institutions);
  } catch (err) {
    res.status(400).json({ error: "Erro ao buscar instituições disponíveis", details: err.message });
  }
};

const getTeamsByProjectId = async (req, res) => {
  try {
    const projectId = req.params.id;
    const teams = await projectService.findTeamsByProjectId(projectId);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar times do projeto", details: err.message });
  }
};

const linkTeamToProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { team_id } = req.body;

    if (!team_id) {
      return res.status(400).json({ error: "O campo 'team_id' é obrigatório." });
    }

    const result = await projectService.addTeamToProject(projectId, team_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular time ao projeto", details: err.message });
  }
};

const unlinkTeamFromProject = async (req, res) => {
  try {
    const { projectId, teamId } = req.params;

    const result = await projectService.removeTeamFromProject(projectId, teamId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover vínculo entre projeto e time", details: err.message });
  }
};

const getAvailableTeamsForProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const teams = await projectService.findAvailableTeamsForProject(projectId);
    res.json(teams);
  } catch (err) {
    res.status(400).json({ error: "Erro ao buscar times disponíveis", details: err.message });
  }
};

const getDocumentsByProjectId = async (req, res) => {
  try {
    const projectId = req.params.id;
    const documents = await projectService.findDocumentsByProjectId(projectId);
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documentos do projeto", details: err.message });
  }
};

const linkDocumentToProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: "O campo 'document_id' é obrigatório." });
    }

    const result = await projectService.addDocumentToProject(projectId, document_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular documento ao projeto", details: err.message });
  }
};

const unlinkDocumentFromProject = async (req, res) => {
  try {
    const { projectId, documentId } = req.params;

    const result = await projectService.removeDocumentFromProject(projectId, documentId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover documento do projeto", details: err.message });
  }
};

const getActivitiesByProjectId = async (req, res) => {
  try {
    const projectId = req.params.id;
    const activities = await projectService.findActivitiesByProjectId(projectId);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar atividades do projeto", details: err.message });
  }
};

const createActivityForProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const payload = { ...req.body, project_id: projectId };

    const result = await activityService.create(payload);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao criar atividade para o projeto", details: err.message });
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
  getFundingAgenciesByProjectId,
  linkFundingAgencyToProject,
  unlinkFundingAgencyFromProject,
  getAvailableFundingAgenciesForProject,
  getInstitutionsByProjectId,
  linkInstitutionToProject,
  unlinkInstitutionFromProject,
  getAvailableInstitutionsForProject,
  getTeamsByProjectId,
  linkTeamToProject,
  unlinkTeamFromProject,
  getAvailableTeamsForProject,
  getDocumentsByProjectId,
  linkDocumentToProject,
  unlinkDocumentFromProject,
  getActivitiesByProjectId,
  createActivityForProject,
};
