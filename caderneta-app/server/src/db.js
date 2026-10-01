const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data.json');

function readData() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], transactions: [], budgets: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readData, writeData };
