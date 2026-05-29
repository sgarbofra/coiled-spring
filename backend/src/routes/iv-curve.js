const express = require('express');
const router = express.Router();

const ivCurveService = require('../services/iv-curve-service');

router.get('/', async (req, res, next) => {
  try {
    const { underlying, optionType } = req.query;

    if (!underlying || !optionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query params: underlying, optionType'
      });
    }

    const data = await ivCurveService.getIvCurve({
      underlying: String(underlying).toUpperCase(),
      optionType: String(optionType).toLowerCase()
    });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;