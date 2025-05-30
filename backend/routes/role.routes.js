const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");

router.get("/", roleController.getAll);
router.get("/:id", roleController.getById);
router.post("/", roleController.create);
router.put("/:id", roleController.update);
router.delete("/:id", roleController.remove);

module.exports = router;
