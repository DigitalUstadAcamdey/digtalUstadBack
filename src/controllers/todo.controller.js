const Todo = require("../models/todoModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

exports.createTodo = catchAsync(async (req, res, next) => {
  const { title, description, date } = req.body;
  const todo = await Todo.create({
    title,
    description,
    date,
    user: req.user.id,
  });
  res.status(201).json({
    message: "تم إنشاء المهمة بنجاح",
    todo,
  });
});

exports.getAllTodos = catchAsync(async (req, res, next) => {
  const todos = await Todo.find({ user: req.user.id });
  res.status(200).json({
    message: "نجاح",
    todos,
  });
});

exports.updateTodo = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const allowedFields = ["title", "description", "completed", "date"];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const todo = await Todo.findOneAndUpdate(
    { _id: id, user: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  if (!todo) {
    return next(new AppError("المهمة غير موجودة", 404));
  }

  res.status(200).json({
    message: "تم تحديث المهمة بنجاح",
    todo,
  });
});

exports.deleteTodo = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const todo = await Todo.findOneAndDelete({
    _id: id,
    user: req.user.id,
  });

  if (!todo) {
    return next(new AppError("المهمة غير موجودة", 404));
  }

  res.status(204).json({
    message: "تم حذف المهمة بنجاح",
  });
});
exports.getTodoById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const todo = await Todo.findOne({ _id: id, user: req.user.id });
  if (!todo) {
    return next(new AppError("المهمة غير موجودة", 404));
  }
  res.status(200).json({
    message: "تم جلب المهمة بنجاح",
    todo,
  });
});

exports.getCompletedTodos = catchAsync(async (req, res, next) => {
  const todos = await Todo.find({ user: req.user.id, completed: true });
  res.status(200).json({
    message: "تم جلب المهام المكتملة بنجاح",
    todos,
  });
});

exports.getTodayTodos = catchAsync(async (req, res, next) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const todos = await Todo.find({ user: req.user.id,
    date: { $gte: startOfDay, $lte: endOfDay },
  });
  res.status(200).json({
    message: "تم جلب مهام اليوم بنجاح",
    todos,
  });
});

exports.getUpcomingTodos = catchAsync(async (req, res, next) => {
  const today = new Date();
  const todos = await Todo.find({ user: req.user.id, date: { $gt: today } });
  res.status(200).json({
    message: "تم جلب المهام القادمة بنجاح",
    todos,
  });
});

exports.todoTodayProgress = catchAsync(async (req, res, next) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const completedTodos = await Todo.countDocuments({
        user: req.user.id,
        date: { $gte: startOfDay, $lte: endOfDay },
        completed: true
    });
    const totalTodos = await Todo.countDocuments({
        user: req.user.id,
        date: { $gte: startOfDay, $lte: endOfDay }
    });
    res.status(200).json({
        message: "تم جلب تقدم مهام اليوم بنجاح",
        progress: totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0
    });
});
