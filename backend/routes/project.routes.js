const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project.controller");

// Áreas vinculadas a projeto (N:N)
router.get("/:id/areas", projectController.getAreasByProjectId);
router.get("/:id/available-areas", projectController.getAvailableAreasForProject);
router.post("/:id/areas", projectController.linkAreaToProject);
router.delete("/:projectId/areas/:areaId", projectController.unlinkAreaFromProject);

// Agências de Financiamento vinculadas a projeto (N:N)
router.get("/:id/agencies", projectController.getFundingAgenciesByProjectId);
router.get("/:id/available-agencies", projectController.getAvailableFundingAgenciesForProject);
router.post("/:id/agencies", projectController.linkFundingAgencyToProject);
router.delete("/:projectId/agencies/:agencyId", projectController.unlinkFundingAgencyFromProject);

// Instituições vinculadas a projeto (N:N)
router.get("/:id/institutions", projectController.getInstitutionsByProjectId);
router.get("/:id/available-institutions", projectController.getAvailableInstitutionsForProject);
router.post("/:id/institutions", projectController.linkInstitutionToProject);
router.delete("/:projectId/institutions/:institutionId", projectController.unlinkInstitutionFromProject);

// Times vinculados a projeto (N:N)
router.get("/:id/teams", projectController.getTeamsByProjectId);
router.get("/:id/available-teams", projectController.getAvailableTeamsForProject);
router.post("/:id/teams", projectController.linkTeamToProject);
router.delete("/:projectId/teams/:teamId", projectController.unlinkTeamFromProject);

// Documentos vinculados a projeto (N:N)
router.get("/:id/documents", projectController.getDocumentsByProjectId);
router.post("/:id/documents", projectController.linkDocumentToProject);

// Projetos - CRUD principal
router.get("/", projectController.getAll);
router.get("/filters", projectController.getByFilter);
router.get("/:id", projectController.getById);
router.post("/", projectController.create);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.remove);

module.exports = router;
