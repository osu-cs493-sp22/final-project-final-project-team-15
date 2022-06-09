const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const businesses = require('../data/businesses');
const { reviews } = require('./reviews');
const { photos } = require('./photos');

const { getDbInstance } = require('../lib/mongo')

const { ObjectID, ListCollectionsCursor, ObjectId } = require('mongodb');
const e = require('express');

exports.router = router;
exports.businesses = businesses;

/*
 * Schema describing required/optional fields of a business object.
 */
const businessSchema = {
    ownerid: { required: true },
    name: { required: true },
    address: { required: true },
    city: { required: true },
    state: { required: true },
    zip: { required: true },
    phone: { required: true },
    category: { required: true },
    subcategory: { required: true },
    website: { required: false },
    email: { required: false }
};

exports.businessSchema = businessSchema

// Function to insert a new business into the db
// exports.insertNewBusiness = async function insertNewBusiness(business) {
//     const db = getDbInstance()
//     const collection = db.collection('businesses')

//     business = extractValidFields(business, businessSchema)
//     const result = await collection.insertOne(business)
//     return result.insertedId
// }


/*
 * Function to create a new business and insert to db
 */
async function insertNewBusiness(business) {
    const db = getDbInstance()
    const collection = db.collection('businesses')

    business = extractValidFields(business, businessSchema)
    const result = await collection.insertOne(business)
    return result.insertedId
}

/*
 * Function to get businesses page
 */
async function getBusinessesPage(page) {
    const db = getDbInstance()
    const collection = db.collection('businesses')
    const count = await collection.countDocuments()
    const pageSize = 10
    const lastPage = Math.ceil(count / pageSize)
    page = page < 1 ? 1 : page
    const offset = (page - 1) * pageSize
    const results = await collection.find({}).sort({ _id: 1 }).skip(offset).limit(pageSize).toArray()

    return {
        businesses: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    }
}


/*
 * Function to get specific business by id
 */
async function getBusinessById(id) {
    const db = getDbInstance()
    const collection = db.collection('businesses')
    console.log(id)
    const businesses = await collection.aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
            $lookup: {
                from: "reviews",
                localField: "_id",
                foreignField: "businessid",
                as: "reviews"
            }
        },
        {
            $lookup: {
                from: "photos",
                localField: "_id",
                foreignField: "businessid",
                as: "photos"
            }
        }
    ]).toArray()
    console.log(businesses)
    return businesses[0]
}


/*
 * Function to update business by id
 */
async function updateBusinessById(id, business) {
    const db = getDbInstance()
    const businessValues = {
        ownerid: business.ownerid,
        name: business.name,
        address: business.address,
        city: business.city,
        state: business.state,
        zip: business.zip,
        phone: business.phone,
        category: business.category,
        subcategory: business.subcategory,
        website: business.website,
        email: business.email
    };
    const collection = db.collection('businesses');
    const result = await collection.replaceOne({ _id: new ObjectId(id) },
        businessValues
    );
    return result.matchedCount > 0;
}


/*
 * Function to delete business by id
 */
async function deleteBusinessById(id) {
    const db = getDbInstance()
    const collection = db.collection('businesses');
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0;
}


/*
 * Route to return a list of businesses.
 */
router.get('/', async(req, res) => {
    const businessesPage = await getBusinessesPage(parseInt(req.query.page) || 1)
    res.status(200).send(businessesPage)

});

/*
 * Route to create a new business.
 */
router.post('/', async function(req, res, next) {
    if (validateAgainstSchema(req.body, businessSchema)) {
        const id = await insertNewBusiness(req.body)
        res.status(201).send({ id: id })
    } else {
        res.status(400).send({
            error: "Request body is not a valid business object"
        });
    }
});

/*
 * Route to fetch info about a specific business.
 */
router.get('/:businessid', async function(req, res, next) {
    const id = req.params.businessid
    const business = await getBusinessById(id)
    if (business) {
        res.status(200).send(business)
    } else {
        next()
    }

});

/*
 * Route to replace data for a business.
 */
router.put('/:businessid', async function(req, res, next) {
    if (validateAgainstSchema(req.body, businessSchema)) {
        const id = req.params.businessid
        const updateSuccessful = await updateBusinessById((id), req.body)
        if (updateSuccessful) {
            res.status(204).send()
        } else {
            next()
        }
    } else {
        res.status(400).send({
            err: "Request body does not contain a valid business id"
        })
    }
});

/*
 * Route to delete a business.
 */
router.delete('/:businessid', async function(req, res, next) {

    const id = req.params.businessid
    const deleteSuccessful = await deleteBusinessById(id)

    if (deleteSuccessful) {
        res.status(204).send()
    } else {
        next()
    }

});