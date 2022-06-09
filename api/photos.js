/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs/promises");
const { connectToRabbitMQ, getChannel } = require("../lib/rabbitmq");
const { validateAgainstSchema } = require("../lib/validation");

const {
  PhotoSchema,
  insertNewPhoto,
  getPhotoById,
  getImageInfoById,
  saveImageInfo,
  saveImageFile,
  getImageDownloadStream,
  getThumbsDownloadStream,
} = require("../models/photo");

const router = Router();
const queue = "images";

/*
 * POST /photos - Route to create a new photo.
 */
router.post("/", async (req, res) => {
  if (validateAgainstSchema(req.body, PhotoSchema)) {
    try {
      const id = await insertNewPhoto(req.body);
      res.status(201).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${req.body.businessId}`,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later.",
      });
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object",
    });
  }
});

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const photo = await getPhotoById(req.params.id);
    if (photo) {
      res.status(200).send(photo);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later.",
    });
  }
});

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      console.log("HERE");
      const basename = crypto.pseudoRandomBytes(16).toString("hex");
      const extension = imageTypes[file.mimetype];
      callback(null, `${basename}.${extension}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!imageTypes[file.mimetype]);
  },
});

router.post("/images", upload.single("image"), async function (req, res, next) {
  console.log("== req.file:", req.file);
  console.log("== req.body:", req.body);
  if (req.file && req.body && req.body.businessId) {
    try {
      const image = {
        businessId: req.body.businessId,
        caption: req.body.caption,
        path: req.file.path,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
      };
      const id = await saveImageFile(image);
      await fs.unlink(req.file.path);

      const channel = getChannel();
      channel.sendToQueue(queue, Buffer.from(id.toString()));

      res.status(200).send({ id: id });
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400).send({
      err: "Request body was invalid.",
    });
  }
});

router.get("/images/:id", async (req, res, next) => {
  try {
    const image = await getImageInfoById(req.params.id);
    if (image) {
      console.log("HERE BABY", image.metadata);
      const resBody = {
        _id: image._id,
        url: `/media/images/${image.filename}`,
        mimetype: image.metadata.mimetype,
        businessId: image.metadata.businessId,
        caption: image.metadata.caption,
      };
      console.log("what is being sent", resBody);
      res.status(200).send(resBody);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

router.get("/media/images/:filename", function (req, res, next) {
  getImageDownloadStream(req.params.filename)
    .on("file", function (file) {
      res.status(200).type(file.metadata.mimetype);
    })
    .on("error", function (err) {
      if (err.code === "ENOENT") {
        next();
      } else {
        next(err);
      }
    })
    .pipe(res);
});

router.get("/media/thumbs/:filename", function (req, res, next) {
  getThumbsDownloadStream(req.params.filename)
    .on("file", function (file) {
      res.status(200).type(file.metadata.mimetype);
    })
    .on("error", function (err) {
      if (err.code === "ENOENT") {
        next();
      } else {
        next(err);
      }
    })
    .pipe(res);
});
module.exports = router;
