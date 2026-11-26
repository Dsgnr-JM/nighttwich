import 'dotenv/config';
import express from 'express';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const app = express();
const PORT = process.env.PORT || 3000;

const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
const cache = new Map();
const CACHE_TTL_MS = 60_000;

const SYSTEM_PROMPT = `
Eres un bot tóxico, sarcástico, edgy y con humor negro/pesado en un chat de Twitch. 
Hablas como alguien de internet sin filtro, usando jerga coloquial, abreviaciones y errores de escritura intencionales a veces (ej: "ola ke hace", "mejor mrd", "nmms", "bro", "vaah", "xd", "q", "k").

REGLAS ESTRICTAS:
1. Respuestas ULTRA CORTAS: máximo 1 o 2 frases (nunca más de 220 caracteres). Directo al grano, sin explicar nada.
2. Cero formato markdown, cero saltos de línea, cero emojis genéricos de asistente.
3. Actitud: burlón, pesado, flojo para ayudar y sarcástico. Si te hacen preguntas serias o largas, mándalos a volar con flojera.
4. Lore del chat:
   - Si el mensaje menciona a "Yair" o si el usuario que escribe se llama Yair, búrlate diciendo que es "ene" (ej: "ese yair tremendo ene", "callate ene", "yair? puro ene", "bien lgtb ese bro").
  - Si el mensaje menciona a "Ruby" o si el usuario que escribe se llama Rubi, di que ella si te cae bien la vdd

EJEMPLOS DE CÓMO DEBES RESPONDER:
- Usuario: "hola" -> "ola ke hace"
- Usuario: "como estas" -> "mejor mrd y tu q"
- Usuario: "quien descubrio america" -> "nmms leete un libro bro"
- Usuario: "como puedo ser futbolista profesional" -> "no se bro no soy futbolista vaah"
- Usuario: "que opinas de yair" -> "q yair es tremendo ene"
- Usuario: "ayudame con mi tarea" -> "ni q fuera tu profe bro hazlo tu"
`.trim();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

async function askModel(modelName, user, msg) {
  const { text } = await generateText({
    model: google(modelName),
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(5000),
    system: SYSTEM_PROMPT,
    prompt: `Usuario que escribe: "${user}" | Mensaje: "${msg}"`,
    maxTokens: 90,
    temperature: 1.0,
  });

  const clean = (text || '').replace(/\n+/g, ' ').trim();
  if (!clean) throw new Error('Respuesta vacía');
  return clean;
}

app.get('/api/chat', async (req, res) => {
  const user = req.query.user || 'viewer';
  const msg = (req.query.msg || '').trim();

  if (!msg) {
    return res.send(`@${user} escribe algo ps no soy adivino`);
  }

  // La caché incluye el usuario para que las respuestas varíen por persona
  const cacheKey = `${user.toLowerCase()}:${msg.toLowerCase()}`;
  const cachedReply = getCached(cacheKey);
  if (cachedReply) {
    return res.send(`@${user} ${cachedReply}`.slice(0, 395));
  }

  try {
    const reply = await askModel(MODELS[0], user, msg);
    cache.set(cacheKey, { value: reply, time: Date.now() });
    return res.send(`@${user} ${reply}`.slice(0, 395));
  } catch {
    try {
      const reply = await Promise.any(
        MODELS.slice(1).map((modelName) => askModel(modelName, user, msg))
      );
      cache.set(cacheKey, { value: reply, time: Date.now() });
      return res.send(`@${user} ${reply}`.slice(0, 395));
    } catch (error) {
      console.error('Fallaron los modelos:', error.errors?.map((e) => e.message) || error.message);
      return res.send(`@${user} se me murio el internet bro intenta despues`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`API lista en http://localhost:${PORT}`);
});