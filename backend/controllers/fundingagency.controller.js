const fundingAgencyService = require("../services/fundingagency.service");

const getAll = async (req, res) => {
  try {
    const fundingagencies = await fundingAgencyService.findAll();
    res.json(fundingagencies);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agência de financiamento" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const fundingagency = await fundingAgencyService.findById(id);
    if (!fundingagency) return res.status(404).json({ message: "Agência de financiamento não encontrada" });
    res.json(fundingagency);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agência de financiamento" });
  }
};

const create = async (req, res) => {
  try {
    const { name, acronym, cnpj, website } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!acronym) return res.status(400).json({ error: "A sigla é obrigatória" });
    if (!cnpj) return res.status(400).json({ error: "O cnpj é obrigatório" });

    const result = await fundingAgencyService.create({ name, acronym, cnpj, website });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar agência de financiamento" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, acronym, cnpj, website, is_active } = req.body;

  try {
    const result = await fundingAgencyService.update(id, { name, acronym, cnpj, website, is_active });
    res.status(200).json({ message: "Agência de financiamento atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await fundingAgencyService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar agência de financiamento" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
