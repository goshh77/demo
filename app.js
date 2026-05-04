const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

// This is the IP of your GKE Backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.get('/', (req, res) => {
  // Read the static HTML file
  let html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  
  // Inject the real Backend IP into the Javascript in the HTML
  html = html.replace("BACKEND_URL_STR", BACKEND_URL);
  
  res.send(html);
});

app.listen(port);