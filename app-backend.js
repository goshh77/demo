const express = require('express');
const app = express();
const port = 5000;

app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: "GKE Shirt", price: 25 },
    { id: 2, name: "GitLab Hoodie", price: 50 }
  ]);
});

app.listen(port, () => {
  console.log(`Backend service listening at http://localhost:${port}`);
});