const taskService = require("../services/task.service");

const getAll = async (req, res) => {
  try {
    const tasks = await taskService.findAll();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tarefa" });
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
    res.status(500).json({ error: "Erro ao criar tarefa" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { activity_id, user_id, title, description, time_spent_minutes, cost } = req.body;

  try {
    const result = await taskService.update(id, { activity_id, user_id, title, description, time_spent_minutes, cost });
    res.status(200).json({ message: "Tarefa atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
