const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const photos = require('../data/photos');

const { getDbInstance } = require('../lib/mongo')
const { ObjectId } = require('mongodb')

exports.router = router;
exports.photos = photos;

/*
 * Schema describing required/optional fields of a photo object.
 */
const photoSchema = {
    userid: { required: true },
    businessid: { required: true },
    caption: { required: false }
};


async function insertNewPhoto(photo) {
    const db = getDbInstance()
    const collection = db.collection('photos')

    photo = extractValidFields(photo, photoSchema)
    photo.businessid = new ObjectId(photo.businessid)
    const result = await collection.insertOne(photo)
    return result.insertedId
}


/*
 * Function to get specific review by id
 */
async function getPhotoById(id) {
    const db = getDbInstance()
    const collection = db.collection('photos')
    console.log(id)
    const photos = await collection.find({ _id: new ObjectId(id) }).toArray()
    console.log(photos)
    return photos[0]
}

/*
 * Function to delete business by id
 */
async function deletePhotoById(id) {
    const db = getDbInstance()
    const collection = db.collection('photos');
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0;
}


/*
 * Function to update photo by id
 */
async function updatePhotoById(id, photo) {
    const db = getDbInstance()
    const photoValues = {
        userid: photo.userid,
        businessid: photo.businessid,
        caption: photo.caption
    }
    const collection = db.collection('photos')
    const result = await collection.replaceOne({ _id: new ObjectId(id) },
        photoValues
    )
    return result.matchedCount > 0
}


/*
 * Route to create a new photo.
 */
router.post('/', async function(req, res, next) {
    if (validateAgainstSchema(req.body, photoSchema)) {
        const id = await insertNewPhoto(req.body)
        res.status(201).send({ id: id })

    } else {
        res.status(400).send({
            error: "Request body is not a valid photo object"
        });
    }
});

/*
 * Route to fetch info about a specific photo.
 */
router.get('/:photoID', async function(req, res, next) {
    const id = req.params.photoID
    const photo = await getPhotoById(id)
    if (photo) {
        res.status(200).send(photo)
    } else {
        next()
    }

    const photoID = parseInt(req.params.photoID);
    if (photos[photoID]) {
        res.status(200).json(photos[photoID]);
    } else {
        next();
    }
});

/*
 * Route to update a photo.
 */
router.put('/:photoID', async function(req, res, next) {

    if (validateAgainstSchema(req.body, photoSchema)) {
        const id = req.params.photoID
        const updateSuccessful = await updatePhotoById((id), req.body)
        if (updateSuccessful) {
            res.status(204).send()
        } else {
            next()
        }
    } else {
        res.status(400).send({
            err: "Request body does not contain a valid photo"
        })
    }
});

/*
 * Route to delete a review.
 */
router.delete('/:photoID', async function(req, res, next) {
    const id = req.params.photoID
    const deleteSuccessful = await deletePhotoById(id)

    if (deleteSuccessful) {
        res.status(204).send()
    } else {
        next();
    }
});