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
    origin: ["https://admin.socket.io"],
  }
});
const { instrument } = require("@socket.io/admin-ui");
let clientConfig = {
  "cme1": false,
  "cme2": false,
}

instrument(io, {
  auth: false
});

io.on('connection', async (socket) => {
  socket.on('poll', id => {
    socket.join(id);
    socket.channelId = id
    // console.log("join", id, socket.id);
  })

  socket.on('poll:vote', async (value) => {
    let channel = socket.channelId || 0;
    await vote(channel, value);
    io.to(channel).emit('poll:refresh');
    // console.log("poll:vote",channel, value);
  });

  socket.on('poll:data', async (fn) => {
    let channel = socket.channelId || 0;
    fn(await getPoll(channel));
    // console.log("poll:data",channel);
  })

  socket.on('config', async () => {
    io.emit('config:data', clientConfig);
  })

  socket.on("disconnect", () => {
    // console.log("left", socket.id);
  });
});

app.post('/:channel/refresh', async (req, res) => {
  if (!req.body || req.body.key != process.env.KEY) {
    return res.status(404).send('404 not found');
  }
  if (req.body.action == 'clearVotes') {
    io.to(parseInt(req.params.channel)).emit('poll:clear');
    // console.log("poll:refresh:clearVotes", parseInt(req.params.channel));
  }
  io.to(parseInt(req.params.channel)).emit('poll:refresh');
  res.send('OK');
  // console.log("poll:refresh", parseInt(req.params.channel));
});


app.post('/toggle/:key/:channel', async (req, res) => {
  if (!req.body || req.body.key != process.env.KEY) {
    return res.status(404).send('404 not found');
  }
  let channel = parseInt(req.params.channel)
  if (req.params.key == 'cme' && channel === 1) {
    clientConfig.cme1 = !clientConfig.cme1;
    io.to(channel).emit('config:data', clientConfig);
  }
  if (req.params.key == 'cme' && channel === 2) {
    clientConfig.cme2 = !clientConfig.cme2;
    io.to(channel).emit('config:data', clientConfig);
  }
  res.send('OK');
  // console.log("toggle:key:channel", req.params.key, channel);
});

async function vote(channel, value) {
  const client = createClient();
  await client.connect();
  await client.incr(`poll:${channel}:vote:${value}`);
  await client.quit();
}

async function getPoll(channel) {
  if (!channel || channel <= 0) return {};
  const client = createClient();
  await client.connect();
  let data = JSON.parse(await client.get(`poll:${channel}:data`));
  if (data.choices && Array.isArray(data.choices)) {
    for (const i in data.choices) {
      data.choices[i].votes = parseInt(await get(`poll:${channel}:vote:${i}`) || 0);
    }
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