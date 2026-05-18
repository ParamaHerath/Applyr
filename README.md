# Applyr

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Applyr is a modern, premium web application designed to help you track and manage your job applications effectively. Built with a decoupled architecture featuring a Next.js App Router frontend and a Spring Boot REST API backend.

## Features (MVP Phase 1)
- **Authentication**: Secure JWT-based Login and Registration.
- **Dashboard Overview**: Dynamic tracking statistics (Total Applications, Interviewing, Offers, Rejected).
- **Application Tracker**: Create, view, and delete job applications.
- **Premium UI**: Glassmorphic elements, smooth animations via Framer Motion, and a Dark/Light mode toggle.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Java (v21)
- PostgreSQL (Local or Docker)

### 1. Database Setup
Create a PostgreSQL database named `applyr`:
```sql
CREATE DATABASE applyr;
```
Ensure your `application.properties` file in the backend points to the correct postgres user and password.

### 2. Backend (Spring Boot)
Navigate to the `backend` directory and run the Spring Boot application:
```bash
cd backend
./mvnw spring-boot:run
```
The backend API will start on `http://localhost:8080`.

### 3. Frontend (Next.js)
Navigate to the `frontend` directory, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## Architecture
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, Lucide React, Framer Motion.
- **Backend**: Spring Boot 3, Spring Data JPA, Spring Security (JWT), PostgreSQL.