const express = require("express");
const router = express.Router();
const axios = require("axios");
const { queryAsync } = require("../configs/db");

// Função auxiliar para extrair Yes ou No
function extrairYesNo(texto) {
  if (/YesYesYes/.test(texto)) return "yes";
  if (/NoNoNo/.test(texto)) return "no";
  return null;
}

function extrairBlocoDeCodigo(texto) {
  const regex = /```(?:\w+)?\s*([\s\S]*?)```/;
  const match = texto.match(regex);
  return match ? match[1].trim() : null;
}

router.post("/ask", async (req, res) => {
  const { prompt } = req.body;

  const schemaDescription = `
CREATE DATABASE IF NOT EXISTS fapg
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE fapg;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS system_role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    level INT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    system_role_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (system_role_id) REFERENCES system_role(id)
);

CREATE TABLE IF NOT EXISTS user_photo (
    user_id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    content MEDIUMBLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_user_photo_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS module (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permission (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL UNIQUE,
    module_id INT NOT NULL,
    action_id INT NOT NULL,
    system_defined BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (module_id) REFERENCES module(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (action_id) REFERENCES action(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS role (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    system_defined BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS role_permission (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role_id CHAR(36) NOT NULL,
    permission_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
	UNIQUE KEY unique_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS funding_agency (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL UNIQUE,
    acronym VARCHAR(30) NOT NULL UNIQUE,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    website VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS institution (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL UNIQUE,
    acronym VARCHAR(30) NOT NULL UNIQUE,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    website VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS document (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    content MEDIUMBLOB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS area (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS project (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status ENUM(
        'Planejado',
        'Em andamento',
        'Suspenso',
        'Concluído',
        'Cancelado'
    ) NOT NULL DEFAULT 'Planejado',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
	CHECK (end_date >= start_date),
    budget DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CHECK (budget >= 0.00),
    created_by_id CHAR(36) DEFAULT NULL,
    responsible_user_id CHAR(36) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (created_by_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (responsible_user_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS project_document (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    document_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_project_document (project_id, document_id)
);

CREATE TABLE IF NOT EXISTS project_area (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    area_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (area_id) REFERENCES area(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_project_area (project_id, area_id)
);

CREATE TABLE IF NOT EXISTS project_institution (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    institution_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institution(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_project_institution (project_id, institution_id)
);

CREATE TABLE IF NOT EXISTS project_funding_agency (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    funding_agency_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (funding_agency_id) REFERENCES funding_agency(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_project_funding_agency (project_id, funding_agency_id)
);

CREATE TABLE IF NOT EXISTS user_project (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    role_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_user_project (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS team (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS user_team (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_user_team (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS project_team (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_project_team (project_id, team_id)
);

CREATE TABLE IF NOT EXISTS activity (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    status ENUM('Não iniciada', 'Em andamento', 'Concluída', 'Cancelada') DEFAULT 'Não iniciada',
    allocated_budget DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CHECK (allocated_budget >= 0.00),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
	CHECK (end_date >= start_date),
    created_by_id CHAR(36) DEFAULT NULL,
    responsible_user_id CHAR(36) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (created_by_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (responsible_user_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_user (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    activity_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (activity_id) REFERENCES activity(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_activity_user (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS task (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    activity_id CHAR(36) NOT NULL,
    user_id CHAR(36) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    time_spent_minutes INT NOT NULL DEFAULT 0,
    CHECK (time_spent_minutes >= 0),
    cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CHECK (cost >= 0.00),
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (activity_id) REFERENCES activity(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_document (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    activity_id CHAR(36) NOT NULL,
    document_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (activity_id) REFERENCES activity(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_activity_document (activity_id, document_id)
);

CREATE TABLE IF NOT EXISTS task_document (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    document_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_task_document (task_id, document_id)
);

CREATE TABLE IF NOT EXISTS two_fa_code (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    is_double BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    status ENUM('pending', 'verified', 'denied') DEFAULT 'pending',
    type ENUM('login', 'password_reset', 'password_change', 'critical_action') NOT NULL DEFAULT 'login',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS user_password (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_temp BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    locked_until DATETIME DEFAULT NULL,
    lockout_level INT NOT NULL DEFAULT 0,
    status ENUM('valid', 'expired', 'blocked') DEFAULT 'valid',
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);
  `;

  const fullPrompt = `${schemaDescription}
  Com base na estrutura acima, gere apenas uma consulta SQL para: ${prompt}`;

  try {
    // Passo 1: Perguntar ao LLM se a pergunta é sobre consulta ao banco
    const checkIntent = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3",
      prompt: `A seguinte mensagem é uma requisição de consulta ao banco de dados? Responda apenas com 'YesYesYes' ou 'NoNoNo': ${prompt}`,
      stream: false
    });

    const respostaIntent = checkIntent.data.response.trim();
    const decisao = extrairYesNo(respostaIntent);
    console.log("Decisão do LLM:", decisao);

    if (decisao === "yes") {

      // Passo 2: Obter uma consulta SQL sugerida pelo LLM
      const sqlSuggestion = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3",
        prompt: fullPrompt,
        stream: false
      });

      const respostaLLM = sqlSuggestion.data.response.trim();
      console.log("Consulta SQL sugerida:", respostaLLM);
      const sqlQuery = extrairBlocoDeCodigo(respostaLLM);

      if (!sqlQuery) {
        throw new Error("Não foi possível extrair a consulta SQL.");
      }

      // Passo 3: Executar a consulta SQL sugerida
      const [dbResult] = await queryAsync(sqlQuery);
      console.log("Resultado da consulta:", dbResult);

      // Passo 4: Enviar o resultado da consulta para o LLM analisar e gerar a resposta final
      const finalResponse = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3",
        prompt: `O resultado da consulta ao banco de dados é: ${JSON.stringify(dbResult)}. 
        Com base nisso, gere uma resposta compreensível para o usuário. Sempre responda em português.`,
        stream: false
      });

      // Passo 5: Retornar a resposta final ao usuário
      res.json({ response: finalResponse.data.response });

    } else if (decisao === "no") {

      // Passo 2: Apenas responder diretamente
      const directResponse = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3",
        prompt: prompt,
        stream: false
      });

      res.json({ response: directResponse.data.response });

    } else {
      throw new Error("Não foi possível determinar se é uma consulta ao banco.");
    }

  } catch (error) {
    console.error("Erro no fluxo de consulta com LLM:", error.message);
    res.status(500).json({ error: "Erro ao processar a consulta com a IA." });
  }
});

module.exports = router;
