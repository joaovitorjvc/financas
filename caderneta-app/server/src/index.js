const app = require('./app');
const { port } = require('./config/env');
const { connectDB } = require('./db');

connectDB().catch(err => console.error('Erro ao conectar no MongoDB:', err));

app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
