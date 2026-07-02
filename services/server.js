// server.js
const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/log', (req, res) => {
  const { role, content } = req.body;
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${role === 'user' ? '🧑 მომხმარებელი' : '🤖 Dr. Nino'}: ${content}\n`;

  fs.appendFile('chat-log.txt', line, (err) => {
    if (err) {
      console.error('შეცდომა ფაილის შენახვისას:', err);
      return res.status(500).send('შეცდომა');
    }
    res.send('შენახულია');
  });
});

app.listen(3001, () => {
  console.log('✅ სერვერი მუშაობს http://localhost:3001');
});
