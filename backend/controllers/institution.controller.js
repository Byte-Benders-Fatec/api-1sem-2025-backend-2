const institutionService = require("../services/institution.service");

const getAll = async (req, res) => {
  try {
    const institutions = await institutionService.findAll();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar instituições" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const institution = await institutionService.findById(id);
    if (!institution) return res.status(404).json({ message: "Instituição não encontrada" });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar instituição" });
  }
};

const create = async (req, res) => {
  try {
    const { name, acronym, cnpj, website } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!acronym) return res.status(400).json({ error: "A sigla é obrigatória" });
    if (!cnpj) return res.status(400).json({ error: "O CNPJ é obrigatório" });

    const result = await institutionService.create({ name, acronym, cnpj, website });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar instituição" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, acronym, cnpj, website, is_active } = req.body;

  try {
    const result = await institutionService.update(id, { name, acronym, cnpj, website, is_active });
    res.status(200).json({ message: "Instituição atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await institutionService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar instituição" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
