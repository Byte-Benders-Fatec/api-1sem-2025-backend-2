const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");

// Documentos vinculados à tarefa (N:N)
router.get("/:id/documents", taskController.getDocumentsByTaskId);
router.post("/:id/documents", taskController.linkDocumentToTask);
router.delete("/:taskId/documents/:documentId", taskController.unlinkDocumentFromTask);

// Tarefas - CRUD principal
router.get("/", taskController.getAll);
router.get("/filters", taskController.getByFilter);
router.get("/:id", taskController.getById);
router.post("/", taskController.create);
router.put("/:id", taskController.update);
router.delete("/:id", taskController.remove);

module.exports = router;
