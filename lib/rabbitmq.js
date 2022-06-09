const amqp = require("amqplib");

const rabbitmqHost = process.env.RABBITMQ_HOST || "localhost";
const rabbitmqUrl = `amqp://${rabbitmqHost}`;
console.log("URL ==", rabbitmqUrl);
let connection = null;
let channel = null;

exports.connectToRabbitMQ = async function (queue) {
  //
  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue(queue);
    console.log("Connected");
  } catch (err) {
    console.error(err);
  }
};

exports.getChannel = function () {
  return channel;
};
