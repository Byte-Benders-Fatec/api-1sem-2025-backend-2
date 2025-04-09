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

module.exports = {
  getAll,
  getByFilter,
  getById,
  create,
  update,
  remove,
};
