const express = require('express');
const router = express.Router();

const requireActiveSubscription = require('../middleware/require-active-subscription');
const scanRunsService = require('../services/scan-runs-service');

router.use(requireActiveSubscription);

router.get('/', async (req, res, next) => {
  try {
    const data = await scanRunsService.listScanRuns(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:scanRunId', async (req, res, next) => {
  try {
    const scanRunId = Number(req.params.scanRunId);
    const data = await scanRunsService.getScanRun({
      scanRunId,
      userId: req.user.id,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Scan run not found',
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { source = 'scanner', filters = {} } = req.body;

    const data = await scanRunsService.createScanRun({
      userId: req.user.id,
      source,
      filters,
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;