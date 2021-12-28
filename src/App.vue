<template>
  <div id="app">
    <button @click="vote(0)">Vote A</button>
    <button @click="vote(1)">Vote B</button>
    <button @click="vote(2)">Vote C</button>
    <button @click="vote(3)">Vote D</button>
    <button @click="vote(4)">Vote E</button>
  </div>
</template>

<script>
import socket from "./socket";
export default {
  name: "App",
  data() {
    return {
      usernameAlreadySelected: false,
    };
  },
  methods: {
    vote(value) {
      socket.emit('poll:vote', value);
    },
  },
  created() {
    socket.on("connect_error", (err) => {
      if (err.message === "invalid username") {
        this.usernameAlreadySelected = false;
      }
    });
  },
  destroyed() {
    socket.off("connect_error");
  },
};
</script>

<style>
body {
  margin: 0;
}
@font-face {
  font-family: Lato;
  src: url("/fonts/Lato-Regular.ttf");
}
#app {
  font-family: Lato, Arial, sans-serif;
  font-size: 14px;
}
</style>