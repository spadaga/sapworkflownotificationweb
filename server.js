import http from 'http';
import { default as triggerHandler } from './api/trigger.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';


if (process.env.NODE_ENV === undefined) {
    console.log("environment:",process.env.NODE_ENV)
  dotenv.config({ path: '.env.local' });
}
else{
     console.log("environment:",process.env.NODE_ENV)
}

const port = process.env.PORT || 3000;
const publicDir = join(process.cwd(), 'public');

http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const html = await readFile(join(publicDir, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading index.html');
    }
  } else if (req.url === '/api/trigger' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      const data = body ? JSON.parse(body) : {};
      try {
        await triggerHandler(req, res, data);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}).listen(port, () => {
  console.log(`Server running on port ${port}`);
});