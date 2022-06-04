const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const { getDbInstance } = require('../lib/mongo')

const reviews = require('../data/reviews');

const { ObjectId } = require('mongodb')

exports.router = router;
exports.reviews = reviews;

/*
 * Schema describing required/optional fields of a review object.
 */
const reviewSchema = {
    userid: { required: true },
    businessid: { required: true },
    dollars: { required: true },
    stars: { required: true },
    review: { required: false }
};


async function insertNewReview(review) {
    const db = getDbInstance()
    const collection = db.collection('reviews')

    review = extractValidFields(review, reviewSchema)
    review.businessid = new ObjectId(review.businessid)
    const result = await collection.insertOne(review)
    return result.insertedId
}


/*
 * Function to get specific review by id
 */
async function getReviewById(id) {
    const db = getDbInstance()
    const collection = db.collection('reviews')
    console.log(id)
    const reviews = await collection.find({ _id: new ObjectId(id) }).toArray()
    console.log(reviews)
    return reviews[0]
}


/*
 * Function to update review by id
 */
async function updateReviewById(id, review) {
    const db = getDbInstance()
    const reviewValues = {
        userid: review.userid,
        businessid: review.businessid,
        dollars: review.dollars,
        stars: review.stars,
        review: review.review
    }
    const collection = db.collection('reviews')
    const result = await collection.replaceOne({ _id: new ObjectId(id) },
        reviewValues
    )
    return result.matchedCount > 0
}


/*
 * Function to delete business by id
 */
async function deleteReviewById(id) {
    const db = getDbInstance()
    const collection = db.collection('reviews');
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0;
}



/*
 * Route to create a new review.
 */
router.post('/', async function(req, res, next) {
    if (validateAgainstSchema(req.body, reviewSchema)) {
        const id = await insertNewReview(req.body)
        res.status(201).send({ id: id })

    } else {
        res.status(400).json({
            error: "Request body is not a valid review object"
        });
    }
});

/*
 * Route to fetch info about a specific review.
 */
router.get('/:reviewID', async function(req, res, next) {
    const reviewid = req.params.reviewID;
    const review = await getReviewById(reviewid)
    if (review) {
        res.status(200).send(review);
    } else {
        next();
    }
});

/*
 * Route to update a review.
 */
router.put('/:reviewID', async function(req, res, next) {

    if (validateAgainstSchema(req.body, reviewSchema)) {
        const id = req.params.reviewID
        const updateSuccessful = await updateReviewById((id), req.body)
        if (updateSuccessful) {
            res.status(204).send()
        } else {
            next()
        }
    } else {
        res.status(400).send({
            err: "Request body does not contain a valid review"
        })
    }
});

/*
 * Route to delete a review.
 */
router.delete('/:reviewID', async function(req, res, next) {
    const id = req.params.reviewID
    const deleteSuccessful = await deleteReviewById(id)

    if (deleteSuccessful) {
        res.status(204).send()
    } else {
        next();
    }
});