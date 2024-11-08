const express = require("express");
const {
  getAllUsers,
  updateMe,
  deleteMe,
  createUser,
  getUser,
  deleteUser,
} = require("../controllers/userController");
const { prmission } = require("../controllers/authController");

const router = express.Router();

// for normal users student or teacher
router.patch("/updateMe", prmission, updateMe);
router.delete("/deleteMe", prmission, deleteMe);

//for admin
router.route("/").get(prmission, getAllUsers).post(prmission, createUser);
router.route("/:id").get(prmission, getUser).delete(prmission, deleteUser);

module.exports = router;
