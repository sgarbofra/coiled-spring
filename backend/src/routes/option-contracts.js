const express = require('express');
const requireAuth = require('../middleware/require-auth');
const state = require('../db/mock-db');

const router = express.Router();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getNextId(table) {
  return state.nextId(table);
}

router.get('/', requireAuth, (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      option_contracts: clone(state.option_contracts),
    });
  } catch (error) {
    console.log('OPTION CONTRACTS GET ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const optionContract = state.option_contracts.find((item) => item.id === id);

    if (!optionContract) {
      return res.status(404).json({
        success: false,
        error: 'Option contract not found',
      });
    }

    return res.status(200).json({
      success: true,
      option_contract: clone(optionContract),
    });
  } catch (error) {
    console.log('OPTION CONTRACT GET ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const {
      underlying,
      option_type,
      expiration,
      strike,
      multiplier = 100,
      exchange = 'SMART',
      symbol_key,
    } = req.body;

    if (!underlying || !option_type || !expiration || strike == null || !symbol_key) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const newOptionContract = {
      id: getNextId('option_contracts'),
      underlying: String(underlying).trim().toUpperCase(),
      option_type: String(option_type).trim().toLowerCase(),
      expiration: String(expiration),
      strike: Number(strike),
      multiplier: Number(multiplier),
      exchange: String(exchange).trim().toUpperCase(),
      symbol_key: String(symbol_key).trim(),
      created_at: new Date().toISOString(),
    };

    state.option_contracts.push(newOptionContract);

    return res.status(201).json({
      success: true,
      option_contract: clone(newOptionContract),
    });
  } catch (error) {
    console.log('OPTION CONTRACTS POST ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

module.exports = router;