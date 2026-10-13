const mongoose = require('mongoose');
const { mongoUri } = require('./config/env');

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
  status: {
    type: String,
    enum: ['paid', 'pending', 'next_month'],
    default: function defaultExpenseStatus() {
      return this.type === 'expense' ? 'pending' : undefined;
    },
    validate: {
      validator: function validateExpenseStatus(value) {
        const transactionType = this.type || (typeof this.getQuery === 'function' ? this.getQuery().type : undefined);
        return transactionType === 'expense' || value === undefined;
      },
      message: 'Status só pode ser definido para despesas'
    }
  },
  createdAt: { type: Date, default: Date.now }
});
const VerificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } 
});

const VerificationCode = mongoose.model('VerificationCode', VerificationCodeSchema);

const BudgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  limits: { type: Object, default: {} }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Budget = mongoose.model('Budget', BudgetSchema);

async function connectDB() {
  const uri = mongoUri;
  if (!uri) {
    console.warn('MONGODB_URI não configurada.');
    return;
  }
  await mongoose.connect(uri);
  console.log('MongoDB Atlas conectado com sucesso!');
}
module.exports = { connectDB, User, Transaction, Budget, VerificationCode };


