const express = require("express");
const cors = require("cors");
require("dotenv").config();

const actionRoutes = require("./routes/action.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/actions", actionRoutes);

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
