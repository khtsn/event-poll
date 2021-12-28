const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {
  createClient
} = require('redis');

const {
  Server
} = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', async (socket) => {
  socket.on('poll:vote', async (value) => {
    await vote(value);
    io.emit('refresh');
  });
});

app.get('/refresh', async (req, res) => {
  let data = JSON.parse(await getPoll());
  for (const i in data.choices) {
    data.choices[i].votes = parseInt(await get('poll:vote:' + i) || 0);
  }
  io.emit('poll:update', data);
  res.send('OK');
});

async function vote(value) {
  const client = createClient();
  await client.connect();
  await client.incr('poll:vote:' + value);
  await client.quit();
}

async function getPoll() {
  const client = createClient();
  await client.connect();
  const data = await client.get('poll:data');
  await client.quit();
  return data;
}

async function get(key) {
  const client = createClient();
  await client.connect();
  const data = await client.get(key);
  await client.quit();
  return data;
}

server.listen(8000, () => {
  console.log('listening on *:8000');
});