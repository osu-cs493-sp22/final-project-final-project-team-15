const { connectToDb, getDbReference } = require("./lib/mongo");
const { ObjectId, GridFSBucket } = require("mongodb");
const fs = require("fs/promises");
const { connectToRabbitMQ, getChannel } = require("./lib/rabbitmq");
const {
  getDownloadStreamById,
  getimagesById,
  getImageInfoById,
  saveThumbFile,
} = require("./models/photo");

const sharp = require("sharp");

const queue = "images";

connectToDb(async function () {
  await connectToRabbitMQ(queue);
  const channel = getChannel();

  channel.consume(queue, async function (msg) {
    if (msg) {
      const id = msg.content.toString();
      const db = getDbReference();
      const downloadStream = getDownloadStreamById(id);
      const bucket = new GridFSBucket(db, { bucketName: "thumbs" });
      console.log("ID IS == ", id);
      const imageData = [];
      downloadStream.on("data", function (data) {
        imageData.push(data);
      });
      downloadStream.on("end", async function () {
        const img = Buffer.concat(imageData);
        const imgInfo = await getImageInfoById(id);
        const metadata = {
          businessId: new ObjectId(imgInfo.businessId),
          caption: imgInfo.caption,
          mimetype: imgInfo.mimetype,
        };
        const uploadStream = bucket.openUploadStream(imgInfo.filename, {
          metadata: metadata,
        });
        console.log("Imageinfo == ", imgInfo);
        sharp(img)
          .resize({ width: 100, height: 100 })
          .toFormat("jpeg")
          .toFile("output.jpg");
        // const thing = await saveThumbFile(test);
        // console.log(thing);

        //console.log("Image was uploaded", test);
      });
    }
    channel.ack(msg);
  });
});
