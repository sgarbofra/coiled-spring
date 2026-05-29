const { PrismaClient, Prisma } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

function toDecimal(value) {
  if (value === null || value === undefined || value === '') return null;
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function toDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

async function listWatchlists(userId) {
  return prisma.watchlist.findMany({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    include: {
      items: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
}

async function getWatchlistById(userId, watchlistId) {
  return prisma.watchlist.findFirst({
    where: {
      id: watchlistId,
      userId,
    },
    include: {
      items: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
}

async function createWatchlist({ userId, name }) {
  const cleanName = String(name || '').trim();

  const existingActive = await prisma.watchlist.findFirst({
    where: { userId, isActive: true },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    if (!existingActive) {
      await tx.watchlist.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
    }

    return tx.watchlist.create({
      data: {
        userId,
        name: cleanName,
        isActive: !existingActive,
      },
    });
  });
}

async function updateWatchlist(watchlistId, { userId, name, isActive }) {
  const existing = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  });

  if (!existing) return null;

  const data = {};

  if (typeof name === 'string' && name.trim()) {
    data.name = name.trim();
  }

  if (typeof isActive === 'boolean') {
    data.isActive = isActive;
  }

  if (Object.keys(data).length === 0) {
    return prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
      include: {
        items: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
  }

  return prisma.watchlist.update({
    where: { id: watchlistId },
    data,
  });
}

async function deleteWatchlist(watchlistId, userId) {
  const existing = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  });

  if (!existing) return false;

  await prisma.watchlist.delete({
    where: { id: watchlistId },
  });

  return true;
}

async function activateWatchlist({ userId, watchlistId }) {
  const existing = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  });

  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    await tx.watchlist.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    return tx.watchlist.update({
      where: { id: watchlistId },
      data: { isActive: true },
    });
  });
}

async function listWatchlistItems(watchlistId, userId) {
  const existing = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  });

  if (!existing) return null;

  return prisma.watchlistItem.findMany({
    where: { watchlistId, userId },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

async function addItem({ watchlistId, userId, item }) {
  const existing = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  });

  if (!existing) return null;

  if (!item || !item.contractSymbol) {
    throw new Error('contractSymbol is required');
  }

  const contractSymbol = String(item.contractSymbol).trim();
  const underlying = String(item.underlying || '').trim();

  const payload = {
    watchlistId,
    userId,
    underlying,
    contractSymbol,
    expiry: toDate(item.expiry),
    strike: toDecimal(item.strike),
    optionType: item.optionType,
    premium: toDecimal(item.premium),
    iv: toDecimal(item.iv),
    ivRank: toDecimal(item.ivRank),
    ivPercentile: toDecimal(item.ivPercentile),
    ivHistoricalMean: toDecimal(item.ivHistoricalMean),
    ivDistanceFromMean: toDecimal(item.ivDistanceFromMean),
    delta: toDecimal(item.delta),
    gamma: toDecimal(item.gamma),
    vega: toDecimal(item.vega),
    theta: toDecimal(item.theta),
    openInterest: item.openInterest ?? null,
    volume: item.volume ?? null,
    bid: toDecimal(item.bid),
    ask: toDecimal(item.ask),
    spread: toDecimal(item.spread),
    historicalIvMean: toDecimal(item.historicalIvMean),
    historicalIvStdDev: toDecimal(item.historicalIvStdDev),
    theoreticalPnl: toDecimal(item.theoreticalPnl),
    alertState: item.alertState || 'NONE',
    alertNotes: item.alertNotes ?? null,
    lastSeenAt: toDate(item.lastSeenAt),
  };

  return prisma.watchlistItem.upsert({
    where: {
      watchlistId_contractSymbol: {
        watchlistId,
        contractSymbol,
      },
    },
    create: payload,
    update: {
      ...payload,
      updatedAt: new Date(),
    },
  });
}

async function removeItem({ watchlistId, itemId, userId }) {
  const existing = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  });

  if (!existing) return false;

  const deleted = await prisma.watchlistItem.deleteMany({
    where: {
      id: itemId,
      watchlistId,
      userId,
    },
  });

  return deleted.count > 0;
}

module.exports = {
  listWatchlists,
  getWatchlistById,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  activateWatchlist,
  listWatchlistItems,
  addItem,
  removeItem,
};