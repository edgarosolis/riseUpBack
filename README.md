# RiseUpBack

A Node.js/Express REST API backend for an assessment and survey platform. Built with MongoDB for data persistence and AWS SES for email-based OTP authentication.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: MongoDB (via Mongoose)
- **Authentication**: Password-based + OTP via AWS SES
- **Validation**: express-validator
- **File Uploads**: express-fileupload

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (local or cloud)
- AWS account with SES configured (for OTP emails)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables (see Configuration section)
5. Start the server:
   ```bash
   # Development (with hot reload)
   npm run dev

   # Production
   npm start
   ```

The server runs on port 8080 by default.

## Configuration

Create a `.env` file with the following variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_CNN` | MongoDB connection string |
| `PORT` | Server port (default: 8080) |
| `AWS_REGION` | AWS region for SES (e.g., us-east-1) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `SES_SENDER_EMAIL` | Verified sender email for OTP |

## Project Structure

```
riseUpBack/
├── controllers/        # Request handlers
├── database/           # Database configuration
├── helpers/            # Utility functions and validators
├── middlewares/        # Express middleware
├── models/             # Mongoose schemas
├── public/             # Static files
├── routes/             # API route definitions
├── services/           # Business logic services
└── index.js            # Application entry point
```

## API Endpoints

All endpoints are prefixed with `/api`.

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User login with email/password |
| POST | `/loginAdmin` | Admin login with email/password |
| POST | `/request-otp` | Request OTP code via email |
| POST | `/verify-otp` | Verify OTP code |

### Users (`/api/user`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all users |
| GET | `/allUserAdmin` | Get all non-admin users |
| GET | `/:id` | Get user by ID |
| POST | `/` | Create new user |
| POST | `/bulk-upload` | Create users from CSV file |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Delete user |

### Assessments (`/api/assessment`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all assessments |
| GET | `/:id` | Get assessment by ID |
| POST | `/` | Create new assessment |
| PUT | `/:id` | Update assessment |
| DELETE | `/:id` | Delete assessment |

### Submissions (`/api/submission`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all submissions |
| GET | `/assessment/:assessmentId` | Get submissions by assessment |
| GET | `/user/:userId` | Get submissions by user |
| GET | `/active/user/:userId/assessmet/:assessmentId` | Get active submission |
| GET | `/:id` | Get submission by ID |
| POST | `/` | Create new submission |
| PUT | `/:id` | Update submission |
| DELETE | `/:id` | Delete submission |

### Results (`/api/result`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all results |
| GET | `/:id` | Get result by ID |
| POST | `/` | Create new result |
| PUT | `/:id` | Update result |
| DELETE | `/:id` | Delete result |

### Reports (`/api/report`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/assessment/:assessmentId/user/:userId` | Get report for user's assessment |

## Data Models

### User
- `firstName`, `lastName`: User's name
- `email`: Unique email address (required)
- `password`: Hashed password (required)
- `rol`: User role (default: "user")
- `permissions`: Array of permission strings
- `status`: Active status (default: true)

### Assessment
- `title`: Assessment title (required)
- `subtitle`, `description`: Additional text
- `image`: Cover image URL
- `sections`: Array of assessment sections with questions
- `active`: Active status (default: true)

### Submission
- `assessmentId`: Reference to Assessment
- `userId`: Reference to User
- `answers`: Array of user answers
- `finished`: Completion status
- `active`: Active status

## Development

```bash
# Run with nodemon for development
npm run dev

# Run in production mode
npm start
```

## License

ISC
