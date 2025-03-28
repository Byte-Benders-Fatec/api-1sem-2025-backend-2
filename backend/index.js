const express = require("express");
const cors = require("cors");
require("dotenv").config();

const actionRoutes = require("./routes/action.routes");
const moduleRoutes = require("./routes/module.routes");
const roleRoutes = require("./routes/role.routes");
const systemRoleRoutes = require("./routes/systemrole.routes");
const permissionRoutes = require("./routes/permission.routes");
const teamRoutes = require("./routes/team.routes");
const userRoutes = require("./routes/user.routes");
const areaRoutes = require("./routes/area.routes");
const documentRoutes = require("./routes/document.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/actions", actionRoutes);
app.use("/modules", moduleRoutes);
app.use("/roles", roleRoutes);
app.use("/systemroles", systemRoleRoutes);
app.use("/permissions", permissionRoutes);
app.use("/teams", teamRoutes);
app.use("/users", userRoutes);
app.use("/areas", areaRoutes);
app.use("/documents", documentRoutes);

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
