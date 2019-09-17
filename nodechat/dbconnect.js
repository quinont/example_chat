const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const url = "mongodb://mongo:27017/chat";

const connect = mongoose.connect(url, { useNewUrlParser: true });

module.exports = connect;
