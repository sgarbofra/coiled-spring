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
    const userId = req.session.userId;

    const watchlists = state.watchlists.filter(
      (watchlist) => watchlist.user_id === userId
    );

    return res.status(200).json({
      success: true,
      watchlists: clone(watchlists),
    });
  } catch (error) {
    console.log('WATCHLISTS GET ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const newWatchlist = {
      id: getNextId('watchlists'),
      user_id: userId,
      name: name.trim(),
      is_active: state.watchlists.filter((w) => w.user_id === userId).length === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.watchlists.push(newWatchlist);

    return res.status(201).json({
      success: true,
      watchlist: clone(newWatchlist),
    });
  } catch (error) {
    console.log('WATCHLISTS POST ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.patch('/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const watchlistId = Number(req.params.id);
    const { name } = req.body;

    const watchlist = state.watchlists.find(
      (w) => w.id === watchlistId && w.user_id === userId
    );

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    watchlist.name = name.trim();
    watchlist.updated_at = new Date().toISOString();

    return res.status(200).json({
      success: true,
      watchlist: clone(watchlist),
    });
  } catch (error) {
    console.log('WATCHLISTS PATCH ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const watchlistId = Number(req.params.id);

    const index = state.watchlists.findIndex(
      (w) => w.id === watchlistId && w.user_id === userId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    const [deleted] = state.watchlists.splice(index, 1);

    state.watchlist_items = state.watchlist_items.filter(
      (item) => item.watchlist_id !== deleted.id
    );

    return res.status(200).json({
      success: true,
      deleted: clone(deleted),
    });
  } catch (error) {
    console.log('WATCHLISTS DELETE ERROR:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

module.exports = router;