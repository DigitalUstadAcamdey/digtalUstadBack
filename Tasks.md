## 📌 Project Tasks

---

### 🛡️ 1. Subscription Model

- Create a Subscription model
- Each subscription links:
  - user
  - course
- Track subscription lifecycle with dates and status

Fields:
- user (ObjectId → User)
- course (ObjectId → Course)
- startDate
- endDate
- status (active | expired | cancelled)
- createdAt

---

### 🧠 2. Business Logic Rules

- User must have:
  1. Purchased / enrolled in course
  2. Active subscription
  3. Valid endDate

- Access is denied if:
  - Subscription does not exist
  - Status !== active
  - endDate < now

---

### 🔐 3. Access Control (Middleware)

- Create middleware:
  - checkCourseEnrollment (Optional)
  - checkSubscriptionValidity (Optional)

- Middleware responsibilities:
  - Protect course content routes
  - Act as real-time access gate
  - Never modify database state

---

### ⏱️ 4. Cron Job (Subscription Maintenance)

- Run cron job periodically (once per day)
- Cron responsibilities:
  - Find expired subscriptions
  - Update status to "expired"
  - remove course access
  - send notification 


---


