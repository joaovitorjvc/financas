const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  groupId: { type: String },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: ['income', 'expense'] },
  category: { type: String, required: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const BudgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  limits: { type: Object, default: {} }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Budget = mongoose.model('Budget', BudgetSchema);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI não configurada.');
    return;
  }
  await mongoose.connect(uri);
  console.log('MongoDB Atlas conectado com sucesso!');
}
