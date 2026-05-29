const authService = require('../services/auth-service')

module.exports = function requireActiveSubscription(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    const user = req.session?.userId ? authService.getCurrentUser(req.session.userId) : null
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
    }

    req.user = user
    return next()
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    })
  }

  const user = authService.getCurrentUser(req.session.userId)

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    })
  }

  if (!user.subscriptionActive) {
    return res.status(403).json({
      success: false,
      error: 'Active subscription required',
    })
  }

  req.user = user
  return next()
}