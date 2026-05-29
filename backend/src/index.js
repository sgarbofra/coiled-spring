const express = require('express');
const session = require('express-session');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const watchlistsRoutes = require('./routes/watchlists');
const optionContractsRoutes = require('./routes/option-contracts');
const watchlistItemsRoutes = require('./routes/watchlist-items');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'coiled-spring-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
}));

app.use('/api', authRoutes);
app.use('/api/watchlists', watchlistsRoutes);
app.use('/api/option-contracts', optionContractsRoutes);
app.use('/api', watchlistItemsRoutes);

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'OK',
  });
});

app.use((req, res) => {
  return res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`Coiled Spring backend listening on port ${PORT}`);
});