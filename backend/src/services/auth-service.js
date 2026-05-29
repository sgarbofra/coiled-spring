const crypto = require('crypto');

const users = [
  {
    id: 'u_1',
    email: 'demo@coiledspring.app',
    password: 'demo1234',
    name: 'Demo User',
    subscriptionActive: true,
  },
];

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    subscriptionActive: user.subscriptionActive,
  };
}

function findUserByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserById(id) {
  return users.find((u) => u.id === id);
}

function register({ email, password, name }) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const existing = findUserByEmail(email);
  if (existing) {
    const err = new Error('User already exists');
    err.statusCode = 409;
    throw err;
  }

  const user = {
    id: `u_${crypto.randomUUID()}`,
    email: String(email).trim(),
    password: String(password),
    name: name ? String(name).trim() : String(email).split('@')[0],
    subscriptionActive: false,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return sanitizeUser(user);
}

function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  return sanitizeUser(user);
}

function logout() {
  return { success: true };
}

function getCurrentUser(userId) {
  const user = findUserById(userId);
  return sanitizeUser(user);
}

function activateSubscription(userId) {
  const user = findUserById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  user.subscriptionActive = true;
  return sanitizeUser(user);
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  activateSubscription,
  sanitizeUser,
};