-- Migration: add hv30_parkinson column to hv_snapshots
-- Run: python run_migration.py migrations/add_hv_parkinson.sql
--
-- Aggiunge la colonna hv30_parkinson (Parkinson volatility estimator, usa High/Low)
-- accanto alla HV30 close-to-close già esistente.
-- Nullable per compatibilità con righe esistenti — il job notturno popolerà il valore.

ALTER TABLE hv_snapshots ADD COLUMN hv30_parkinson REAL;
