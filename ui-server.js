const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve static files from the views directory
app.use(express.static(path.join(__dirname, 'views')));

// Serve the index.html file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Deploykit UI server running on http://localhost:${PORT}`);
});