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

router.post('/watchlists/:watchlistId/items', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const watchlistId = Number(req.params.watchlistId);

    const watchlist = state.watchlists.find(
      (w) => w.id === watchlistId && w.user_id === userId
    );

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    const {
      option_contract_id,
      source_scan_id = null,
      status = 'active',
      entry_premium = null,
      entry_iv = null,
      entry_delta = null,
      entry_gamma = null,
      entry_vega = null,
      entry_theta = null,
      quantity = 1,
      notes = null,
    } = req.body;

    if (!option_contract_id) {
      return res.status(400).json({
        success: false,
        error: 'option_contract_id is required',
      });
    }

    const optionContract = state.option_contracts.find(
      (item) => item.id === Number(option_contract_id)
    );

    if (!optionContract) {
      return res.status(404).json({
        success: false,
        error: 'Option contract not found',
      });
    }

    const existing = state.watchlist_items.find(
      (item) =>
        item.watchlist_id === watchlistId &&
        item.option_contract_id === Number(option_contract_id)
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Option contract already in watchlist',
      });
    }

    const newItem = {
      id: getNextId('watchlist_items'),
      watchlist_id: watchlistId,
      option_contract_id: Number(option_contract_id),
      source_scan_id,
      status,
      entry_premium,
      entry_iv,
      entry_delta,
      entry_gamma,
      entry_vega,
      entry_theta,
      quantity: Number(quantity),
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.watchlist_items.push(newItem);

    return res.status(201).json({
      success: true,
      watchlist_item: clone(newItem),
    });
  } catch (error) {
    console.log('WATCHLIST ITEMS POST ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.get('/watchlists/:watchlistId/items', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const watchlistId = Number(req.params.watchlistId);

    const watchlist = state.watchlists.find(
      (w) => w.id === watchlistId && w.user_id === userId
    );

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    const items = state.watchlist_items.filter(
      (item) => item.watchlist_id === watchlistId
    );

    return res.status(200).json({
      success: true,
      watchlist_items: clone(items),
    });
  } catch (error) {
    console.log('WATCHLIST ITEMS GET ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.delete('/watchlist-items/:itemId', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const itemId = Number(req.params.itemId);

    const index = state.watchlist_items.findIndex((item) => {
      const watchlist = state.watchlists.find(
        (w) => w.id === item.watchlist_id && w.user_id === userId
      );
      return item.id === itemId && watchlist;
    });

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist item not found',
      });
    }

    const [deleted] = state.watchlist_items.splice(index, 1);

    return res.status(200).json({
      success: true,
      deleted: clone(deleted),
    });
  } catch (error) {
    console.log('WATCHLIST ITEMS DELETE ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.patch('/watchlist-items/:itemId/move', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const itemId = Number(req.params.itemId);
    const { watchlist_id } = req.body;

    if (!watchlist_id) {
      return res.status(400).json({
        success: false,
        error: 'watchlist_id is required',
      });
    }

    const item = state.watchlist_items.find((entry) => entry.id === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist item not found',
      });
    }

    const targetWatchlist = state.watchlists.find(
      (w) => w.id === Number(watchlist_id) && w.user_id === userId
    );

    if (!targetWatchlist) {
      return res.status(404).json({
        success: false,
        error: 'Target watchlist not found',
      });
    }

    const sourceWatchlist = state.watchlists.find(
      (w) => w.id === item.watchlist_id && w.user_id === userId
    );

    if (!sourceWatchlist) {
      return res.status(403).json({
        success: false,
        error: 'Not allowed',
      });
    }

    item.watchlist_id = Number(watchlist_id);
    item.updated_at = new Date().toISOString();

    return res.status(200).json({
      success: true,
      watchlist_item: clone(item),
    });
  } catch (error) {
    console.log('WATCHLIST ITEMS MOVE ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

module.exports = router;