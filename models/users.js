const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");

const { extractValidFields } = require("../lib/validation");
const { getDbInstance } = require("../lib/mongo");

const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true },
};
exports.UserSchema = UserSchema;

exports.insertNewUser = async function (user) {
  const userToInsert = extractValidFields(user, UserSchema);
  userToInsert.password = await bcrypt.hash(userToInsert.password, 8);
  console.log("== Hashed, salted password:", userToInsert.password);
  const db = getDbInstance();
  const collection = db.collection("users");
  const result = await collection.insertOne(userToInsert);
  return result.insertedId;
};

// export method to grab user
exports.getUserByEmail = async function getUserByEmail(email, includePassword) {
  const db = getDbInstance();
  const collection = db.collection("users");

  const user = await collection
    .find({ email: email })
    .project(includePassword ? {} : { password: 0 })
    .toArray();
  console.log("USER[0]", user[0]);
  return user[0];
};

exports.getUserInfo = async function getUserInfo(id, includePassword) {
  const db = getDbInstance();
  const collection = db.collection("users");
  console.log("ID GET USER INFO ", id);
  const user = await collection
    .find({ _id: ObjectId(id) })
    .project(includePassword ? {} : { password: 0 })
    .toArray();

  if (user.role == "instructor") {
    user[0] = getCoursesByInstructor(id);
  } else if (user.role == "student") {
    user[0].courses = getCoursesByEnrollment(id);
  }

  return user[0];
};

exports.GetUserById = async function GetUserById(id, includePassword) {
  const db = getDbInstance();
  const collection = db.collection("users");

  const user = await collection
    .find({ _id: new ObjectId(id) })
    .project(includePassword ? {} : { password: 0 })
    .toArray();

  return user[0];
};

async function getCoursesByInstructor(id) {
  const db = getDbInstance();
  const collection = db.collection("users");

  instructorInfo = await collection
    .aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "instructorId",
          as: "courses",
        },
      },
      {
        $project: {
          _id: 1,
          subject: 0,
          number: 0,
          title: 0,
          term: 0,
          instructorId: 0,
        },
      },
    ])
    .toArray();

  return instructorInfo;
}

async function getCoursesByEnrollment(studentId) {
  const db = getDbInstance();
  const collection = db.collection("courses");

  const courses = await collection.find({}).toArray();

  const enrolledCourses = [];
  courses.forEach((course) => {
    const index = course.students.indexOf(ObjectId(studentId));
    if (index > -1) enrolledCourses.push(course._id);
  });

  return enrolledCourses;
}
