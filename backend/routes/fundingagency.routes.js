const express = require("express");
const router = express.Router();
const fundingAgencyController = require("../controllers/fundingagency.controller");

router.get("/", fundingAgencyController.getAll);
router.get("/:id", fundingAgencyController.getById);
router.post("/", fundingAgencyController.create);
router.put("/:id", fundingAgencyController.update);
router.delete("/:id", fundingAgencyController.remove);

module.exports = router;
