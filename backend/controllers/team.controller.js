const teamService = require("../services/team.service");
const { generateSqlFilters } = require("../utils/generateSqlFilters");

const getAll = async (req, res) => {
  try {
    const teams = await teamService.findAll();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar time" });
  }
};

const getByFilter = async (req, res) => {
  try {
    const filters = req.query;
    const { where, values } = generateSqlFilters(filters);

    const projects = await teamService.findByFilters(where, values);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projetos" })
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const team = await teamService.findById(id);
    if (!team) return res.status(404).json({ message: "Time não encontrado" });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar time" });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });

    const result = await teamService.create({ name, description });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar time" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, description, is_active } = req.body;

  try {
    const result = await teamService.update(id, { name, description, is_active });
    res.status(200).json({ message: "Time atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await teamService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar time" });
  }
};

const getUsersByTeamId = async (req, res) => {
  try {
    const teamId = req.params.id;
    const users = await teamService.findUsersByTeamId(teamId);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuários do time", details: err.message });
  }
};

const getAvailableUsersForTeam = async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const users = await teamService.findAvailableUsersForTeam(teamId);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuários disponíveis", details: err.message });
  }
};

const linkUserToTeam = async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "O campo 'user_id' é obrigatório." });
    }

    const result = await teamService.addUserToTeam(teamId, user_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao vincular usuário ao time", details: err.message });
  }
};

const unlinkUserFromTeam = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const result = await teamService.removeUserFromTeam(teamId, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover vínculo entre usuário e time", details: err.message });
  }
};

module.exports = {
  getAll,
  getByFilter,
  getById,
  create,
  update,
  remove,
  getUsersByTeamId,
  getAvailableUsersForTeam,
  linkUserToTeam,
  unlinkUserFromTeam,
};
