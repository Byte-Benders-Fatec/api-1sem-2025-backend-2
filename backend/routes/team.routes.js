const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");

// Usuários vinculados ao time (N:N)
router.get("/:id/users", teamController.getUsersByTeamId);
router.get("/:id/available-users", teamController.getAvailableUsersForTeam);
router.post("/:id/users", teamController.linkUserToTeam);
router.delete("/:teamId/users/:userId", teamController.unlinkUserFromTeam);

// Times - CRUD principal
router.get("/", teamController.getAll);
router.get("/filters", teamController.getByFilter);
router.get("/:id", teamController.getById);
router.post("/", teamController.create);
router.put("/:id", teamController.update);
router.delete("/:id", teamController.remove);

module.exports = router;
