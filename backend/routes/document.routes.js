const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");

const multer = require("multer");
const storage = multer.memoryStorage(); // Armazena o arquivo na memória para envio ao banco
const upload = multer({
    storage,
    limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
});

router.get("/:id/download", documentController.download);
router.get("/:id/view", documentController.view);
router.get("/", documentController.getAll);
router.get("/:id", documentController.getById);
router.post("/", upload.single("file"), documentController.upload);
router.put("/:id", documentController.update);
router.delete("/:id", documentController.remove);

// Middleware para capturar erros do multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Arquivo muito grande. Limite de 16MB." });
    }
    next(err); // Deixa outros erros seguirem para o handler padrão
});

module.exports = router;
