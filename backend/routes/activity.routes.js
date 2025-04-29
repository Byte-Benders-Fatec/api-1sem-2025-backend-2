const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const { upload, handleMulterError } = require("../middlewares/upload.middleware");

// Tarefas vinculadas a atividade (1:N)
router.get("/:id/tasks", activityController.getTasksByActivityId);
router.post("/:id/tasks", activityController.createTaskForActivity);

// Documentos vinculados à atividade (N:N)
router.get("/:id/documents", activityController.getDocumentsByActivityId);
router.post("/:id/documents/upload", upload.single("file"), activityController.uploadAndLinkDocumentToActivity);
router.post("/:id/documents", activityController.linkDocumentToActivity);
router.delete("/:activityId/documents/:documentId", activityController.unlinkDocumentFromActivity);

// Atividades - CRUD principal
router.get("/", activityController.getAll);
router.get("/filters", activityController.getByFilter);
router.get("/:id", activityController.getById);
router.post("/", activityController.create);
router.put("/:id", activityController.update);
router.delete("/:id", activityController.remove);

// Middleware para capturar erros do multer
router.use(handleMulterError);

module.exports = router;
