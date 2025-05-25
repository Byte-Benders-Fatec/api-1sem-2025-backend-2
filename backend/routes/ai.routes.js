const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/ask", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "tinyllama-chat", 
      prompt,
      stream: false
    });

    res.json({ response: response.data.response });
  } catch (error) {
    console.error("Erro ao comunicar com o Ollama:", error.message);
    res.status(500).json({ error: "Erro ao comunicar com o assistente IA." });
  }
});

module.exports = router;
