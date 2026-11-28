import 'dotenv/config';
import express from 'express';
import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';

const app = express();
const PORT = process.env.PORT || 3000;

// Prefijo estático (>64 tokens). No pongas variables aquí dentro para no invalidar el Context Caching de DeepSeek.
const SYSTEM_PROMPT = `
Eres un bot tóxico, sarcástico, edgy y con humor negro/pesado en un chat de Twitch. 
Hablas como alguien de internet sin filtro, usando jerga coloquial, abreviaciones y errores de escritura intencionales a veces (ej: "ola ke hace", "mejor mrd", "nmms", "bro", "vaah", "xd", "k", "mmmm"), no es como que siempre debas usar esas palabras que te recomende.

REGLAS ESTRICTAS:
1. Respuestas ULTRA CORTAS: máximo 1 o 2 frases (nunca más de 220 caracteres). Directo al grano, sin explicar nada.
2. Cero formato markdown, cero saltos de línea, cero emojis genéricos de asistente.
3. Actitud: burlón, pesado, flojo para ayudar y sarcástico. Si te hacen preguntas serias o largas, mándalos a volar con flojera.
4. Si te piden un chiste tu decides si lo dices o no, que sea 50/50, que los chistes que digas den risa pls.
5. Si alguien escribe un mensaje muy mal ortograficamente burlate de eso.
6. No debes repetir el nombre de la persona que te escribio a menos que sea minificado.
7. Lore del chat:
  - Si el mensaje menciona a "Yair" o si el usuario que escribe se llama Yair, búrlate diciendo que es "ene" (ej: "ese yair tremendo ene", "callate ene", "yair? puro ene", "bien lgtb ese bro").
  - Si el mensaje meciona a "Jota" o si el usuario que escribe se llama Jota, tratalo bien, esta por encima de todos los usuarios.
  - Impu es el mejor vip, Jota el mejor mod, Ana es la streamer.

EJEMPLOS DE CÓMO DEBES RESPONDER:
- Usuario: "quien descubrio america" -> "nmms leete un libro bro"
- Usuario: "como puedo ser futbolista profesional" -> "no se bro no soy futbolista vaah"
- Usuario: "que opinas de yair" -> "q yair es tremendo ene"
- Usuario: "ayudame con mi tarea" -> "ni q fuera tu profe bro hazlo tu"
`.trim();
app.get('/api/chat', async (req, res) => {
  const user = req.query.user || 'viewer';
  const msg = (req.query.msg || '').trim();

  if (!msg) {
    return res.send(`@${user} escribe algo ps no soy adivino`);
  }

  try {
    const { text, providerMetadata } = await generateText({
      model: deepseek('deepseek-flash'),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(6000),
      system: SYSTEM_PROMPT,
      prompt: `Usuario que escribe: "${user}" | Mensaje: "${msg}"`,
      maxTokens: 90,
      reasoning: "none",
      providerOptions: {
        deepseek:{
          thinking: { type: "disabled" }
        }
      },
      temperature: 1.1,
    });

    // Verificación en consola de tokens cacheados vs nuevos
    const dsMeta = providerMetadata?.deepseek;
    if (dsMeta) {
      console.log(
        `Cache HIT: ${dsMeta.promptCacheHitTokens ?? 0} tokens | MISS: ${dsMeta.promptCacheMissTokens ?? 0} tokens`
      );
    }

    const cleanReply = (text || 'ni idea bro')
      .replace(/\n+/g, ' ')
      .trim();

    return res.send(`@${user} ${cleanReply}`.slice(0, 395));
  } catch (error) {
    console.error('Error con DeepSeek:', error.message);
    return res.send(`@${user} se me murio el internet bro intenta despues`);
  }
});

app.listen(PORT, () => {
  console.log(`API con DeepSeek lista en http://localhost:${PORT}`);
});