const express = require("express");
const router = express.Router();
const {
  createTodo,
  getAllTodos,
  updateTodo,
  deleteTodo,
  getTodoById,
  getCompletedTodos,
  getTodayTodos,
  getUpcomingTodos,
  todoTodayProgress,
} = require("../controllers/todo.controller");
const { prmission, restrictTo } = require("../controllers/authController");

router
  .route("/")
  .post(prmission, restrictTo("student", "admin"), createTodo)
  .get(prmission, restrictTo("student", "admin"), getAllTodos);
router
  .route("/completed")
  .get(prmission, restrictTo("student", "admin"), getCompletedTodos);
router
  .route("/today")
  .get(prmission, restrictTo("student", "admin"), getTodayTodos);
router
  .route("/upcoming")
  .get(prmission, restrictTo("student", "admin"), getUpcomingTodos);
router
  .route("/today-progress")
  .get(prmission, restrictTo("student", "admin"), todoTodayProgress);
router
  .route("/:id")
  .get(prmission, restrictTo("student", "admin"), getTodoById)
  .patch(prmission, restrictTo("student", "admin"), updateTodo)
  .delete(prmission, restrictTo("student", "admin"), deleteTodo);

module.exports = router;