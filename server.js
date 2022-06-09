const express = require("express");
const morgan = require("morgan");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs/promises");

const api = require("./api");
const { connectToDb } = require("./lib/mongo");
const { connectToRabbitMQ, getChannel } = require("./lib/rabbitmq");
const app = express();
const port = process.env.PORT || 8001;

/*
 * Morgan is a popular logger.
 */
app.use(morgan("dev"));

app.use(express.json());
app.use(express.static("public"));
const queue = "images";

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use("/", api);

app.use("*", function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist",
  });
});

connectToDb(async function () {
  await connectToRabbitMQ(queue);
  app.listen(port, async function () {
    console.log("== Server is running on port", port); //
  });
});
