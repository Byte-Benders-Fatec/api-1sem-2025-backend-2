const express = require("express");
const router = express.Router();
const institutionController = require("../controllers/institution.controller");

router.get("/", institutionController.getAll);
router.get("/filters", institutionController.getByFilter);
router.get("/:id", institutionController.getById);
router.post("/", institutionController.create);
router.put("/:id", institutionController.update);
router.delete("/:id", institutionController.remove);

module.exports = router;
