const express = require("express");
const cors = require("cors");
require("dotenv").config();
const initSuperAdmin = require('./utils/initSuperAdmin');

const actionRoutes = require("./routes/action.routes");
const moduleRoutes = require("./routes/module.routes");
const roleRoutes = require("./routes/role.routes");
const systemRoleRoutes = require("./routes/systemrole.routes");
const permissionRoutes = require("./routes/permission.routes");
const teamRoutes = require("./routes/team.routes");
const userRoutes = require("./routes/user.routes");
const areaRoutes = require("./routes/area.routes");
const documentRoutes = require("./routes/document.routes");
const fundingAgencyRoutes = require("./routes/fundingagency.routes");
const activityRoutes = require("./routes/activity.routes");
const taskRoutes = require("./routes/task.routes");
const projectRoutes = require("./routes/project.routes");
const authRoutes = require('./routes/auth.routes');

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
app.use("/agencies", fundingAgencyRoutes);
app.use("/activities", activityRoutes);
app.use("/tasks", taskRoutes);
app.use("/projects", projectRoutes);
app.use('/auth', authRoutes);

// Inicializa o Super Admin antes do servidor rodar
initSuperAdmin()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('Erro ao criar o Super Admin:', err);
    process.exit(1); // encerra a aplicação se algo der errado
});
