<div align="center">

# 📚 School Scheduler

### Web application for creating and managing school timetables

A full-stack web application developed as the Final Degree Project (DAW) that allows educational institutions to create, organize and manage class schedules with drag & drop, teacher availability validation and role-based access.

![Banner](assets/screenshots/15-calendar-complete.png)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge)
![License](https://img.shields.io/badge/license-Educational-blue?style=for-the-badge)

</div>

---

# 📑 Table of Contents

- About
- Features
- Demo
- Screenshots
- Technologies
- Architecture
- Installation
- User Roles
- Project Structure
- Future Improvements
- Authors

---

# 📖 About

School Scheduler is a web application developed to simplify the creation and management of school timetables.

The application allows administrators to:

- Manage departments
- Manage courses
- Manage groups
- Create modules
- Assign teachers
- Configure time slots
- Generate schedules using Drag & Drop
- Prevent timetable conflicts automatically

The project was developed as the Final Degree Project for the Higher Vocational Training in Web Application Development (DAW).

---

# ✨ Features

## Authentication

- JWT Authentication
- Google OAuth Login
- Password encryption (bcrypt)

---

## User Management

- Super Administrator
- Administrator
- Read-only User

---

## Academic Management

- Departments
- Cycles
- Courses
- Groups
- Subjects (Modules)
- Teachers

---

## Timetable Management

- Drag & Drop scheduling
- Teacher availability validation
- Module hour validation
- Automatic conflict detection
- Visual timetable

---

## Image Uploads

- User avatars
- Image compression using Sharp
- Multer upload system

---

# 🎥 Demo

## Drag & Drop

![Drag & Drop](assets/gifs/13-drag-drop.gif)

---

## Moving a module

![Move Module](assets/gifs/17-move-module.gif)

---

## Removing a module

![Remove Module](assets/gifs/18-remove-module.gif)

---

## Calendar filters

![Filters](assets/gifs/11-calendar-filters.gif)

---

# 🖼️ Screenshots

## Login

![Login](assets/screenshots/01-1-login.png)

---

## Google Authentication

![Google Login](assets/screenshots/01-2-login_google.png)

---

## Dashboard

![Dashboard](assets/screenshots/02-dashboard.png)

---

## Academic hierarchy

![Departments](assets/screenshots/03-departments.png)

![Cycles](assets/screenshots/04-cycles.png)

![Courses](assets/screenshots/05-courses.png)

![Groups](assets/screenshots/06-groups.png)

---

## Modules

![Modules](assets/screenshots/07-modules.png)

---

## Time Slots

![Time Slots](assets/screenshots/08-time-slots.png)

---

## Teachers

![Teachers](assets/screenshots/09-teachers.png)

---

## Teacher Assignment

![Assignment](assets/screenshots/10-assign-teachers.png)

---

## Empty Calendar

![Calendar](assets/screenshots/12-empty-calendar.png)

---

## Module Validation

![Validation](assets/screenshots/14-full-module.png)

---

## Completed Schedule

![Completed](assets/screenshots/15-calendar-complete.png)

---

## Conflict Validation

![Validation](assets/screenshots/16-calendar-validation.png)

---

## User Management

![Users](assets/screenshots/19-users.png)

---

# 🛠 Technologies

## Frontend

- HTML5
- CSS3
- TypeScript
- Vite

## Backend

- Node.js
- Express
- TypeScript
- REST API

## Database

- SQLite
- Knex.js
- Objection.js

## Authentication and files

- JWT
- bcryptjs
- Google OAuth

## Image Processing

- Multer
- Sharp

## Tools

- Git
- GitLab
- Jira
- VS Code
- Postman

---

# 🏗 Architecture

```
Frontend (Vite + TypeScript)
        │
 REST API (Express)
        │
 Authentication (JWT)
        │
SQLite Database
        │
Knex + Objection ORM
```

---

# 👥 User Roles

| Role | Permissions |
|------|-------------|
| Super Admin | Full system management |
| Admin | Academic management |
| Read Only | View schedules |

---

# 📂 Project Structure

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
├── assets
│   ├── gifs
│   ├── screenshots
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

# 🚀 Installation

## Clone the repository

```bash
git clone https://github.com/cristianveradev/school-scheduler.git
```

## Install backend

```bash
cd backend
npm install
```

## Install frontend

```bash
cd frontend
npm install
```

## Run backend

```bash
npm run dev
```

## Run frontend

```bash
npm run dev
```

---

# 🚧 Future Improvements

- Export timetable to PDF
- Responsive mobile version
- Dark mode
- Notifications
- Automatic timetable generation
- Statistics dashboard

---

# 👨‍💻 Authors

**Cristian Vera Rodríguez**

Final Degree Project (DAW)

IES Badia del Vallès

2026

- GitHub: [@cristianveradev](https://github.com/cristianveradev)
- LinkedIn: [Cristian Vera Rodríguez](https://www.linkedin.com/in/cristian-vera-rodriguez-13299320b/)
- Email: cristianveradev@gmail.com
