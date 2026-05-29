const watchlistsService = require('../services/watchlists-service');

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getWatchlistId(req) {
  return req.params.id;
}

function getItemId(req) {
  return req.params.itemId;
}

function sendBadRequest(res, message) {
  return res.status(400).json({ error: message });
}

function sendUnauthorized(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

function sendNotFound(res, message = 'Not found') {
  return res.status(404).json({ error: message });
}

async function listWatchlists(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlists = await watchlistsService.listWatchlists(userId);
    return res.status(200).json(watchlists);
  } catch (error) {
    return next(error);
  }
}

async function createWatchlist(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const name = String(req.body?.name || '').trim();
    if (!name) return sendBadRequest(res, 'name is required');

    const watchlist = await watchlistsService.createWatchlist({ userId, name });
    return res.status(201).json(watchlist);
  } catch (error) {
    return next(error);
  }
}

async function updateWatchlist(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlistId = getWatchlistId(req);
    const name = req.body?.name;
    const isActive = req.body?.isActive;

    const updated = await watchlistsService.updateWatchlist(watchlistId, {
      userId,
      name,
      isActive,
    });

    if (!updated) {
      return sendNotFound(res, 'Watchlist not found');
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteWatchlist(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlistId = getWatchlistId(req);
    const deleted = await watchlistsService.deleteWatchlist(watchlistId, userId);

    if (!deleted) {
      return sendNotFound(res, 'Watchlist not found');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function activateWatchlist(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlistId = getWatchlistId(req);
    const updated = await watchlistsService.activateWatchlist({ userId, watchlistId });

    if (!updated) {
      return sendNotFound(res, 'Watchlist not found');
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function listWatchlistItems(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlistId = getWatchlistId(req);
    const items = await watchlistsService.listWatchlistItems(watchlistId, userId);

    if (items === null) {
      return sendNotFound(res, 'Watchlist not found');
    }

    return res.status(200).json(items);
  } catch (error) {
    return next(error);
  }
}

async function addItem(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlistId = getWatchlistId(req);
    const item = req.body;

    if (!item || !item.contractSymbol) {
      return sendBadRequest(res, 'contractSymbol is required');
    }

    const created = await watchlistsService.addItem({ watchlistId, userId, item });

    if (!created) {
      return sendNotFound(res, 'Watchlist not found');
    }

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

async function removeItem(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return sendUnauthorized(res);

    const watchlistId = getWatchlistId(req);
    const itemId = getItemId(req);

    const removed = await watchlistsService.removeItem({ watchlistId, itemId, userId });

    if (!removed) {
      return sendNotFound(res, 'Item not found');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  activateWatchlist,
  listWatchlistItems,
  addItem,
  removeItem,
};