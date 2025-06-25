import http from 'http';
import { default as triggerHandler } from './api/trigger.js'; // Adjust path if needed

const port = process.env.PORT || 8080;

http.createServer(async (req, res) => {
  if (req.url === '/api/trigger' && req.method === 'POST') {
    // Parse request body
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      const data = body ? JSON.parse(body) : {};
      try {
        await triggerHandler(req, res, data); // Pass req, res, and parsed data
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, Azure!\n');
  }
}).listen(port, () => {
  console.log(`Server running on port ${port}`);
});