const router = require("express").Router();
const {
    validateAgainstSchema,
    extractValidFields,
} = require("../lib/validation");

const AssignmentSchema = require("../models/assignments");
const SubmissionSchema = require("../models/submissions");

// const { users } = require("../models/users");
// const { courses } = require("../models/courses");
// const { submissions } = require("../models/submissions");

const { getDbInstance } = require("../lib/mongo");

const { requireAuthentication } = require("../lib/auth");

const { getCourseById } = require("./courses");

const { ObjectID, ListCollectionsCursor, ObjectId } = require("mongodb");
const e = require("express");

exports.router = router;
// exports.assignments = assignments;

async function getAssignmentsById(id) {
    const db = getDbInstance();
    const collection = db.collection("assignments");
    console.log(id);
    const assignments = await collection.find({ _id: ObjectId(id) }).toArray();
    console.log(assignments);
    return assignments[0];
}

async function getSubmissionsByAssignmentId(id) {
    const db = getDbInstance();
    const collection = db.collection("submissions");
    console.log(id);
    const submissions = await collection
        .aggregate([{ $match: { assignmentId: new ObjectId(id) } }])
        .toArray();
    console.log(submissions);
    return submissions;
}

async function deleteAssignmentById(id) {
    const db = getDbInstance();
    const collection = db.collection("assignments");
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}

async function insertNewSubmission(submission) {
    const db = getDbInstance();
    const collection = db.collection("submissions");

    submission = extractValidFields(submission, SubmissionSchema);
    const result = await collection.insertOne(submission);
    return result.insertedId;
}

async function insertNewAssignment(assingment) {
    const db = getDbInstance();
    const collection = db.collection("assignments");
    console.log("SCHEMA", AssignmentSchema);
    //assingment = extractValidFields(assingment, AssignmentSchema);
    const result = await collection.insertOne(assingment);
    return result.insertedId;
}

async function updateAssignmentById(id, assignment) {
    const db = getDbInstance();
    const assignmentValues = {
        courseId: assignment.courseId,
        title: assignment.title,
        points: assignment.points,
        due: assignment.due,
    };

    const collection = db.collection("assignments");
    const result = await collection.replaceOne({ _id: new ObjectId(id) },
        assignmentValues
    );
    return result.matchedCount > 0;
}

function saveSubmissionFile(submission) {
    console.log("== Saving submission to GridFS Bucket ==")
    return new Promise(function(resolve, reject) {
        const db = getDbReference()
        const bucket = new GridFSBucket(db, { bucketName: 'submissions' })
        const metadata = {
            assignmentId: submission.assignmentId,
            userId: submission.userId,
            timeStamp: submission.timeStamp,
            grade: submission.gade,
            mimetype: submission.mimetype
        }
        const uploadStream = bucket.openUploadStream(submission.filename, {
            metadata: metadata
        })
        fs.createReadStream(submission.path).pipe(uploadStream)
            .on('error', function(err) {
                reject(err)
            })
            .on('finish', function(result) {
                console.log("== stream result:", result)
                resolve(result._id)
            })
    })
}

// async function getImageInfoById(id) {
//     const db = getDbReference();
//     // const collection = db.collection('images');
//     const bucket = new GridFSBucket(db, { bucketName: 'images' })

//     if (!ObjectId.isValid(id)) {
//         return null;
//     } else {
//         const results = await bucket.find({ _id: new ObjectId(id) })
//             .toArray();
//         return results[0];
//     }
// };


router.post("/", requireAuthentication, async(req, res) => {
    if (req.admin == "student") {
        res.status(400).send({ error: "Not a teacher" });
        next();
    } else {
        const newAssignment = await insertNewAssignment(req.body);
        console.log("== req.headers:", req.headers);
        if (newAssignment) {
            res.status(200).send(newAssignment);
        } else {
            next();
        }
    }
});

router.get("/:id", async(req, res) => {
    const id = req.params.id;
    const assignments = await getAssignmentsById(id);
    if (assignments) {
        res.status(200).send(assignments);
    } else {
        next();
    }
});

router.patch("/:id", async(req, res) => {
    if (validateAgainstSchema(req.body, AssignmentSchema)) {
        const updateSuccessful = await updateAssignmentById(
            req.params.id,
            req.body
        );
        console.log("UPDATED == ", updateSuccessful);
        if (updateSuccessful) {
            res.status(204).send();
        } else {
            next();
        }
    } else {
        res.status(400).send({
            err: "Request body does not contain a valid Assignment.",
        });
    }
});

router.delete("/:id", async(req, res) => {
    const assignment = await getAssignmentsById(req.params.id);
    const course = await getCourseById(assignment.courseId);
    const TID = course.instructorId;
    if (req.admin !== "admin" && TID != req.user) {
        res.status(400).send({ error: "Not an Admin" });
        next();
    } else {
        const id = req.params.id;
        const deleteSuccessful = await deleteAssignmentById(id);

        if (deleteSuccessful) {
            res.status(204).send();
        } else {
            next();
        }
    }
});

router.get("/:id/submissions", async(req, res) => {
    const id = req.params.id;
    const submissions = await getSubmissionsByAssignmentId(id);
    if (submissions) {
        res.status(200).send(submissions);
    } else {
        next();
    }
    // try {
    //     const image = await getImageInfoById(req.params.id);
    //     if (image) {
    //         const resBody = {
    //             _id: image._id,
    //             url: `/media/images/${image.filename}`,
    //             mimetype: image.metadata.mimetype,
    //             userId: image.metadata.userId
    //         }
    //         res.status(200).send(resBody);
    //     } else {
    //         next();
    //     }
    // } catch (err) {
    //     next(err);
    // }
});

router.post("/:id/submissions", async(req, res) => {
    if (req.admin !== "student") {
        res.status(400).send({ error: "Not a student" });
        next();
    } else {
        // const newSubmission = await insertNewSubmission(req.body);
        // console.log("== req.headers:", req.headers);
        // if (newSubmission) {
        //     res.status(200).send(newSubmission);
        // } else {
        //     next();
        // }
        console.log("== req.file:", req.file)
        console.log("== req.body:", req.body)
        if (req.file && req.body && req.body.assignmentId && req.body.userId) {
            const submission = {
                assignmentId: req.body.assignmentId,
                userId: req.body.userId,
                timeStamp: Date.now(),
                grade: "N/A",
                path: req.file.path,
                filename: req.file.filename,
                mimetype: req.file.mimetype
            }

            const id = await saveSubmissionFile(submission)
            res.status(201).send({
                    id: id
                        // links: {
                        //     photo: `/photos/${id}`,
                        //     business: `/businesses/${req.body.businessId}`
                        // }
                })
                // } catch (err) {
                //     console.error(err)
                //     res.status(500).send({
                //         error: "Error inserting photo into DB.  Please try again later."
                //     })
                // }
        } else {
            res.status(400).send({
                error: "Request body is not a valid submission object"
            })
        }
    }
});