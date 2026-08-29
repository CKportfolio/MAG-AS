const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { getDashboardData } = require('../services/dashboardService');

// GET /api/dashboard
router.get('/', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, groupId } = req.query;
  const data = await getDashboardData({ dateFrom, dateTo, groupId });
  res.json(data);
}));

module.exports = router;
