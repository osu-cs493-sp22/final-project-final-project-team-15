const express = require("express");
const morgan = require("morgan");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs/promises");
const redis = require("redis");
const { isValidToken } = require("./lib/auth");

const api = require("./api");
const { connectToDb } = require("./lib/mongo");
const { connectToRabbitMQ, getChannel } = require("./lib/rabbitmq");
const app = express();
const port = process.env.PORT || 8001;
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(redisHost, redisPort);

let rateLimitMaxRequests = 30;
const rateLimitWindowMS = 60000;

async function rateLimit(req, res, next) {
  const ip = req.ip;
  if (!isValidToken(req)) {
    rateLimitMaxRequests = 10;
  }

  let tokenBucket;
  try {
    tokenBucket = await redisClient.hGetAll(ip);
  } catch (e) {
    next();
    return;
  }
  console.log("== tokenBucket:", tokenBucket);
  tokenBucket = {
    tokens: parseFloat(tokenBucket.tokens) || rateLimitMaxRequests,
    last: parseInt(tokenBucket.last) || Date.now(),
  };

  const now = Date.now();
  const ellapsedMs = now - tokenBucket.last;
  tokenBucket.tokens += ellapsedMs * (rateLimitMaxRequests / rateLimitWindowMS);
  tokenBucket.tokens = Math.min(rateLimitMaxRequests, tokenBucket.tokens);
  tokenBucket.last = now;

  if (tokenBucket.tokens >= 1) {
    tokenBucket.tokens -= 1;
    await redisClient.hSet(ip, [
      ["tokens", tokenBucket.tokens],
      ["last", tokenBucket.last],
    ]);
    next();
  } else {
    await redisClient.hSet(ip, [
      ["tokens", tokenBucket.tokens],
      ["last", tokenBucket.last],
    ]);
    res.status(429).send({
      err: "Too many requests per minute",
    });
  }
}

app.use(rateLimit);
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
  redisClient.connect().then(function () {
    app.listen(port, function () {
      console.log("== Server is running on port", port);
    });
  });
});
