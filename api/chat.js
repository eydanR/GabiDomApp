import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8000"
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const githubPages = /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin);
  if (allowedOrigins.includes(origin) || githubPages) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Usa POST" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Falta configurar OPENAI_API_KEY" });
  }

  try {
    const { message, data } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: "Falta el mensaje" });
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      input: [
        {
          role: "system",
          content:
            "Eres el asistente interno de GabiDom.inc. Ayuda con ventas, clientes, inventario, uniformes, producción y empleados. Responde en español, con pasos claros y tono práctico. No inventes datos; si falta información, dilo."
        },
        {
          role: "user",
          content:
            message +
            "\n\nDatos actuales de la app, si existen:\n" +
            JSON.stringify(data || {}, null, 2).slice(0, 12000)
        }
      ]
    });

    return res.status(200).json({ reply: response.output_text });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo consultar ChatGPT",
      detail: error.message
    });
  }
}
