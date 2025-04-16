const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project.controller");

router.get("/", projectController.getAll);
router.get("/filters", projectController.getByFilter);
router.get("/:id/areas", projectController.getAreasByProjectId);
router.post("/:id/areas", projectController.linkAreaToProject);
router.get("/:id", projectController.getById);
router.post("/", projectController.create);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.remove);

module.exports = router;
