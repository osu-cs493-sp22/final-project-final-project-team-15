const router = require("express").Router();

const bcrypt = require("bcryptjs");

const { UserSchema, insertNewUser, getUserByEmail, getUserInfo } = require("../models/users");
const { generateAuthToken, requireAuthentication } = require("../lib/auth");
const { validateAgainstSchema } = require("../lib/validation");

exports.router = router;

const { getDbInstance } = require("../lib/mongo");
const req = require("express/lib/request");

/*
 * Route to list all of a user's businesses.
 */
router.get("/:userid/businesses", async function (req, res) {
  const db = getDbInstance();
  const collection = db.collection("businesses");
  const businesses = await collection.find({}).toArray();
  const userid = parseInt(req.params.userid);
  const userBusinesses = businesses.filter(
    (business) => business && business.ownerid === userid
  );

  res.status(200).send({ businesses: userBusinesses });
});

/*
 * Route to list all of a user's reviews.
 */
router.get("/:userid/reviews", async function (req, res) {
  const db = getDbInstance();
  const collection = db.collection("reviews");
  const reviews = await collection.find({}).toArray();
  const userid = parseInt(req.params.userid);
  const userReviews = reviews.filter(
    (review) => review && review.userid === userid
  );
  res.status(200).send({
    reviews: userReviews,
  });
});

/*
 * Route to list all of a user's photos.
 */
router.get("/:userid/photos", async function (req, res) {
  const db = getDbInstance();
  const collection = db.collection("photos");
  const photos = await collection.find({}).toArray();
  const userid = parseInt(req.params.userid);
  const userPhotos = photos.filter((photo) => photo && photo.userid === userid);
  res.status(200).send({
    photos: userPhotos,
  });
});


router.get("/:userid", requireAuthentication ,async function (req, res) {
  const userInfo = await getUserInfo(req.params.userid, false);
  if(userInfo) {
    res.status(200).send(userInfo);
  } else {
    res.status(400).send(
      { error: "user not found" }
    )
  }
});

router.post("/", async function (req, res) {
  if (validateAgainstSchema(req.body, UserSchema)) {

    // check correct permissions for admin or instructor creation -- (does not work right now)
    // if(req.body.role == 'admin' || req.body.role == 'instructor') {
    //   requireAuthentication(req, res);
    //   console.log(req.admin)
    //   if(req.admin != 'admin') res.status(401).send({ error: "Invalid permissions" })
    // }

    const id = await insertNewUser(req.body);
    res.status(201).send({
      _id: id,
    });
  } else {
    res.status(400).send({
      error: "Request body does not contain a valid User.",
    });
  }
});

router.post("/login", async function (req, res) {
  if (req.body && req.body.email && req.body.password) {
    const userpass = await getUserByEmail(req.body.email, true);
    const hashcheck =
      userpass &&
      (await bcrypt.compareSync(req.body.password, userpass.password));
    if (hashcheck) {
      const token = generateAuthToken(userpass.userId, userpass.admin);
      res.status(200).send({
        token: token,
      });
    } else res.status(401).send({ error: "error invalid credentials" });
  } else res.status(401).send({ error: "error invalid request body" });
});
