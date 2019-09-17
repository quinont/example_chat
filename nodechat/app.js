//require the express module
const express = require("express");
const app = express();
const dateTime = require("simple-datetime-formater");
const bodyParser = require("body-parser");
const chatRouter = require("./route/chatroute");

// PUBSUB
const redis = require('redis');
const os = require('os');
const publisher = redis.createClient("6379", "redis");
const typing = redis.createClient("6379", "redis");
const submsj = redis.createClient("6379", "redis");
const pubmsj = redis.createClient("6379", "redis");

//require the http module
const http = require("http").Server(app);

// require the socket.io module
const io = require("socket.io");

const port = 5000;

//bodyparser middleware
app.use(bodyParser.json());

//routes
app.use("/chats", chatRouter);

//integrating socketio
socket = io(http);

//database connection
const Chat = require("./models/Chat");
const connect = require("./dbconnect");


//setup event listener
socket.on("connection", socket => {

  console.log("user connected");
  typing.subscribe("notifyTyping", 1);
  submsj.subscribe("newmsj", 1);

  socket.on("disconnect", function() {
    console.log("user disconnected");
    submsj.unsubscribe("newmsj");
    typing.unsubscribe("notifyTyping");
  });

  //Someone is typing
  socket.on("typing", data => {
    // enviando un mensaje de tipeo.
    const datos = {
        action : "typing",
        user : data.user,
        message : data.message,
        host : os.hostname()
    }
    publisher.publish("notifyTyping",JSON.stringify(datos))
    // Enviando mensaje por el ws
    socket.broadcast.emit("notifyTyping", {
      user: data.user,
      message: data.message
    });
  });

  typing.on("message",(channel,message) => {
    obj = JSON.parse(message);
    if (obj.host != os.hostname()) {
      if (obj.action == "typing") {
        socket.broadcast.emit("notifyTyping", {
        user: obj.user,
        message: obj.message
        });
      } else if (obj.action == "stop") {
        socket.broadcast.emit("notifyStopTyping");
      }
    }
  })


  //when soemone stops typing
  socket.on("stopTyping", () => {
    // enviando un mensaje de stop de tipeo.
    const datos = {
        action : "stop",
        host : os.hostname()
    }
    publisher.publish("notifyTyping",JSON.stringify(datos))
    // Enviando mensaje por el ws
    socket.broadcast.emit("notifyStopTyping");
  });

  socket.on("chat message", function(msg) {
    console.log("message: " + msg);

    //broadcast message to everyone in port:5000 except yourself.
    socket.broadcast.emit("received", { message: msg });

    //save chat to the database
    connect.then(db => {
      console.log("connected correctly to the server");
      let chatMessage = new Chat({ message: msg, sender: "Anonymous" });

      chatMessage.save();
    });

    // publish a messaje in a pubmsj
    const datos = {
      host: os.hostname(),
      message: msg,
      sender: "Anonymous"
    }
    pubmsj.publish("newmsj", JSON.stringify(datos))
  });

  submsj.on("message",(channel,message) => {
    obj = JSON.parse(message);
    if (obj.host != os.hostname()) {
      socket.broadcast.emit("received", {
        message: obj.message,
        sender: obj.sender
      });
    }
  });

});

http.listen(port, () => {
  console.log("Running on Port: " + port);
});
