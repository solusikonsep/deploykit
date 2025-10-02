# DeployKit SaaS API

A Node.js REST API for a SaaS application with Better-SQLite3 for user management and deploykit.sh access.

## Features

- User registration and authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Access to deploykit.sh commands through API
- Protected endpoints for deploykit operations

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```env
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   DB_NAME=users.db
   ```

3. Start the server:
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

## API Endpoints

### User Management

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get JWT token
- `GET /api/users/me` - Get current user info (requires auth)

### DeployKit Access

- `POST /api/deploykit/run` - Run deploykit.sh with arguments (requires auth)
- `GET /api/deploykit/status` - Get deploykit status (requires auth)
- `POST /api/deploykit/deploy` - Deploy a project (requires auth)

### Health Check

- `GET /api/health` - Check API health status

## Example Usage

### Register a user:

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login:

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Access deploykit with auth token:

```bash
curl -X POST http://localhost:3000/api/deploykit/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "args": ["--help"]
  }'
```

## Security Notes

- Change the JWT_SECRET in production
- The API requires authentication for deploykit access
- Passwords are hashed using bcrypt
- Input validation is implemented for all endpoints