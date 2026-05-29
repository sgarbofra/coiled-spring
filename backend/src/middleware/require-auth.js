module.exports = function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId, userId: req.session.userId };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
  });
};