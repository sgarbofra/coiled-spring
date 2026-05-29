import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  listWatchlists,
  listWatchlistItems,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  addWatchlistItems,
  removeWatchlistItems,
  moveWatchlistItems,
} from '../services/watchlists-api';

const STORAGE_KEY = 'watchlist-portfolio-table-state';

const defaultSort = { key: 'underlying', direction: 'asc' };
const defaultFilters = {
  search: '',
  underlying: '',
  alertState: '',
  ivMin: '',
  ivMax: '',
  deltaMin: '',
  deltaMax: '',
  premiumMin: '',
  premiumMax: '',
};

function loadTableState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      sort: parsed.sort || defaultSort,
      filters: { ...defaultFilters, ...(parsed.filters || {}) },
    };
  } catch (err) {
    return null;
  }
}

export default function WatchlistPortfolioPage() {
  const persisted = useMemo(() => loadTableState(), []);
  const [watchlists, setWatchlists] = useState([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loadingWatchlists, setLoadingWatchlists] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  const [removingItems, setRemovingItems] = useState(false);
  const [movingItems, setMovingItems] = useState(false);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [creatingWatchlist, setCreatingWatchlist] = useState(false);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameWatchlistName, setRenameWatchlistName] = useState('');
  const [renamingWatchlist, setRenamingWatchlist] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingWatchlist, setDeletingWatchlist] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetWatchlistId, setTargetWatchlistId] = useState('');

  const [sortConfig, setSortConfig] = useState(persisted?.sort || defaultSort);
  const [filters, setFilters] = useState(persisted?.filters || defaultFilters);

  const createTriggerRef = useRef(null);
  const renameTriggerRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const addTriggerRef = useRef(null);
  const moveTriggerRef = useRef(null);

  const createNameRef = useRef(null);
  const renameNameRef = useRef(null);
  const moveSelectRef = useRef(null);
  const addConfirmRef = useRef(null);
  const deleteConfirmRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sort: sortConfig, filters })
      );
    } catch (err) {}
  }, [sortConfig, filters]);

  const restoreFocus = (ref) => {
    requestAnimationFrame(() => ref.current?.focus?.());
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    restoreFocus(createTriggerRef);
  };

  const closeRenameModal = () => {
    setRenameModalOpen(false);
    restoreFocus(renameTriggerRef);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    restoreFocus(deleteTriggerRef);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    restoreFocus(addTriggerRef);
  };

  const closeMoveModal = () => {
    setMoveModalOpen(false);
    restoreFocus(moveTriggerRef);
  };

  useEffect(() => {
    let alive = true;

    async function loadWatchlists() {
      try {
        setLoadingWatchlists(true);
        setError('');

        const response = await listWatchlists();
        const data = response.watchlists || [];

        if (!alive) return;

        setWatchlists(data);

        const firstActive = data.find((w) => w.isActive) || data[0] || null;
        setActiveWatchlistId(firstActive ? firstActive.id : null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load watchlists');
      } finally {
        if (alive) setLoadingWatchlists(false);
      }
    }

    loadWatchlists();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadItems() {
      if (!activeWatchlistId) {
        setItems([]);
        setSelectedItem(null);
        setSelectedItemIds([]);
        return;
      }

      try {
        setLoadingItems(true);
        setError('');

        const response = await listWatchlistItems(activeWatchlistId);
        if (!alive) return;

        setItems(response.items || []);
        setSelectedItem(null);
        setSelectedItemIds([]);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load watchlist items');
      } finally {
        if (alive) setLoadingItems(false);
      }
    }

    loadItems();

    return () => {
      alive = false;
    };
  }, [activeWatchlistId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (moveModalOpen) return closeMoveModal();
        if (addModalOpen) return closeAddModal();
        if (deleteModalOpen) return closeDeleteModal();
        if (renameModalOpen) return closeRenameModal();
        if (createModalOpen) return closeCreateModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveModalOpen, addModalOpen, deleteModalOpen, renameModalOpen, createModalOpen]);

  useEffect(() => {
    if (createModalOpen) createNameRef.current?.focus?.();
  }, [createModalOpen]);

  useEffect(() => {
    if (renameModalOpen) renameNameRef.current?.focus?.();
  }, [renameModalOpen]);

  useEffect(() => {
    if (moveModalOpen) moveSelectRef.current?.focus?.();
  }, [moveModalOpen]);

  useEffect(() => {
    if (addModalOpen) addConfirmRef.current?.focus?.();
  }, [addModalOpen]);

  useEffect(() => {
    if (deleteModalOpen) deleteConfirmRef.current?.focus?.();
  }, [deleteModalOpen]);

  const activeWatchlist = useMemo(
    () => watchlists.find((w) => w.id === activeWatchlistId) || null,
    [watchlists, activeWatchlistId]
  );

  const filteredSortedItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const underlying = filters.underlying.trim().toLowerCase();
    const alertState = filters.alertState.trim().toLowerCase();

    const toNum = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    let next = [...items].filter((item) => {
      const itemUnderlying = String(item.underlying || '').toLowerCase();
      const itemAlert = String(item.alertState || '').toLowerCase();
      const iv = toNum(item.iv);
      const delta = toNum(item.delta);
      const premium = toNum(item.premium);
      const searchable = [
        item.underlying,
        item.contractSymbol,
        item.expiry,
        item.optionType,
        item.alertState,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (search && !searchable.includes(search)) return false;
      if (underlying && !itemUnderlying.includes(underlying)) return false;
      if (alertState && !itemAlert.includes(alertState)) return false;

      const ivMin = toNum(filters.ivMin);
      const ivMax = toNum(filters.ivMax);
      const deltaMin = toNum(filters.deltaMin);
      const deltaMax = toNum(filters.deltaMax);
      const premiumMin = toNum(filters.premiumMin);
      const premiumMax = toNum(filters.premiumMax);

      if (ivMin !== null && (iv === null || iv < ivMin)) return false;
      if (ivMax !== null && (iv === null || iv > ivMax)) return false;
      if (deltaMin !== null && (delta === null || delta < deltaMin)) return false;
      if (deltaMax !== null && (delta === null || delta > deltaMax)) return false;
      if (premiumMin !== null && (premium === null || premium < premiumMin)) return false;
      if (premiumMax !== null && (premium === null || premium > premiumMax)) return false;

      return true;
    });

    const dir = sortConfig.direction === 'desc' ? -1 : 1;
    const key = sortConfig.key;

    next.sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];

      const an = Number(av);
      const bn = Number(bv);
      const bothNumeric = Number.isFinite(an) && Number.isFinite(bn);

      if (bothNumeric) return (an - bn) * dir;

      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      if (as < bs) return -1 * dir;
      if (as > bs) return 1 * dir;
      return 0;
    });

    return next;
  }, [items, filters, sortConfig]);

  const handleSelectWatchlist = (id) => {
    setActiveWatchlistId(id);
    setMobileSidebarOpen(false);
  };

  const handleCreateWatchlist = async (e) => {
    e.preventDefault();

    const name = newWatchlistName.trim();
    if (!name) return;

    try {
      setCreatingWatchlist(true);
      setError('');

      const response = await createWatchlist(name);
      const created = response.watchlist;

      setWatchlists((prev) => [created, ...prev]);
      setActiveWatchlistId(created.id);
      setNewWatchlistName('');
      closeCreateModal();
    } catch (err) {
      setError(err.message || 'Failed to create watchlist');
    } finally {
      setCreatingWatchlist(false);
    }
  };

  const openRenameModal = () => {
    if (!activeWatchlist) return;
    setRenameWatchlistName(activeWatchlist.name || '');
    setRenameModalOpen(true);
  };

  const handleRenameWatchlist = async (e) => {
    e.preventDefault();

    if (!activeWatchlist) return;

    const name = renameWatchlistName.trim();
    if (!name) return;

    try {
      setRenamingWatchlist(true);
      setError('');

      const response = await updateWatchlist(activeWatchlist.id, { name });
      const updated = response.watchlist;

      setWatchlists((prev) =>
        prev.map((w) => (w.id === updated.id ? updated : w))
      );
      setRenameWatchlistName('');
      closeRenameModal();
    } catch (err) {
      setError(err.message || 'Failed to rename watchlist');
    } finally {
      setRenamingWatchlist(false);
    }
  };

  const openDeleteModal = () => {
    if (!activeWatchlist) return;
    setDeleteModalOpen(true);
  };

  const handleDeleteWatchlist = async () => {
    if (!activeWatchlist) return;

    try {
      setDeletingWatchlist(true);
      setError('');

      await deleteWatchlist(activeWatchlist.id);

      setWatchlists((prev) => {
        const next = prev.filter((w) => w.id !== activeWatchlist.id);
        const nextActive = next.find((w) => w.isActive) || next[0] || null;
        setActiveWatchlistId(nextActive ? nextActive.id : null);
        return next;
      });

      setItems([]);
      setSelectedItem(null);
      setSelectedItemIds([]);
      closeDeleteModal();
    } catch (err) {
      setError(err.message || 'Failed to delete watchlist');
    } finally {
      setDeletingWatchlist(false);
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const clearSelection = () => {
    setSelectedItemIds([]);
  };

  const openAddModal = () => {
    if (!activeWatchlist || selectedItemIds.length === 0) return;
    setAddModalOpen(true);
  };

  const handleAddSelected = async () => {
    if (!activeWatchlist || selectedItemIds.length === 0) return;

    try {
      setAddingItems(true);
      setError('');

      await addWatchlistItems(activeWatchlist.id, selectedItemIds);

      const response = await listWatchlistItems(activeWatchlist.id);
      setItems(response.items || []);
      setSelectedItemIds([]);
      setSelectedItem(null);
      closeAddModal();
    } catch (err) {
      setError(err.message || 'Failed to add selected items');
    } finally {
      setAddingItems(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (!activeWatchlist || selectedItemIds.length === 0) return;

    try {
      setRemovingItems(true);
      setError('');

      await removeWatchlistItems(activeWatchlist.id, selectedItemIds);

      const response = await listWatchlistItems(activeWatchlist.id);
      setItems(response.items || []);
      setSelectedItemIds([]);
      setSelectedItem(null);
    } catch (err) {
      setError(err.message || 'Failed to remove selected items');
    } finally {
      setRemovingItems(false);
    }
  };

  const openMoveModal = () => {
    if (!activeWatchlist || selectedItemIds.length === 0) return;
    setTargetWatchlistId('');
    setMoveModalOpen(true);
  };

  const handleMoveSelected = async () => {
    if (!activeWatchlist || selectedItemIds.length === 0 || !targetWatchlistId) return;
    if (targetWatchlistId === activeWatchlist.id) return;

    try {
      setMovingItems(true);
      setError('');

      await moveWatchlistItems(activeWatchlist.id, targetWatchlistId, selectedItemIds);

      const response = await listWatchlistItems(activeWatchlist.id);
      setItems(response.items || []);
      setSelectedItemIds([]);
      setSelectedItem(null);
      closeMoveModal();
    } catch (err) {
      setError(err.message || 'Failed to move selected items');
    } finally {
      setMovingItems(false);
    }
  };

  const destinationWatchlists = watchlists.filter((w) => w.id !== activeWatchlist?.id);

  const setSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const resetTableState = () => {
    setSortConfig(defaultSort);
    setFilters(defaultFilters);
  };

  return (
    <div className="watchlist-page">
      <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Watchlists</h2>
          <button onClick={() => setMobileSidebarOpen(false)} className="mobile-close">
            ×
          </button>
        </div>

        <button
          className="primary-btn"
          onClick={(e) => {
            createTriggerRef.current = e.currentTarget;
            setCreateModalOpen(true);
          }}
        >
          Create watchlist
        </button>

        <div className="watchlist-list">
          {loadingWatchlists ? (
            <div className="muted">Loading watchlists...</div>
          ) : watchlists.length === 0 ? (
            <div className="muted">No watchlists found</div>
          ) : (
            watchlists.map((watchlist) => (
              <button
                key={watchlist.id}
                className={`watchlist-item ${watchlist.id === activeWatchlistId ? 'active' : ''}`}
                onClick={() => handleSelectWatchlist(watchlist.id)}
              >
                <span>{watchlist.name}</span>
                {watchlist.isActive ? <span className="badge">Active</span> : null}
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="content">
        <header className="page-header">
          <div className="page-header-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open watchlists sidebar"
            >
              ☰
            </button>
            <div>
              <h1>{activeWatchlist ? activeWatchlist.name : 'Watchlists'}</h1>
              <p>Saved LEAPS options and watchlist state.</p>
            </div>
          </div>

          <div className="toolbar">
            <button
              onClick={(e) => {
                renameTriggerRef.current = e.currentTarget;
                openRenameModal();
              }}
              disabled={!activeWatchlist}
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                deleteTriggerRef.current = e.currentTarget;
                openDeleteModal();
              }}
              disabled={!activeWatchlist}
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                addTriggerRef.current = e.currentTarget;
                openAddModal();
              }}
              disabled={!activeWatchlist || selectedItemIds.length === 0}
            >
              Add selected
            </button>
            <button
              onClick={(e) => {
                moveTriggerRef.current = e.currentTarget;
                handleRemoveSelected();
              }}
              disabled={!activeWatchlist || selectedItemIds.length === 0 || removingItems}
            >
              {removingItems ? 'Removing...' : 'Remove selected'}
            </button>
            <button
              onClick={(e) => {
                moveTriggerRef.current = e.currentTarget;
                openMoveModal();
              }}
              disabled={!activeWatchlist || selectedItemIds.length === 0}
            >
              Move to another watchlist
            </button>
          </div>
        </header>

        <section className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Saved options</h3>
              <span>{filteredSortedItems.length} items</span>
            </div>
            <button type="button" onClick={resetTableState}>
              Reset table view
            </button>
          </div>

          <div className="filter-bar">
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search underlying, contract, expiry..."
            />
            <input
              value={filters.underlying}
              onChange={(e) => setFilters((prev) => ({ ...prev, underlying: e.target.value }))}
              placeholder="Underlying"
            />
            <input
              value={filters.alertState}
              onChange={(e) => setFilters((prev) => ({ ...prev, alertState: e.target.value }))}
              placeholder="Alert state"
            />
            <input
              value={filters.ivMin}
              onChange={(e) => setFilters((prev) => ({ ...prev, ivMin: e.target.value }))}
              placeholder="IV min"
              inputMode="decimal"
            />
            <input
              value={filters.ivMax}
              onChange={(e) => setFilters((prev) => ({ ...prev, ivMax: e.target.value }))}
              placeholder="IV max"
              inputMode="decimal"
            />
            <input
              value={filters.deltaMin}
              onChange={(e) => setFilters((prev) => ({ ...prev, deltaMin: e.target.value }))}
              placeholder="Delta min"
              inputMode="decimal"
            />
            <input
              value={filters.deltaMax}
              onChange={(e) => setFilters((prev) => ({ ...prev, deltaMax: e.target.value }))}
              placeholder="Delta max"
              inputMode="decimal"
            />
            <input
              value={filters.premiumMin}
              onChange={(e) => setFilters((prev) => ({ ...prev, premiumMin: e.target.value }))}
              placeholder="Premium min"
              inputMode="decimal"
            />
            <input
              value={filters.premiumMax}
              onChange={(e) => setFilters((prev) => ({ ...prev, premiumMax: e.target.value }))}
              placeholder="Premium max"
              inputMode="decimal"
            />
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          {loadingItems ? (
            <div className="muted" style={{ marginTop: 16 }}>
              Loading items...
            </div>
          ) : filteredSortedItems.length === 0 ? (
            <div className="muted" style={{ marginTop: 16 }}>
              No items match the current filters
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={filteredSortedItems.length > 0 && selectedItemIds.length === filteredSortedItems.length}
                        onChange={() => {
                          if (selectedItemIds.length === filteredSortedItems.length) {
                            clearSelection();
                          } else {
                            setSelectedItemIds(filteredSortedItems.map((item) => item.id));
                          }
                        }}
                      />
                    </th>
                    <th onClick={() => setSort('underlying')}>Underlying</th>
                    <th onClick={() => setSort('contractSymbol')}>Contract</th>
                    <th onClick={() => setSort('expiry')}>Expiry</th>
                    <th onClick={() => setSort('strike')}>Strike</th>
                    <th onClick={() => setSort('optionType')}>Type</th>
                    <th onClick={() => setSort('premium')}>Premium</th>
                    <th onClick={() => setSort('iv')}>IV</th>
                    <th onClick={() => setSort('delta')}>Delta</th>
                    <th onClick={() => setSort('openInterest')}>OI</th>
                    <th onClick={() => setSort('volume')}>Volume</th>
                    <th onClick={() => setSort('spread')}>Spread</th>
                    <th onClick={() => setSort('theoreticalPnl')}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="row-clickable"
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                        />
                      </td>
                      <td>{item.underlying}</td>
                      <td>{item.contractSymbol}</td>
                      <td>{item.expiry}</td>
                      <td>{item.strike}</td>
                      <td>{item.optionType}</td>
                      <td>{item.premium}</td>
                      <td>{item.iv}</td>
                      <td>{item.delta}</td>
                      <td>{item.openInterest}</td>
                      <td>{item.volume}</td>
                      <td>{item.spread}</td>
                      <td>{item.theoreticalPnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedItem ? (
        <aside className="drawer">
          <div className="drawer-header">
            <h3>{selectedItem.underlying}</h3>
            <button onClick={() => setSelectedItem(null)}>Close</button>
          </div>

          <div className="drawer-body">
            <p><strong>Contract:</strong> {selectedItem.contractSymbol}</p>
            <p><strong>Expiry:</strong> {selectedItem.expiry}</p>
            <p><strong>Strike:</strong> {selectedItem.strike}</p>
            <p><strong>Premium:</strong> {selectedItem.premium}</p>
            <p><strong>IV:</strong> {selectedItem.iv}</p>
            <p><strong>Delta:</strong> {selectedItem.delta}</p>
            <p><strong>Gamma:</strong> {selectedItem.gamma}</p>
            <p><strong>Vega:</strong> {selectedItem.vega}</p>
            <p><strong>Theta:</strong> {selectedItem.theta}</p>
            <p><strong>OI:</strong> {selectedItem.openInterest}</p>
            <p><strong>Volume:</strong> {selectedItem.volume}</p>
            <p><strong>Alert:</strong> {selectedItem.alertState}</p>
          </div>
        </aside>
      ) : null}

      {moveModalOpen ? (
        <div className="modal-overlay" onClick={closeMoveModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Move selected</h3>
              <button onClick={closeMoveModal}>×</button>
            </div>

            <p className="muted" style={{ marginTop: 12 }}>
              Move {selectedItemIds.length} selected item(s) from <strong>{activeWatchlist?.name}</strong>?
            </p>

            <label className="modal-label">
              Destination watchlist
              <select
                ref={moveSelectRef}
                value={targetWatchlistId}
                onChange={(e) => setTargetWatchlistId(e.target.value)}
              >
                <option value="">Select destination</option>
                {destinationWatchlists.map((watchlist) => (
                  <option key={watchlist.id} value={watchlist.id}>
                    {watchlist.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="modal-actions">
              <button type="button" onClick={closeMoveModal}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveSelected}
                disabled={movingItems || !targetWatchlistId}
              >
                {movingItems ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createModalOpen ? (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create watchlist</h3>
              <button onClick={closeCreateModal}>×</button>
            </div>

            <form onSubmit={handleCreateWatchlist}>
              <label className="modal-label">
                Name
                <input
                  ref={createNameRef}
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="e.g. Dividends, High IV, Earnings Plays"
                />
              </label>

              <div className="modal-actions">
                <button type="button" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingWatchlist}>
                  {creatingWatchlist ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {renameModalOpen ? (
        <div className="modal-overlay" onClick={closeRenameModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rename watchlist</h3>
              <button onClick={closeRenameModal}>×</button>
            </div>

            <form onSubmit={handleRenameWatchlist}>
              <label className="modal-label">
                Name
                <input
                  ref={renameNameRef}
                  value={renameWatchlistName}
                  onChange={(e) => setRenameWatchlistName(e.target.value)}
                  placeholder="New watchlist name"
                />
              </label>

              <div className="modal-actions">
                <button type="button" onClick={closeRenameModal}>
                  Cancel
                </button>
                <button type="submit" disabled={renamingWatchlist}>
                  {renamingWatchlist ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete watchlist</h3>
              <button onClick={closeDeleteModal}>×</button>
            </div>

            <p className="muted" style={{ marginTop: 12 }}>
              Are you sure you want to delete <strong>{activeWatchlist?.name}</strong>?
              This will also remove all saved items in that watchlist.
            </p>

            <div className="modal-actions">
              <button type="button" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                ref={deleteConfirmRef}
                type="button"
                onClick={handleDeleteWatchlist}
                disabled={deletingWatchlist}
              >
                {deletingWatchlist ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addModalOpen ? (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add selected</h3>
              <button onClick={closeAddModal}>×</button>
            </div>

            <p className="muted" style={{ marginTop: 12 }}>
              Add {selectedItemIds.length} selected item(s) to <strong>{activeWatchlist?.name}</strong>?
            </p>

            <div className="modal-actions">
              <button type="button" onClick={closeAddModal}>
                Cancel
              </button>
              <button
                ref={addConfirmRef}
                type="button"
                onClick={handleAddSelected}
                disabled={addingItems}
              >
                {addingItems ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .watchlist-page { display: flex; min-height: 100vh; background: #0f172a; color: #e2e8f0; }
        .sidebar { width: 280px; padding: 20px; border-right: 1px solid #1e293b; background: #111827; }
        .sidebar-header, .page-header, .table-card-header, .drawer-header, .page-header-left, .modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .watchlist-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
        .watchlist-item { display: flex; justify-content: space-between; padding: 12px; border: 1px solid #334155; background: transparent; color: inherit; border-radius: 10px; cursor: pointer; }
        .watchlist-item.active { background: #1e293b; border-color: #64748b; }
        .badge { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #2563eb; }
        .content { flex: 1; padding: 24px; }
        .toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
        .toolbar button, .primary-btn, .mobile-menu, .mobile-close, .drawer button, .modal button {
          border: 1px solid #334155; background: #1e293b; color: #e2e8f0; padding: 10px 12px; border-radius: 10px; cursor: pointer;
        }
        .primary-btn { width: 100%; margin-top: 16px; background: #2563eb; border-color: #2563eb; }
        .table-card { margin-top: 20px; padding: 16px; border: 1px solid #1e293b; border-radius: 16px; background: #111827; }
        .table-card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .filter-bar { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .filter-bar input { padding: 10px 12px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
        .table-wrapper { overflow-x: auto; margin-top: 16px; }
        table { width: 100%; border-collapse: collapse; min-width: 1100px; }
        th, td { padding: 12px; border-bottom: 1px solid #1e293b; text-align: left; white-space: nowrap; }
        th { cursor: pointer; user-select: none; }
        th:first-child, td:first-child { width: 44px; text-align: center; }
        .row-clickable { cursor: pointer; }
        .row-clickable:hover { background: #0f172a; }
        .drawer { width: 340px; padding: 20px; border-left: 1px solid #1e293b; background: #111827; }
        .drawer-body { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
        .mobile-menu, .mobile-close { display: none; }
        .muted { color: #94a3b8; }
        .error-box { margin-top: 16px; padding: 12px; border-radius: 10px; background: #7f1d1d; color: #fecaca; }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 30;
          padding: 16px;
        }
        .modal {
          width: 100%;
          max-width: 420px;
          background: #111827;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 20px;
        }
        .modal-label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #cbd5e1;
          margin-top: 12px;
        }
        .modal-label input,
        .modal-label select {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }
        @media (max-width: 900px) {
          .watchlist-page { flex-direction: column; }
          .sidebar { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform .2s ease; z-index: 20; }
          .sidebar.open { transform: translateX(0); }
          .content { padding: 16px; }
          .drawer { width: 100%; border-left: 0; border-top: 1px solid #1e293b; }
          .mobile-menu, .mobile-close { display: inline-flex; }
          .filter-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .filter-bar { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}