import express from "express"
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/chat', (req, res) => {
  const user = req.query.user || 'viewer';
  const msg = (req.query.msg || '').trim();

  if (!msg) {
    return res.send(`${user}, escribe algo después del comando.`);
  }

  return res.send(`@${user}: recibí "${msg}" (API Node activa)`);
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});