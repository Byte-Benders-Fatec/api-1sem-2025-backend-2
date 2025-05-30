const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project.controller");
const { upload, handleMulterError } = require("../middlewares/upload.middleware");

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

// Usuários vinculados ao projeto (via criação, responsabilidade ou time)
router.get("/:id/users", projectController.getUsersByProjectId);

// Documentos vinculados a projeto (N:N)
router.get("/:id/documents", projectController.getDocumentsByProjectId);
router.post("/:id/documents/upload", upload.single("file"), projectController.uploadAndLinkDocumentToProject);
router.post("/:id/documents", projectController.linkDocumentToProject);
router.delete("/:projectId/documents/:documentId", projectController.unlinkDocumentFromProject);

// Atividades vinculadas a projeto (1:N)
router.get("/:id/activities", projectController.getActivitiesByProjectId);
router.post("/:id/activities", projectController.createActivityForProject);

// Projetos - CRUD principal
router.get("/", projectController.getAll);
router.get("/filters", projectController.getByFilter);
router.get("/:id", projectController.getById);
router.post("/", projectController.create);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.remove);

// Middleware para capturar erros do multer
router.use(handleMulterError);

module.exports = router;
