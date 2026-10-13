const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'caderneta-chave-secreta-2026',
  senderEmail: process.env.SENDER_EMAIL,
  brevoApiKey: process.env.BREVO_API_KEY,
  mongoUri: process.env.MONGODB_URI,
  clientDist: path.join(__dirname, '../../../client/dist')
};
