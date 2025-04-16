const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const allowedStatus = ['Planejado', 'Em andamento', 'Suspenso', 'Concluído', 'Cancelado'];
const activeStatuses = ['Planejado', 'Em andamento', 'Suspenso'];

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM project", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM project WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const findByFilters = (where, values) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM project ${where}`, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const create = async ({ name, code, description, status, start_date, end_date, budget, funding_agency_id, created_by_id }) => {
  try {

    // Validações básicas obrigatórias
    if (!name || !code || !start_date || !end_date) {
      throw new Error("É necessário fornecer nome, código, data de início e data de término.");
    }

    // Verifica se já existe um projeto com o código fornecido
    const [codeExists] = await queryAsync("SELECT id FROM project WHERE code = ?", [code]);
    if (codeExists.length > 0) {
      throw new Error(`O código do projeto informado já existe no sistema, código: ${code}`);
    }

    // Valida status permitido
    if (status !== undefined && !allowedStatus.includes(status)) {
      throw new Error(`Status inválido: '${status}'. Os valores permitidos são: ${allowedStatus.join(", ")}`);
    }

    // Valida se as datas são válidas e coerentes
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Datas inválidas fornecidas.");
    }

    if (start > end) {
      throw new Error("A data de início não pode ser posterior à data de término.");
    }

    // Valida budget
    if (budget !== undefined) {
      if (isNaN(budget)) {
        throw new Error("O valor de orçamento deve ser um número válido.");
      }

      const budget_float = parseFloat(budget);
      if (budget_float < 0) {
        throw new Error("O valor de orçamento não pode ser negativo.");
      }
    }

    // Verifica se a agência de financiamento existe (se informada)
    if (funding_agency_id !== undefined) {
      const [agencyExists] = await queryAsync("SELECT id FROM funding_agency WHERE id = ?", [funding_agency_id]);
      if (agencyExists.length === 0) {
        throw new Error(`Agência de financiamento não encontrada, id: ${funding_agency_id}`);
      }
    }

    // Verifica se o usuário criador existe (se informado)
    if (created_by_id !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [created_by_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${created_by_id}`);
      }
    }

    // Monta dinamicamente os campos a serem inseridos
    const id = uuidv4();

    let is_active = true; // Definindo como ativo por padrão
    if (status !== undefined) {
      is_active = activeStatuses.includes(status);
    }
  
    const fields = ["id", "name", "code", "start_date", "end_date", "is_active"];
    const values = [id, name, code, start_date, end_date, is_active];
    const placeholders = ["?", "?", "?", "?", "?", "?"];
    
    if (description !== undefined) {
      fields.push("description");
      values.push(description);
      placeholders.push("?");
    }

    if (status !== undefined) {
      fields.push("status");
      values.push(status);
      placeholders.push("?");
    }

    if (budget !== undefined) {
      fields.push("budget");
      values.push(budget);
      placeholders.push("?");
    }

    if (funding_agency_id !== undefined) {
      fields.push("funding_agency_id");
      values.push(funding_agency_id);
      placeholders.push("?");
    }

    if (created_by_id !== undefined) {
      fields.push("created_by_id");
      values.push(created_by_id);
      placeholders.push("?");
    }

    const sql = `INSERT INTO project (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
    await queryAsync(sql, values);

    return { id, name };
  } catch (error) {
    throw error;
  }
};

const update = async (id, { name, code, description, status, start_date, end_date, budget, funding_agency_id, created_by_id }) => {
  try {

    // Verifica se o projeto existe
    const [projectExists] = await queryAsync("SELECT id, start_date, end_date FROM project WHERE id = ?", [id]);
    if (!projectExists) {
      throw new Error("Projeto não encontrado");
    }

    if (code !== undefined) {
      // Verifica se já existe um projeto com o código fornecido
      const [codeExists] = await queryAsync("SELECT id FROM project WHERE code = ? AND id != ?", [code, id]);
      if (codeExists.length > 0) {
        throw new Error(`O código do projeto informado já existe no sistema, código: ${code}`);
      }
    }

    // Valida status permitido
    if (status !== undefined && !allowedStatus.includes(status)) {
      throw new Error(`Status inválido: '${status}'. Os valores permitidos são: ${allowedStatus.join(", ")}`);
    }

    // Definição de is_active
    // Se o status não for fornecido, mantém o valor atual
    let is_active = undefined;
    if (status !== undefined) {
      is_active = activeStatuses.includes(status);
    }

    // Validação de datas mesmo se apenas uma for enviada
    let start = start_date ? new Date(start_date) : null;
    let end = end_date ? new Date(end_date) : null;

    if (start || end) {
      if (!start) start = projectExists[0].start_date;
      if (!end) end = projectExists[0].end_date;

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Datas inválidas fornecidas.");
      }

      if (start > end) {
        throw new Error("A data de início não pode ser posterior à data de término.");
      }
    }

    // Valida budget
    if (budget !== undefined) {
      if (isNaN(budget)) {
        throw new Error("O valor de orçamento deve ser um número válido.");
      }

      const budget_float = parseFloat(budget);
      if (budget_float < 0) {
        throw new Error("O valor de orçamento não pode ser negativo.");
      }
    }

    // Verifica se a agência de financiamento existe (se informada)
    if (funding_agency_id !== undefined) {
      const [agencyExists] = await queryAsync("SELECT id FROM funding_agency WHERE id = ?", [funding_agency_id]);
      if (agencyExists.length === 0) {
        throw new Error(`Agência de financiamento não encontrada, id: ${funding_agency_id}`);
      }
    }

    // Verifica se o usuário criador existe (se informado)
    if (created_by_id !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [created_by_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${created_by_id}`);
      }
    }

    // Monta dinamicamente os campos para o UPDATE
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (code !== undefined) {
      fields.push("code = ?");
      values.push(code);
    }

    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active);
    }

    if (start_date !== undefined) {
      fields.push("start_date = ?");
      values.push(start_date);
    }

    if (end_date !== undefined) {
      fields.push("end_date = ?");
      values.push(end_date);
    }

    if (budget !== undefined) {
      fields.push("budget = ?");
      values.push(budget);
    }

    if (funding_agency_id !== undefined) {
      fields.push("funding_agency_id = ?");
      values.push(funding_agency_id);
    }

    if (created_by_id !== undefined) {
      fields.push("created_by_id = ?");
      values.push(created_by_id);
    }

    if (fields.length === 0) {
      throw new Error("Nenhum campo válido foi enviado para atualização.");
    }

    const sql = `UPDATE project SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    const result = await queryAsync(sql, values);

    return { id, updated: result[0].affectedRows > 0};
  } catch (error) {
    throw error;
  }
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM project WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const findAreasByProjectId = (projectId) => {
  const sql = `
    SELECT a.*
    FROM area a
    INNER JOIN project_area pa ON pa.area_id = a.id
    WHERE pa.project_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [projectId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addAreaToProject = async (projectId, areaId) => {
  try {
    // Verifica se projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Verifica se área existe
    const [area] = await queryAsync("SELECT id FROM area WHERE id = ?", [areaId]);
    if (area.length === 0) {
      throw new Error("Área não encontrada.");
    }

    // Verifica se vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM project_area WHERE project_id = ? AND area_id = ?",
      [projectId, areaId]
    );
    if (exists.length > 0) {
      throw new Error("Vínculo já existente entre o projeto e a área.");
    }

    // Verifica se o projeto já tem 5 áreas vinculadas
    const [countResult] = await queryAsync(
      "SELECT COUNT(*) AS count FROM project_area WHERE project_id = ?",
      [projectId]
    );
    if (countResult[0].count >= 5) {
      throw new Error("O projeto já possui o número máximo de 5 áreas vinculadas.");
    }

    // Insere vínculo
    await queryAsync("INSERT INTO project_area (project_id, area_id) VALUES (?, ?)", [projectId, areaId]);

    return { message: "Área vinculada com sucesso." };
  } catch (error) {
    throw error;
  }
};

const removeAreaFromProject = async (projectId, areaId) => {
  try {
    // Verifica se o vínculo existe
    const [existing] = await queryAsync(
      "SELECT * FROM project_area WHERE project_id = ? AND area_id = ?",
      [projectId, areaId]
    );

    if (existing.length === 0) {
      throw new Error("Vínculo entre projeto e área não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM project_area WHERE project_id = ? AND area_id = ?",
      [projectId, areaId]
    );

    return { message: "Vínculo removido com sucesso." };
  } catch (error) {
    throw error;
  }
};

const findAvailableAreasForProject = async (projectId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Retorna áreas que ainda não estão vinculadas ao projeto
    const sql = `
      SELECT a.*
      FROM area a
      WHERE a.id NOT IN (
        SELECT area_id
        FROM project_area
        WHERE project_id = ?
      )
    `;

    const [result] = await queryAsync(sql, [projectId]);
    return result;
  } catch (error) {
    throw error;
  }
};

const findFundingAgenciesByProjectId = (projectId) => {
  const sql = `
    SELECT fa.*
    FROM funding_agency fa
    INNER JOIN project_funding_agency pfa ON pfa.funding_agency_id = fa.id
    WHERE pfa.project_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [projectId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addFundingAgencyToProject = async (projectId, agencyId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Verifica se a agência existe
    const [agency] = await queryAsync("SELECT id FROM funding_agency WHERE id = ?", [agencyId]);
    if (agency.length === 0) {
      throw new Error("Agência de fomento não encontrada.");
    }

    // Verifica se vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM project_funding_agency WHERE project_id = ? AND funding_agency_id = ?",
      [projectId, agencyId]
    );
    if (exists.length > 0) {
      throw new Error("Esta agência já está vinculada ao projeto.");
    }

    // Verifica se o projeto já tem 3 agências vinculadas
    const [countResult] = await queryAsync(
      "SELECT COUNT(*) AS count FROM project_funding_agency WHERE project_id = ?",
      [projectId]
    );
    if (countResult[0].count >= 3) {
      throw new Error("O projeto já possui o número máximo de 3 agências de fomento vinculadas.");
    }

    // Insere vínculo
    await queryAsync(
      "INSERT INTO project_funding_agency (project_id, funding_agency_id) VALUES (?, ?)",
      [projectId, agencyId]
    );

    return { message: "Agência vinculada com sucesso ao projeto." };
  } catch (error) {
    throw error;
  }
};

const removeFundingAgencyFromProject = async (projectId, agencyId) => {
  try {
    // Verifica se o vínculo existe
    const [existing] = await queryAsync(
      "SELECT * FROM project_funding_agency WHERE project_id = ? AND funding_agency_id = ?",
      [projectId, agencyId]
    );

    if (existing.length === 0) {
      throw new Error("Vínculo entre projeto e agência não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM project_funding_agency WHERE project_id = ? AND funding_agency_id = ?",
      [projectId, agencyId]
    );

    return { message: "Vínculo removido com sucesso." };
  } catch (error) {
    throw error;
  }
};

const findAvailableFundingAgenciesForProject = async (projectId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Retorna agências que ainda não estão vinculadas ao projeto
    const sql = `
      SELECT fa.*
      FROM funding_agency fa
      WHERE fa.id NOT IN (
        SELECT funding_agency_id
        FROM project_funding_agency
        WHERE project_id = ?
      )
    `;

    const [result] = await queryAsync(sql, [projectId]);
    return result;
  } catch (error) {
    throw error;
  }
};

const findInstitutionsByProjectId = (projectId) => {
  const sql = `
    SELECT i.*
    FROM institution i
    INNER JOIN project_institution pi ON pi.institution_id = i.id
    WHERE pi.project_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [projectId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addInstitutionToProject = async (projectId, institutionId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Verifica se a instituição existe
    const [institution] = await queryAsync("SELECT id FROM institution WHERE id = ?", [institutionId]);
    if (institution.length === 0) {
      throw new Error("Instituição não encontrada.");
    }

    // Verifica se o vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM project_institution WHERE project_id = ? AND institution_id = ?",
      [projectId, institutionId]
    );
    if (exists.length > 0) {
      throw new Error("Esta instituição já está vinculada ao projeto.");
    }

    // Verifica se já há 3 instituições vinculadas
    const [countResult] = await queryAsync(
      "SELECT COUNT(*) AS count FROM project_institution WHERE project_id = ?",
      [projectId]
    );
    if (countResult[0].count >= 3) {
      throw new Error("O projeto já possui o número máximo de 3 instituições vinculadas.");
    }

    // Insere vínculo
    await queryAsync(
      "INSERT INTO project_institution (project_id, institution_id) VALUES (?, ?)",
      [projectId, institutionId]
    );

    return { message: "Instituição vinculada com sucesso ao projeto." };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  findAll,
  findById,
  findByFilters,
  create,
  update,
  remove,
  findAreasByProjectId,
  addAreaToProject,
  removeAreaFromProject,
  findAvailableAreasForProject,
  findFundingAgenciesByProjectId,
  addFundingAgencyToProject,
  removeFundingAgencyFromProject,
  findAvailableFundingAgenciesForProject,
  findInstitutionsByProjectId,
  addInstitutionToProject,
};
