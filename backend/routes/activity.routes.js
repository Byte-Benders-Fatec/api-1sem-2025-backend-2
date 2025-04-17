const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");

// Tarefas vinculadas a atividade (1:N)
router.get("/:id/tasks", activityController.getTasksByActivityId);
router.post("/:id/tasks", activityController.createTaskForActivity);

// Atividades - CRUD principal
router.get("/", activityController.getAll);
router.get("/filters", activityController.getByFilter);
router.get("/:id", activityController.getById);
router.post("/", activityController.create);
router.put("/:id", activityController.update);
router.delete("/:id", activityController.remove);

module.exports = router;
