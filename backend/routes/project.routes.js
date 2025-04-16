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

// Projetos - CRUD principal
router.get("/", projectController.getAll);
router.get("/filters", projectController.getByFilter);
router.get("/:id", projectController.getById);
router.post("/", projectController.create);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.remove);

module.exports = router;
