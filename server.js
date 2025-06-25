import http from 'http';

const port = process.env.PORT || 8080;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, Azure!\n');
}).listen(port, () => {
  console.log(`Server running on port ${port}`);
});