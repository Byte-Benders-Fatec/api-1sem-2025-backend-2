const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");

router.get("/", activityController.getAll);
router.get("/filters", activityController.getByFilter);
router.get("/:id", activityController.getById);
router.post("/", activityController.create);
router.put("/:id", activityController.update);
router.delete("/:id", activityController.remove);

module.exports = router;
