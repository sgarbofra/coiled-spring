"use client";

import React, { useMemo, useState } from "react";

type Watchlist = {
  id: string;
  name: string;
};

type SavedOption = {
  id: string;
  symbol: string;
  expiry: string;
  strike: number;
  type: "CALL" | "PUT";
  premium: number;
  iv: number;
  ivRank: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  openInterest: number;
  volume: number;
  bidAskSpread: number;
};

const initialWatchlists: Watchlist[] = [
  { id: "wl-1", name: "Main LEAPS" },
  { id: "wl-2", name: "High IV" },
  { id: "wl-3", name: "Earnings Plays" },
];

const initialOptions: Record<string, SavedOption[]> = {
  "wl-1": [
    {
      id: "opt-1",
      symbol: "AAPL",
      expiry: "2027-01-15",
      strike: 200,
      type: "CALL",
      premium: 14.2,
      iv: 28.4,
      ivRank: 52,
      delta: 0.61,
      gamma: 0.03,
      vega: 0.19,
      theta: -0.04,
      openInterest: 8421,
      volume: 311,
      bidAskSpread: 0.18,
    },
  ],
  "wl-2": [],
  "wl-3": [],
};

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(initialWatchlists);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(
    initialWatchlists[0]?.id ?? ""
  );
  const [optionsByWatchlist, setOptionsByWatchlist] =
    useState<Record<string, SavedOption[]>>(initialOptions);

  const activeOptions = useMemo(
    () => optionsByWatchlist[activeWatchlistId] ?? [],
    [optionsByWatchlist, activeWatchlistId]
  );

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId);

  const createWatchlist = () => {
    const name = `Watchlist ${watchlists.length + 1}`;
    const id = `wl-${Date.now()}`;
    setWatchlists((prev) => [...prev, { id, name }]);
    setOptionsByWatchlist((prev) => ({ ...prev, [id]: [] }));
    setActiveWatchlistId(id);
  };

  const renameWatchlist = () => {
    if (!activeWatchlist) return;
    const name = prompt("Nuovo nome watchlist", activeWatchlist.name);
    if (!name?.trim()) return;
    setWatchlists((prev) =>
      prev.map((w) => (w.id === activeWatchlist.id ? { ...w, name: name.trim() } : w))
    );
  };

  const deleteWatchlist = () => {
    if (!activeWatchlist) return;
    const ok = confirm(`Eliminare "${activeWatchlist.name}"?`);
    if (!ok) return;
    setWatchlists((prev) => {
      const next = prev.filter((w) => w.id !== activeWatchlist.id);
      setActiveWatchlistId(next[0]?.id ?? "");
      return next;
    });
    setOptionsByWatchlist((prev) => {
      const next = { ...prev };
      delete next[activeWatchlist.id];
      return next;
    });
  };

  const addSelected = () => {
    if (!activeWatchlistId) return;
    const newOption: SavedOption = {
      id: `opt-${Date.now()}`,
      symbol: "NVDA",
      expiry: "2027-01-15",
      strike: 900,
      type: "CALL",
      premium: 42.5,
      iv: 31.2,
      ivRank: 66,
      delta: 0.58,
      gamma: 0.02,
      vega: 0.24,
      theta: -0.06,
      openInterest: 9122,
      volume: 514,
      bidAskSpread: 0.22,
    };
    setOptionsByWatchlist((prev) => ({
      ...prev,
      [activeWatchlistId]: [...(prev[activeWatchlistId] ?? []), newOption],
    }));
  };

  const removeSelected = () => {
    if (!activeWatchlistId) return;
    setOptionsByWatchlist((prev) => ({
      ...prev,
      [activeWatchlistId]: (prev[activeWatchlistId] ?? []).slice(0, -1),
    }));
  };

  const moveToAnotherWatchlist = () => {
    if (!activeWatchlistId) return;
    const target = watchlists.find((w) => w.id !== activeWatchlistId);
    if (!target) return;
    setOptionsByWatchlist((prev) => {
      const source = [...(prev[activeWatchlistId] ?? [])];
      const moved = source.pop();
      if (!moved) return prev;
      return {
        ...prev,
        [activeWatchlistId]: source,
        [target.id]: [...(prev[target.id] ?? []), moved],
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-800 bg-slate-900 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Watchlists</h1>
            <button
              onClick={createWatchlist}
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950"
            >
              Create
            </button>
          </div>

          <div className="space-y-2">
            {watchlists.map((watchlist) => (
              <button
                key={watchlist.id}
                onClick={() => setActiveWatchlistId(watchlist.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  watchlist.id === activeWatchlistId
                    ? "border-emerald-400 bg-slate-800"
                    : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {watchlist.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="p-4 lg:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {activeWatchlist?.name ?? "No watchlist selected"}
              </h2>
              <p className="text-sm text-slate-400">
                Saved options, alerts and LEAPS metrics.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={renameWatchlist} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
                Rename
              </button>
              <button onClick={deleteWatchlist} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
                Delete
              </button>
              <button onClick={addSelected} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
                Add selected
              </button>
              <button onClick={removeSelected} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
                Remove selected
              </button>
              <button onClick={moveToAnotherWatchlist} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
                Move to another watchlist
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            {activeOptions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No saved options in this watchlist.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Strike</th>
                      <th className="px-4 py-3">Premium</th>
                      <th className="px-4 py-3">IV</th>
                      <th className="px-4 py-3">IV Rank</th>
                      <th className="px-4 py-3">Delta</th>
                      <th className="px-4 py-3">Gamma</th>
                      <th className="px-4 py-3">Vega</th>
                      <th className="px-4 py-3">Theta</th>
                      <th className="px-4 py-3">OI</th>
                      <th className="px-4 py-3">Vol</th>
                      <th className="px-4 py-3">Spread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOptions.map((opt) => (
                      <tr key={opt.id} className="border-b border-slate-800">
                        <td className="px-4 py-3">{opt.symbol}</td>
                        <td className="px-4 py-3">{opt.expiry}</td>
                        <td className="px-4 py-3">{opt.type}</td>
                        <td className="px-4 py-3">{opt.strike}</td>
                        <td className="px-4 py-3">{opt.premium}</td>
                        <td className="px-4 py-3">{opt.iv}</td>
                        <td className="px-4 py-3">{opt.ivRank}</td>
                        <td className="px-4 py-3">{opt.delta}</td>
                        <td className="px-4 py-3">{opt.gamma}</td>
                        <td className="px-4 py-3">{opt.vega}</td>
                        <td className="px-4 py-3">{opt.theta}</td>
                        <td className="px-4 py-3">{opt.openInterest}</td>
                        <td className="px-4 py-3">{opt.volume}</td>
                        <td className="px-4 py-3">{opt.bidAskSpread}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}