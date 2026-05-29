const state = require('./mock-db');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function query(text, params = []) {
  throw new Error('Direct SQL queries are disabled in mock mode');
}

async function getClient() {
  throw new Error('Client connections are disabled in mock mode');
}

async function closePool() {
  return true;
}

module.exports = {
  state: clone(state),
  query,
  getClient,
  closePool,
};