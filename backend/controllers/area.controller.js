const areaService = require("../services/area.service");

const getAll = async (req, res) => {
  try {
    const areas = await areaService.findAll();
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar área" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const area = await areaService.findById(id);
    if (!area) return res.status(404).json({ message: "Área não encontrada" });
    res.json(area);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar área" });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });

    const result = await areaService.create({ name, description });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar área" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, description, is_active } = req.body;

  try {
    const result = await areaService.update(id, { name, description, is_active });
    res.status(200).json({ message: "Área atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await areaService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar área" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
