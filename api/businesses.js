/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require("express");
const { ObjectId, GridFSBucket } = require("mongodb");
const { getDbReference } = require("../lib/mongo");
const { validateAgainstSchema } = require("../lib/validation");
const {
  BusinessSchema,
  getBusinessesPage,
  insertNewBusiness,
  getBusinessById,
} = require("../models/business");

const router = Router();

/*
 * GET /businesses - Route to return a paginated list of businesses.
 */
router.get("/", async (req, res) => {
  try {
    /*
     * Fetch page info, generate HATEOAS links for surrounding pages and then
     * send response.
     */
    const businessPage = await getBusinessesPage(parseInt(req.query.page) || 1);
    businessPage.links = {};
    if (businessPage.page < businessPage.totalPages) {
      businessPage.links.nextPage = `/businesses?page=${businessPage.page + 1}`;
      businessPage.links.lastPage = `/businesses?page=${businessPage.totalPages}`;
    }
    if (businessPage.page > 1) {
      businessPage.links.prevPage = `/businesses?page=${businessPage.page - 1}`;
      businessPage.links.firstPage = "/businesses?page=1";
    }
    res.status(200).send(businessPage);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error fetching businesses list.  Please try again later.",
    });
  }
});

/*
 * POST /businesses - Route to create a new business.
 */
router.post("/", async (req, res) => {
  if (validateAgainstSchema(req.body, BusinessSchema)) {
    try {
      const id = await insertNewBusiness(req.body);
      res.status(201).send({
        id: id,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting business into DB.  Please try again later.",
      });
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid business object.",
    });
  }
});

/*
 * GET /businesses/{id} - Route to fetch info about a specific business.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const business = await getBusinessById(req.params.id);
    if (business) {
      console.log("Business", business._id);
      const db = getDbReference();
      const bucket = new GridFSBucket(db, { bucketName: "images" });
      const results = await bucket
        .find({ "metadata.businessId": new ObjectId(req.params.id) })
        .toArray();
      console.log(results);
      res.status(200).send({ business: business, photos: results });
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Unable to fetch business.  Please try again later.",
    });
  }
});

module.exports = router;
