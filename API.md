# API Documentation

This document outlines the API routes available in the Digital Ustad application.

## Base URL

`/api`

---

## Auth (`/auth`)

**Base Path:** `/api/auth`

| Method | Endpoint                      | Description              | Permitted Roles |
| :----- | :---------------------------- | :----------------------- | :-------------- |
| `POST` | `/login`                      | Login user               | Public          |
| `POST` | `/signup`                     | Signup new user          | Public          |
| `POST` | `/logout`                     | Logout user              | Public          |
| `GET`  | `/google`                     | Redirect to Google OAuth | Public          |
| `GET`  | `/google/callback`            | Google OAuth Callback    | Public          |
| `POST` | `/forget-password`            | Request password reset   | Public          |
| `POST` | `/reset-password/:resetToken` | Reset password           | Public          |

---

## Users (`/users`)

**Base Path:** `/api/users`

| Method   | Endpoint          | Description                   | Permitted Roles |
| :------- | :---------------- | :---------------------------- | :-------------- |
| `GET`    | `/me`             | Get current user's profile    | Authenticated   |
| `PATCH`  | `/updateMe`       | Update current user's profile | Authenticated   |
| `DELETE` | `/deleteMe`       | Delete current user's account | Authenticated   |
| `PATCH`  | `/updatePassword` | Update password               | Authenticated   |
| `GET`    | `/course`         | Get enrolled courses          | Student         |
| `GET`    | `/searchUsers`    | Search users                  | Admin           |
| `GET`    | `/`               | Get all users                 | Admin           |
| `POST`   | `/`               | Create user                   | Admin           |
| `GET`    | `/:id`            | Get specific user by ID       | Admin           |
| `DELETE` | `/:id`            | Delete specific user          | Admin           |
| `PATCH`  | `/:id`            | Update status of user         | Admin           |
| `POST`   | `/:id`            | Add balance to user           | Admin           |

---

## Courses (`/courses`)

**Base Path:** `/api/courses`

| Method   | Endpoint                                                       | Description                            | Permitted Roles               |
| :------- | :------------------------------------------------------------- | :------------------------------------- | :---------------------------- |
| `GET`    | `/getCategory`                                                 | Get courses and categories             | Public                        |
| `GET`    | `/ids`                                                         | Get only course IDs                    | Public                        |
| `GET`    | `/courseTitleAndDescription/:courseId`                         | Get course title & description         | Public                        |
| `POST`   | `/`                                                            | Create a new course                    | Teacher                       |
| `GET`    | `/`                                                            | Get all courses                        | Public                        |
| `GET`    | `/searchCourses`                                               | Search courses                         | Public                        |
| `GET`    | `/searchCoursesByTeacher`                                      | Search courses by teacher              | Teacher                       |
| `GET`    | `/my-courses`                                                  | Get my enrolled courses                | Student                       |
| `GET`    | `/course-overview/:courseId`                                   | Get course overview (for non-enrolled) | Public                        |
| `GET`    | `/:courseId`                                                   | Get course details                     | Authenticated, Access Checked |
| `POST`   | `/:courseId`                                                   | Update course sections (Structure)     | Teacher                       |
| `PATCH`  | `/:courseId`                                                   | Update course details                  | Teacher                       |
| `DELETE` | `/:courseId`                                                   | Delete course                          | Admin, Teacher                |
| `PUT`    | `/:courseId/sections/:sectionId`                               | Update section                         | Teacher                       |
| `DELETE` | `/:courseId/sections/:sectionId`                               | Delete section                         | Teacher                       |
| `POST`   | `/:courseId/sections/:sectionId`                               | Add video/lesson to section            | Teacher                       |
| `PATCH`  | `/:courseId/sections/:sectionId/videos/:videoId`               | Update video title/desc                | Teacher                       |
| `DELETE` | `/:courseId/sections/:sectionId/videos/:videoId`               | Delete video from section              | Teacher                       |
| `POST`   | `/enrolled/:courseId`                                          | Enroll in course                       | Student                       |
| `POST`   | `/enrolled-with-subscription/:courseId`                        | Enroll with subscription               | Student                       |
| `DELETE` | `/unenrolled/:courseId`                                        | Unenroll from course                   | Student                       |
| `PATCH`  | `/:courseId/videos/:videoId/completed`                         | Mark video as completed                | Student                       |
| `POST`   | `/reviews/:courseId`                                           | Add review to course                   | Student                       |
| `PATCH`  | `/:courseId/reviews/:reviewId`                                 | Update review                          | Student                       |
| `DELETE` | `/:courseId/reviews/:reviewId`                                 | Delete review                          | Admin, Student                |
| `POST`   | `/:courseId/sections/:sectionId/videos/:videoId/files`         | Add file to lesson                     | Teacher                       |
| `DELETE` | `/:courseId/sections/:sectionId/videos/:videoId/files/:fileId` | Delete file from lesson                | Teacher                       |
| `POST`   | `/:courseId/lessons/:videoId`                                  | Add comment to lesson                  | Student                       |
| `GET`    | `/:videoId/comments`                                           | Get comments for lesson                | Authenticated                 |

---

## Subscriptions (`/subscriptions`)

**Base Path:** `/api/subscriptions`

| Method   | Endpoint                 | Description             | Permitted Roles |
| :------- | :----------------------- | :---------------------- | :-------------- |
| `POST`   | `/`                      | Create new subscription | Student         |
| `POST`   | `/renew/:subscriptionId` | Renew subscription      | Student         |
| `GET`    | `/me`                    | Get my subscription     | Student         |
| `DELETE` | `/cancel`                | Cancel subscription     | Student         |

---

## Reviews (`/reviews`)

**Base Path:** `/api/reviews`

| Method | Endpoint | Description     | Permitted Roles |
| :----- | :------- | :-------------- | :-------------- |
| `GET`  | `/`      | Get all reviews | Admin           |

---

## FAQ / Tickets (`/faq`)

**Base Path:** `/api/faq`

| Method   | Endpoint           | Description             | Permitted Roles         |
| :------- | :----------------- | :---------------------- | :---------------------- |
| `GET`    | `/`                | Get all FAQ messages    | Admin                   |
| `POST`   | `/`                | Send FAQ/Ticket         | Student                 |
| `GET`    | `/myFaqs`          | Get my FAQs             | Student, Teacher        |
| `GET`    | `/:ticketId`       | Get specific FAQ ticket | Student, Teacher        |
| `PATCH`  | `/:ticketId`       | Update FAQ ticket       | Student, Teacher        |
| `DELETE` | `/:ticketId`       | Delete FAQ ticket       | Admin, Student, Teacher |
| `POST`   | `/:ticketId/reply` | Reply to ticket         | Admin                   |

---

## Comments (`/comments`)

**Base Path:** `/api/comments`
_Note: Some comment routes are also under `/courses`._

| Method   | Endpoint                       | Description          | Permitted Roles |
| :------- | :----------------------------- | :------------------- | :-------------- |
| `GET`    | `/`                            | Get all comments     | Admin           |
| `PATCH`  | `/:commentId/lessons/:videoId` | Update comment       | Student         |
| `DELETE` | `/:commentId/lessons/:videoId` | Delete comment       | Student         |
| `POST`   | `/:commentId/replies`          | Add reply to comment | Teacher         |

---

## Coupons (`/coupons`)

**Base Path:** `/api/coupons`

| Method   | Endpoint         | Description        | Permitted Roles |
| :------- | :--------------- | :----------------- | :-------------- |
| `GET`    | `/`              | Get all coupons    | Admin           |
| `POST`   | `/`              | Create a coupon    | Admin           |
| `POST`   | `/use/:courseId` | Apply/Use a coupon | Public          |
| `DELETE` | `/:id`           | Delete a coupon    | Admin           |

---

## Notifications (`/notification`)

**Base Path:** `/api/notification`

| Method  | Endpoint            | Description               | Permitted Roles         |
| :------ | :------------------ | :------------------------ | :---------------------- |
| `GET`   | `/`                 | Get user notifications    | Student, Admin, Teacher |
| `PATCH` | `/:id/mark-as-read` | Mark notification as read | Student, Admin, Teacher |

---

## Admin (`/admin`)

**Base Path:** `/api/admin`

| Method | Endpoint | Description         | Permitted Roles |
| :----- | :------- | :------------------ | :-------------- |
| `GET`  | `/`      | Get Admin Analytics | Admin           |

---

## Teacher (`/teacher`)

**Base Path:** `/api/teacher`

| Method | Endpoint | Description           | Permitted Roles |
| :----- | :------- | :-------------------- | :-------------- |
| `GET`  | `/`      | Get Teacher Analytics | Teacher         |

---

## Chargily Payment (`/chargily`)

**Base Path:** `/api/chargily`

| Method | Endpoint | Description    | Permitted Roles |
| :----- | :------- | :------------- | :-------------- |
| `POST` | `/topup` | Create Payment | Student         |
