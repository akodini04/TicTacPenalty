const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory score cache (infrastructure ready for DB integration)
let leaderboard = [
  { team: 'HU', name: 'Hungary 🇭🇺', trophies: 1, wins: 4, date: new Date().toISOString() }
];

// API Endpoints for DB Infrastructure, **hello there**
app.get('/api/leaderboard', (req, res) => {
  res.json({ success: true, leaderboard });
});

app.post('/api/leaderboard', (req, res) => {
  const { team, name, wins } = req.body;
  if (team && name) {
    const entry = { team, name, wins: wins || 4, trophies: 1, date: new Date().toISOString() };
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.wins - a.wins);
    return res.json({ success: true, leaderboard });
  }
  res.status(400).json({ success: false, message: 'Invalid data' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Penalty Tic-Tac-Toe World Cup' });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚽ Penalty Tic-Tac-Toe World Cup running on http://localhost:${PORT}`);
});
