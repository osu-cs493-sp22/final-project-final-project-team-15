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
