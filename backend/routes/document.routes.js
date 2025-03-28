const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");

const multer = require("multer");
const storage = multer.memoryStorage(); // Armazena o arquivo na memória para envio ao banco
const upload = multer({ storage });

router.get("/:id/download", documentController.download);
router.get("/:id/view", documentController.view);
router.get("/", documentController.getAll);
router.get("/:id", documentController.getById);
router.post("/", upload.single("file"), documentController.upload);
router.put("/:id", documentController.update);
router.delete("/:id", documentController.remove);

module.exports = router;
