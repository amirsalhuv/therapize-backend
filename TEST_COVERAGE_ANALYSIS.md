# Test Coverage Analysis

## Executive Summary

**Current State: CRITICAL - 0% Unit Test Coverage**

The therapize-backend codebase has approximately **1,900+ lines of business logic** across 30+ source files with **zero unit tests**. The only existing test is a basic E2E smoke test that verifies the root endpoint returns "Hello World!".

For a healthcare application handling therapy sessions and patient data, this represents significant risk.

---

## Current Test Inventory

| Category | Files | Coverage |
|----------|-------|----------|
| Unit Tests (*.spec.ts) | 0 | 0% |
| Integration Tests | 0 | 0% |
| E2E Tests | 1 | Minimal |

### Existing E2E Test

```
test/app.e2e-spec.ts - Only tests GET / returns "Hello World!"
```

---

## Priority Areas for Test Coverage

### 🔴 Priority 1: Critical (Security & Authentication)

#### 1.1 AuthService (`src/modules/auth/auth.service.ts` - 378 lines)

**Why Critical:** Contains all authentication logic including password hashing, JWT generation, and email verification. Security vulnerabilities here could expose user data.

| Method | Lines | Recommended Tests |
|--------|-------|-------------------|
| `register()` | 24-79 | - Successful registration creates user with hashed password<br>- Email normalization (lowercase)<br>- Conflict error on duplicate email<br>- Email verification token created with 24h expiry<br>- Default role is PATIENT<br>- Status is PENDING_VERIFICATION |
| `login()` | 81-140 | - Successful login returns tokens<br>- Invalid email throws UnauthorizedException<br>- Invalid password throws UnauthorizedException<br>- Pending verification blocks login<br>- Inactive account blocks login<br>- Last login timestamp updated<br>- Device info and IP recorded |
| `verifyEmail()` | 228-263 | - Valid token activates user<br>- Invalid token throws BadRequestException<br>- Already used token rejected<br>- Expired token rejected<br>- Transaction properly updates user and token |
| `generateTokens()` | 302-351 | - Access token expires in 15 minutes<br>- Refresh token expires in 7 days<br>- Refresh token stored in database<br>- JWT payload contains correct claims |
| `calculateExpirationDate()` | 353-377 | - Parses seconds, minutes, hours, days<br>- Falls back to 7 days on invalid input |

#### 1.2 JWT Guards & Strategies

| File | Recommended Tests |
|------|-------------------|
| `jwt-auth.guard.ts` | - Public routes bypass authentication<br>- Protected routes require valid token<br>- Delegates to passport for token validation |
| `roles.guard.ts` | - No required roles allows access<br>- Missing user denies access<br>- User without matching role denied<br>- User with matching role allowed<br>- Multiple roles work correctly |
| `jwt.strategy.ts` | - Valid payload returns user<br>- User not found throws UnauthorizedException<br>- Inactive user throws UnauthorizedException |
| `jwt-refresh.strategy.ts` | - Valid refresh token accepted<br>- Revoked token rejected<br>- Expired token rejected |

---

### 🟠 Priority 2: High (Core Business Logic)

#### 2.1 SessionsService (`src/modules/sessions/sessions.service.ts` - 118 lines)

**Why High:** Manages therapy session lifecycle - critical for patient care tracking.

| Method | Recommended Tests |
|--------|-------------------|
| `startSession()` | - Only SCHEDULED sessions can start<br>- Status changes to IN_PROGRESS<br>- startedAt timestamp set |
| `completeSession()` | - Only IN_PROGRESS sessions can complete<br>- Duration calculated correctly<br>- Status changes to COMPLETED<br>- completedAt timestamp set |
| `submitFeedback()` | - Feedback accepted for COMPLETED sessions<br>- Feedback accepted for IN_PROGRESS sessions<br>- Other statuses rejected<br>- Upsert behavior (create/update) |
| `getTodaySession()` | - Finds session for patient on current date<br>- Returns null when no session scheduled |
| `findAll()` | - Pagination works correctly<br>- Episode filtering works<br>- Results ordered by date descending |

#### 2.2 UsersService (`src/modules/users/users.service.ts`)

| Method | Recommended Tests |
|--------|-------------------|
| `findAll()` | - Pagination parameters applied<br>- Soft-deleted users excluded |
| `findOne()` | - Returns user by ID<br>- Throws NotFoundException for missing user |
| `create()` | - Password hashed correctly<br>- Default values applied |
| `update()` | - Partial updates work<br>- Returns updated user |
| `remove()` | - Soft delete (sets deletedAt)<br>- Returns removed user |
| `updateRoles()` | - Updates roles array |

---

### 🟡 Priority 3: Medium (Domain Services)

#### 3.1 PatientsService (`src/modules/patients/patients.service.ts`)

| Method | Recommended Tests |
|--------|-------------------|
| `create()` | - Creates patient profile linked to user |
| `findOne()` | - Returns with user relation<br>- NotFoundException for missing |
| `getEpisodes()` | - Returns program episodes for patient |
| `getSessions()` | - Returns sessions across all episodes |

#### 3.2 TherapistsService (`src/modules/therapists/therapists.service.ts`)

| Method | Recommended Tests |
|--------|-------------------|
| `create()` | - Creates therapist profile with specializations |
| `getPatients()` | - Returns assigned patients |
| `getActiveEpisodes()` | - Filters for active episodes only |

---

### 🟢 Priority 4: Standard (Controllers & DTOs)

#### Controller Integration Tests

Each controller should have integration tests verifying:
- Route authorization (public vs protected)
- Role-based access control
- Input validation (DTOs)
- Error handling
- Response structure

| Controller | Endpoints to Test |
|------------|-------------------|
| AuthController | POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me, POST /auth/verify-email, POST /auth/resend-verification |
| UsersController | GET /users, GET /users/:id, POST /users, PATCH /users/:id, DELETE /users/:id |
| PatientsController | GET /patients, GET /patients/:id, POST /patients, PATCH /patients/:id, DELETE /patients/:id, GET /patients/:id/episodes |
| TherapistsController | GET /therapists, GET /therapists/:id, POST /therapists, PATCH /therapists/:id, GET /therapists/:id/patients |
| SessionsController | GET /sessions, GET /sessions/:id, POST /sessions, POST /sessions/:id/start, POST /sessions/:id/complete, POST /sessions/:id/feedback |

---

## Recommended Test File Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.spec.ts          # Unit tests for AuthService
│   │   ├── auth.controller.spec.ts       # Integration tests for AuthController
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.spec.ts
│   │   │   └── roles.guard.spec.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.spec.ts
│   │       └── jwt-refresh.strategy.spec.ts
│   ├── users/
│   │   ├── users.service.spec.ts
│   │   └── users.controller.spec.ts
│   ├── patients/
│   │   ├── patients.service.spec.ts
│   │   └── patients.controller.spec.ts
│   ├── therapists/
│   │   ├── therapists.service.spec.ts
│   │   └── therapists.controller.spec.ts
│   └── sessions/
│       ├── sessions.service.spec.ts
│       └── sessions.controller.spec.ts
├── database/
│   └── prisma.service.spec.ts
test/
├── app.e2e-spec.ts                       # Existing
├── auth.e2e-spec.ts                      # Full auth flow E2E
├── sessions.e2e-spec.ts                  # Session lifecycle E2E
└── jest-e2e.json
```

---

## Specific Test Cases to Implement

### AuthService - Critical Test Scenarios

```typescript
// auth.service.spec.ts - Example test structure

describe('AuthService', () => {
  describe('register', () => {
    it('should create a user with hashed password');
    it('should normalize email to lowercase');
    it('should throw ConflictException for duplicate email');
    it('should create email verification token with 24h expiry');
    it('should assign PATIENT role by default');
    it('should set status to PENDING_VERIFICATION');
  });

  describe('login', () => {
    it('should return tokens for valid credentials');
    it('should throw UnauthorizedException for non-existent email');
    it('should throw UnauthorizedException for wrong password');
    it('should reject login for PENDING_VERIFICATION status');
    it('should reject login for non-ACTIVE status');
    it('should update lastLoginAt timestamp');
    it('should record device info and IP address');
  });

  describe('verifyEmail', () => {
    it('should activate user with valid token');
    it('should throw BadRequestException for invalid token');
    it('should throw BadRequestException for already used token');
    it('should throw BadRequestException for expired token');
    it('should use transaction to update user and token atomically');
  });

  describe('refreshTokens', () => {
    it('should revoke old token and generate new pair');
    it('should throw UnauthorizedException if user not found');
  });

  describe('logout', () => {
    it('should revoke specific refresh token');
    it('should succeed even without token ID');
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens for user');
  });
});
```

### RolesGuard - Security Test Scenarios

```typescript
// roles.guard.spec.ts - Example test structure

describe('RolesGuard', () => {
  it('should allow access when no roles are required');
  it('should deny access when user is missing');
  it('should deny access when user has no roles');
  it('should deny access when user lacks required role');
  it('should allow access when user has one of required roles');
  it('should work with multiple required roles (OR logic)');
});
```

### SessionsService - Business Logic Tests

```typescript
// sessions.service.spec.ts - Example test structure

describe('SessionsService', () => {
  describe('startSession', () => {
    it('should start a SCHEDULED session');
    it('should throw BadRequestException for IN_PROGRESS session');
    it('should throw BadRequestException for COMPLETED session');
    it('should set startedAt timestamp');
  });

  describe('completeSession', () => {
    it('should complete an IN_PROGRESS session');
    it('should calculate duration in minutes');
    it('should throw BadRequestException for SCHEDULED session');
    it('should throw BadRequestException for already COMPLETED session');
  });

  describe('submitFeedback', () => {
    it('should create feedback for COMPLETED session');
    it('should update existing feedback (upsert)');
    it('should allow feedback for IN_PROGRESS session');
    it('should reject feedback for SCHEDULED session');
  });
});
```

---

## E2E Test Expansion

### Recommended E2E Test Flows

1. **Complete Authentication Flow**
   - Register → Verify Email → Login → Access Protected Route → Refresh Token → Logout

2. **Session Lifecycle Flow**
   - Create Session → Start Session → Complete Session → Submit Feedback

3. **Role-Based Access**
   - PATIENT can access patient routes
   - THERAPIST can access therapist routes
   - ADMIN can access all routes
   - Cross-role access denied

4. **Error Handling**
   - Invalid input validation
   - Unauthorized access attempts
   - Not found resources

---

## Coverage Goals

| Phase | Target | Focus |
|-------|--------|-------|
| Phase 1 | 40% | AuthService, Guards, Strategies |
| Phase 2 | 60% | All Services |
| Phase 3 | 75% | Controllers + Integration |
| Phase 4 | 85%+ | E2E + Edge Cases |

---

## Testing Dependencies (Already Installed)

- `@nestjs/testing` v11.0.1 ✓
- `jest` v30.0.0 ✓
- `ts-jest` v29.2.5 ✓
- `supertest` v7.0.0 ✓
- `@types/jest` v30.0.0 ✓

---

## Recommended Next Steps

1. **Immediate:** Create `auth.service.spec.ts` with mocked Prisma and JWT service
2. **Week 1:** Complete all Priority 1 (security) tests
3. **Week 2:** Complete Priority 2 (core business) tests
4. **Week 3:** Add controller integration tests
5. **Week 4:** Expand E2E tests for complete flows

---

## Notes on Mocking Strategy

### Prisma Mocking

```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  emailVerificationToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

### JWT Service Mocking

```typescript
const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};
```

---

*Generated: January 2026*
