-- CreateEnum
CREATE TYPE "OptionType" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "AlertState" AS ENUM ('NONE', 'WATCH', 'HOT', 'TRIGGERED', 'PAUSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "underlying" TEXT NOT NULL,
    "contractSymbol" TEXT NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "strike" DECIMAL(12,4) NOT NULL,
    "optionType" "OptionType" NOT NULL,
    "premium" DECIMAL(12,4) NOT NULL,
    "iv" DECIMAL(10,4),
    "ivRank" DECIMAL(10,4),
    "ivPercentile" DECIMAL(10,4),
    "ivHistoricalMean" DECIMAL(10,4),
    "ivDistanceFromMean" DECIMAL(10,4),
    "delta" DECIMAL(10,4),
    "gamma" DECIMAL(10,4),
    "vega" DECIMAL(10,4),
    "theta" DECIMAL(10,4),
    "openInterest" INTEGER,
    "volume" INTEGER,
    "bid" DECIMAL(12,4),
    "ask" DECIMAL(12,4),
    "spread" DECIMAL(12,4),
    "historicalIvMean" DECIMAL(10,4),
    "historicalIvStdDev" DECIMAL(10,4),
    "theoreticalPnl" DECIMAL(12,4),
    "alertState" "AlertState" NOT NULL DEFAULT 'NONE',
    "alertNotes" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_item_snapshots" (
    "id" TEXT NOT NULL,
    "watchlistItemId" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "underlying" TEXT NOT NULL,
    "contractSymbol" TEXT NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "strike" DECIMAL(12,4) NOT NULL,
    "optionType" "OptionType" NOT NULL,
    "premium" DECIMAL(12,4),
    "iv" DECIMAL(10,4),
    "ivRank" DECIMAL(10,4),
    "ivPercentile" DECIMAL(10,4),
    "delta" DECIMAL(10,4),
    "gamma" DECIMAL(10,4),
    "vega" DECIMAL(10,4),
    "theta" DECIMAL(10,4),
    "openInterest" INTEGER,
    "volume" INTEGER,
    "bid" DECIMAL(12,4),
    "ask" DECIMAL(12,4),
    "spread" DECIMAL(12,4),
    "theoreticalPnl" DECIMAL(12,4),
    "alertState" "AlertState" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "watchlist_item_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "watchlists_userId_idx" ON "watchlists"("userId");

-- CreateIndex
CREATE INDEX "watchlists_userId_isActive_idx" ON "watchlists"("userId", "isActive");

-- CreateIndex
CREATE INDEX "watchlist_items_userId_idx" ON "watchlist_items"("userId");

-- CreateIndex
CREATE INDEX "watchlist_items_watchlistId_idx" ON "watchlist_items"("watchlistId");

-- CreateIndex
CREATE INDEX "watchlist_items_userId_watchlistId_idx" ON "watchlist_items"("userId", "watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_watchlistId_contractSymbol_key" ON "watchlist_items"("watchlistId", "contractSymbol");

-- CreateIndex
CREATE INDEX "watchlist_item_snapshots_watchlistItemId_snapshotAt_idx" ON "watchlist_item_snapshots"("watchlistItemId", "snapshotAt");

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_item_snapshots" ADD CONSTRAINT "watchlist_item_snapshots_watchlistItemId_fkey" FOREIGN KEY ("watchlistItemId") REFERENCES "watchlist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
