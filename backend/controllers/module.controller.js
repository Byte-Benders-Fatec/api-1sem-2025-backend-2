const moduleService = require("../services/module.service");

const getAllActions = async (req, res) => {
  try {
    const actions = await moduleService.findAll();
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar módulo" });
  }
};

const getActionById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const action = await moduleService.findById(id);
    if (!action) return res.status(404).json({ message: "Módulo não encontrado" });
    res.json(action);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar módulo" });
  }
};

const createAction = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });

    const result = await moduleService.create(name);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar módulo" });
  }
};

const updateAction = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const result = await moduleService.update(id, name);
    res.status(200).json({ message: "Módulo atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteAction = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await moduleService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar módulo" });
  }
};

module.exports = {
  getAllActions,
  getActionById,
  createAction,
  updateAction,
  deleteAction,
};
