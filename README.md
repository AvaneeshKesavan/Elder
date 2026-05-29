# Algnite

Welcome to the Algnite repository! We're currently in the exciting phase of building the foundational structure for our company's online presence.

---

# Algnite – Elder

Algnite – Elder Care is a web-based platform built to support elders with service bookings, profile management, and contact communication. The platform also includes an admin dashboard for managing system data.


## Features

- User registration and login
- Profile update with image upload
- Booking system for elder services
- Contact form for user inquiries
- Admin dashboard for system overview


## Technologies Used

- **Frontend:** HTML, CSS, JavaScript, EJS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **File Uploads:** Multer
- **Authentication:** Session-based


## Folder Structure

```
project-root/
│
├── public/            # Static assets (CSS, images)
├── views/             # EJS templates
├── app.js             # Entry file for the app
├── server.js          # MongoDB-backed application server
├── package.json       # Project dependencies
└── README.md
```

## Setup Notes

- Set `MONGODB_URI` to point at your MongoDB instance.
- The app uses sessions for authentication and Mongoose for persistence.
- Use `npm start` for production-style startup.
- Use `npm run dev` during development with automatic restarts.

Developer options:
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: set admin credentials for the seeded admin user.
- `RESET_DB=true`: when set, the app will wipe and reseed sample data on each startup (useful for demos).

## Stay Tuned!

This repository will evolve as we build and refine our online presence. We're excited about this initial phase and look forward to sharing our progress.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
