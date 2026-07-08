# School Scheduler

A full stack web application for managing school timetables, teachers, groups and modules.

This project was developed as a team project for the Higher Technician Degree in Web Application Development (DAW). It focuses on schedule creation, role-based access and timetable validation using a client-server architecture.

---

## Features

- User authentication with JWT
- Role-based permissions
- Teacher, group, course, module and department management
- Timetable creation with drag and drop
- Schedule conflict validation
- Teacher availability validation
- Group timetable visualization
- REST API built with Express
- SQLite relational database
- Image upload support for users and teachers

---

## Tech Stack

### Frontend

- HTML5
- CSS3
- TypeScript
- Vite

### Backend

- Node.js
- Express
- TypeScript
- REST API

### Database

- SQLite
- Knex.js
- Objection.js

### Authentication and files

- JWT
- bcryptjs
- Multer
- Sharp

### Tools

- Git
- GitLab
- Jira
- VS Code
- Postman

---

## Project Structure

```text
school-scheduler/
├── backend/
│   ├── app.ts
│   ├── engine/
│   ├── models/
│   ├── routes/
│   ├── types/
│   └── knexfile.ts
│
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── html/
│   ├── img/
│   └── ts/
│
└── README.md
```

---

## Main Modules

- **Departments**: manage school departments.
- **Cycles and courses**: organize academic structure.
- **Groups**: assign classrooms and timetable shifts.
- **Teachers**: manage teacher information and avatars.
- **Modules**: define weekly teaching hours and colors.
- **Timetables**: create and validate schedules.
- **Users**: manage access and permissions.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/cristianveradev/school-scheduler.git
cd school-scheduler
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
PORT=3000
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Run the backend:

```bash
npm run dev
```

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

This project uses environment variables for authentication and external services.

Do not upload your real `.env` file or Google OAuth credentials to GitHub.

Use `.env.example` as a reference.

---

## Screenshots

Screenshots will be added soon.

Recommended screenshots:

- Login page
- Dashboard
- Timetable view
- Drag and drop schedule creation
- User management

---

## Future Improvements

- Add automated tests
- Add Docker support
- Improve responsive design
- Add PostgreSQL support
- Add deployment documentation
- Add a public demo version

---

## Author

**Cristian Vera Rodríguez**

- GitHub: [@cristianveradev](https://github.com/cristianveradev)
- LinkedIn: [Cristian Vera Rodríguez](https://www.linkedin.com/in/cristian-vera-rodriguez-13299320b/)
- Email: cristianveradev@gmail.com
