const express = require('express');
const app = express();
app.use(express.json()) // for parsing application/json
const http = require('http');
const server = http.createServer(app);
const {
  createClient
} = require('redis');
require('dotenv').config()

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
    io.emit('poll:refresh');
  });

  socket.on('poll:data', async (fn) => {
    fn(await getPoll());
  })

  socket.on('connections', () => {
    socket.emit(Object.keys(io.sockets.sockets).length);
  })
});

app.post('/refresh', async (req, res) => {
  if (!req.body || req.body.key != process.env.KEY) {
    return res.status(404).send('404 not found');
  }
  io.emit('poll:refresh');
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
  let data = JSON.parse(await client.get('poll:data'));
  for (const i in data.choices) {
    data.choices[i].votes = parseInt(await get('poll:vote:' + i) || 0);
  }
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