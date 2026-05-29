const API_BASE = '/api/watchlists';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    const message = data.error || data.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function listWatchlists() {
  return request('');
}

async function createWatchlist(name) {
  return request('', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

async function updateWatchlist(id, payload) {
  return request(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function deleteWatchlist(id) {
  return request(`/${id}`, {
    method: 'DELETE',
  });
}

async function activateWatchlist(id) {
  return request(`/${id}/activate`, {
    method: 'POST',
  });
}

async function listWatchlistItems(id) {
  return request(`/${id}/items`);
}

async function addWatchlistItems(id, itemIds) {
  return request(`/${id}/items/bulk`, {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  });
}

async function addWatchlistItem(id, item) {
  return request(`/${id}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

async function removeWatchlistItems(id, itemIds) {
  return request(`/${id}/items/remove-bulk`, {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  });
}

async function removeWatchlistItem(id, itemId) {
  return request(`/${id}/items/${itemId}`, {
    method: 'DELETE',
  });
}

async function moveWatchlistItems(id, targetWatchlistId, itemIds) {
  return request(`/${id}/items/move`, {
    method: 'POST',
    body: JSON.stringify({
      targetWatchlistId,
      itemIds,
    }),
  });
}

module.exports = {
  listWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  activateWatchlist,
  listWatchlistItems,
  addWatchlistItems,
  addWatchlistItem,
  removeWatchlistItems,
  removeWatchlistItem,
  moveWatchlistItems,
};