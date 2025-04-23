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

const create = async ({ name, code, description, status, start_date, end_date, budget, created_by_id, responsible_user_id }) => {
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

    // Verifica se o usuário criador existe (se informado)
    if (created_by_id !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [created_by_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário criador não encontrado, id: ${created_by_id}`);
      }
    }

    // Verifica se o usuário responsável existe (se informado)
    if (responsible_user_id !== undefined && created_by_id !== responsible_user_id) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [responsible_user_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário responsável não encontrado, id: ${responsible_user_id}`);
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

    if (created_by_id !== undefined) {
      fields.push("created_by_id");
      values.push(created_by_id);
      placeholders.push("?");
    }

    if (responsible_user_id !== undefined) {
      fields.push("responsible_user_id");
      values.push(responsible_user_id);
      placeholders.push("?");
    } else if (created_by_id !== undefined) {
      fields.push("responsible_user_id");
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

const update = async (id, { name, code, description, status, start_date, end_date, budget, created_by_id, responsible_user_id }) => {
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

    // Verifica se o usuário criador existe (se informado)
    if (created_by_id !== undefined) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [created_by_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário não encontrado, id: ${created_by_id}`);
      }
    }

    // Verifica se o usuário responsável existe (se informado)
    if (responsible_user_id !== undefined && created_by_id !== responsible_user_id) {
      const [userExists] = await queryAsync("SELECT id FROM user WHERE id = ?", [responsible_user_id]);
      if (userExists.length === 0) {
        throw new Error(`Usuário responsável não encontrado, id: ${responsible_user_id}`);
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

    if (created_by_id !== undefined) {
      fields.push("created_by_id = ?");
      values.push(created_by_id);
    }

    if (responsible_user_id !== undefined) {
      fields.push("responsible_user_id = ?");
      values.push(responsible_user_id);
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

const removeInstitutionFromProject = async (projectId, institutionId) => {
  try {
    // Verifica se o vínculo existe
    const [existing] = await queryAsync(
      "SELECT * FROM project_institution WHERE project_id = ? AND institution_id = ?",
      [projectId, institutionId]
    );

    if (existing.length === 0) {
      throw new Error("Vínculo entre projeto e instituição não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM project_institution WHERE project_id = ? AND institution_id = ?",
      [projectId, institutionId]
    );

    return { message: "Vínculo removido com sucesso." };
  } catch (error) {
    throw error;
  }
};

const findAvailableInstitutionsForProject = async (projectId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Retorna instituições que ainda não estão vinculadas ao projeto
    const sql = `
      SELECT i.*
      FROM institution i
      WHERE i.id NOT IN (
        SELECT institution_id
        FROM project_institution
        WHERE project_id = ?
      )
    `;

    const [result] = await queryAsync(sql, [projectId]);
    return result;
  } catch (error) {
    throw error;
  }
};

const findTeamsByProjectId = (projectId) => {
  const sql = `
    SELECT t.*
    FROM team t
    INNER JOIN project_team pt ON pt.team_id = t.id
    WHERE pt.project_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [projectId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addTeamToProject = async (projectId, teamId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Verifica se o time existe
    const [team] = await queryAsync("SELECT id FROM team WHERE id = ?", [teamId]);
    if (team.length === 0) {
      throw new Error("Time não encontrado.");
    }

    // Verifica se o vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM project_team WHERE project_id = ? AND team_id = ?",
      [projectId, teamId]
    );
    if (exists.length > 0) {
      throw new Error("Este time já está vinculado ao projeto.");
    }

    // Insere vínculo
    await queryAsync(
      "INSERT INTO project_team (project_id, team_id) VALUES (?, ?)",
      [projectId, teamId]
    );

    return { message: "Time vinculado com sucesso ao projeto." };
  } catch (error) {
    throw error;
  }
};

const removeTeamFromProject = async (projectId, teamId) => {
  try {
    // Verifica se o vínculo existe
    const [existing] = await queryAsync(
      "SELECT * FROM project_team WHERE project_id = ? AND team_id = ?",
      [projectId, teamId]
    );

    if (existing.length === 0) {
      throw new Error("Vínculo entre projeto e time não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM project_team WHERE project_id = ? AND team_id = ?",
      [projectId, teamId]
    );

    return { message: "Vínculo removido com sucesso." };
  } catch (error) {
    throw error;
  }
};

const findAvailableTeamsForProject = async (projectId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Retorna times não vinculados
    const sql = `
      SELECT t.*
      FROM team t
      WHERE t.id NOT IN (
        SELECT team_id
        FROM project_team
        WHERE project_id = ?
      )
    `;

    const [result] = await queryAsync(sql, [projectId]);
    return result;
  } catch (error) {
    throw error;
  }
};

const findDocumentsByProjectId = (projectId) => {
  const sql = `
    SELECT d.id, d.name, d.mime_type, d.is_active, d.created_at, d.updated_at, d.deleted_at
    FROM document d
    INNER JOIN project_document pd ON pd.document_id = d.id
    WHERE pd.project_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [projectId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const addDocumentToProject = async (projectId, documentId) => {
  try {
    // Verifica se o projeto existe
    const [project] = await queryAsync("SELECT id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    // Verifica se o documento existe
    const [document] = await queryAsync("SELECT id FROM document WHERE id = ?", [documentId]);
    if (document.length === 0) {
      throw new Error("Documento não encontrado.");
    }

    // Verifica se o vínculo já existe
    const [exists] = await queryAsync(
      "SELECT * FROM project_document WHERE project_id = ? AND document_id = ?",
      [projectId, documentId]
    );
    if (exists.length > 0) {
      throw new Error("Este documento já está vinculado ao projeto.");
    }

    // Insere vínculo
    await queryAsync(
      "INSERT INTO project_document (project_id, document_id) VALUES (?, ?)",
      [projectId, documentId]
    );

    return { message: "Documento vinculado com sucesso ao projeto." };
  } catch (error) {
    throw error;
  }
};

const removeDocumentFromProject = async (projectId, documentId) => {
  try {
    // Verifica se o documento existe
    const [docResult] = await queryAsync(
      "SELECT * FROM document WHERE id = ?", 
      [documentId]
    );
    if (docResult.length === 0) {
      throw new Error("Documento não encontrado.");
    }

    // Verifica se o vínculo existe
    const [existing] = await queryAsync(
      "SELECT * FROM project_document WHERE project_id = ? AND document_id = ?",
      [projectId, documentId]
    );

    if (existing.length === 0) {
      throw new Error("Vínculo entre projeto e documento não encontrado.");
    }

    // Remove o vínculo
    await queryAsync(
      "DELETE FROM project_document WHERE project_id = ? AND document_id = ?",
      [projectId, documentId]
    );

    // Remove o documento em si
    await queryAsync("DELETE FROM document WHERE id = ?", [documentId]);

    return { message: "Documento removido com sucesso." };
  } catch (error) {
    throw error;
  }
};

const findActivitiesByProjectId = (projectId) => {
  const sql = `
    SELECT * FROM activity
    WHERE project_id = ?
  `;
  return new Promise((resolve, reject) => {
    db.query(sql, [projectId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findUsersByProjectId = async (projectId) => {
  try {
    // Verifica se o projeto existe
    // Recupera os IDs de criador e responsável
    const [project] = await queryAsync("SELECT created_by_id, responsible_user_id FROM project WHERE id = ?", [projectId]);
    if (project.length === 0) {
      throw new Error("Projeto não encontrado.");
    }

    const userIds = new Set();

    // Adiciona o criador
    if (project[0].created_by_id) {
      userIds.add(project[0].created_by_id);
    }

    // Adiciona o responsável (se diferente do criador)
    if (project[0].responsible_user_id && project[0].responsible_user_id !== project[0].created_by_id) {
      userIds.add(project[0].responsible_user_id);
    }

    // Busca usuários vinculados aos times do projeto
    const [teamUsers] = await queryAsync(`
      SELECT DISTINCT u.*
      FROM user u
      INNER JOIN user_team ut ON ut.user_id = u.id
      INNER JOIN project_team pt ON pt.team_id = ut.team_id
      WHERE pt.project_id = ?
    `, [projectId]);

    teamUsers.forEach(u => userIds.add(u.id));
    
    // Consulta todos os usuários únicos de uma vez
    if (userIds.size === 0) return [];
    
    const placeholders = Array.from(userIds).map(() => '?').join(', ');
    const [users] = await queryAsync(
      `SELECT u.id, u.name, u.email, u.is_active, u.system_role_id FROM user u WHERE id IN (${placeholders})`
      , [...userIds]
    );

    return users;
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
  removeInstitutionFromProject,
  findAvailableInstitutionsForProject,
  findTeamsByProjectId,
  addTeamToProject,
  removeTeamFromProject,
  findAvailableTeamsForProject,
  findDocumentsByProjectId,
  addDocumentToProject,
  removeDocumentFromProject,
  findActivitiesByProjectId,
  findUsersByProjectId,
};
