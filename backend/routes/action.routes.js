const express = require("express");
const router = express.Router();
const actionController = require("../controllers/action.controller");

router.get("/", actionController.getAllActions);
router.get("/:id", actionController.getActionById);
router.post("/", actionController.createAction);
router.put("/:id", actionController.updateAction);
router.delete("/:id", actionController.deleteAction);

module.exports = router;
