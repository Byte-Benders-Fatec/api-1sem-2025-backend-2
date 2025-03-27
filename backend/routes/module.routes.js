const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/module.controller");

router.get("/", moduleController.getAllActions);
router.get("/:id", moduleController.getActionById);
router.post("/", moduleController.createAction);
router.put("/:id", moduleController.updateAction);
router.delete("/:id", moduleController.deleteAction);

module.exports = router;
