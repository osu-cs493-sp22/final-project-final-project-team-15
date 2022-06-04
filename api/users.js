const router = require('express').Router();

exports.router = router;

// const { businesses } = require('./businesses');
// const { reviews } = require('./reviews');
// const { photos } = require('./photos');

const { getDbInstance } = require('../lib/mongo')

/*
 * Route to list all of a user's businesses.
 */
router.get('/:userid/businesses', async function(req, res) {
    const db = getDbInstance()
    const collection = db.collection('businesses')
    const businesses = await collection.find({}).toArray()
    const userid = parseInt(req.params.userid);
    const userBusinesses = businesses.filter(business => business && business.ownerid === userid);

    res.status(200).send({ businesses: userBusinesses })
});

/*
 * Route to list all of a user's reviews.
 */
router.get('/:userid/reviews', async function(req, res) {
    const db = getDbInstance()
    const collection = db.collection('reviews')
    const reviews = await collection.find({}).toArray()
    const userid = parseInt(req.params.userid);
    const userReviews = reviews.filter(review => review && review.userid === userid);
    res.status(200).send({
        reviews: userReviews
    });
});

/*
 * Route to list all of a user's photos.
 */
router.get('/:userid/photos', async function(req, res) {
    const db = getDbInstance()
    const collection = db.collection('photos')
    const photos = await collection.find({}).toArray()
    const userid = parseInt(req.params.userid);
    const userPhotos = photos.filter(photo => photo && photo.userid === userid);
    res.status(200).send({
        photos: userPhotos
    });
});

router.post('/login', async function (req, res) {
    if (req.body && req.body.email && req.body.password){
      const email = req.body.email
      //const userpass = await User.findOne({where: { email: email }},'password')
      const userpass = await User.find({ email: email })
      const hashcheck = userpass && await bcrypt.compareSync(
      req.body.password,
      userpass.password
      )
      if (hashcheck){
        const token = generateAuthToken(userpass.userId, userpass.admin)
        res.status(200).send({
          token: token
        })
      }
      else 
        res.status(401).send({error :"error invalid credentials"})
    }
    else 
        res.status(401).send({error :"error invalid request body"})
    })
    