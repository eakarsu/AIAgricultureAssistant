const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database pool before requiring the app
jest.mock('../config/database', () => {
  const mockPool = {
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn()
  };
  return mockPool;
});

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
process.env.NODE_ENV = 'test';

const app = require('../server');
const pool = require('../config/database');

// Helper to generate a valid JWT
function generateToken(payload = { id: 1, email: 'test@test.com' }) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Routes', () => {
  // ========== POST /api/auth/login ==========
  describe('POST /api/auth/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 if user not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notfound@test.com', password: 'password123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should return 401 if password does not match', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@test.com', name: 'Test', password: hashedPassword, role: 'user' }]
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should return token on successful login', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@test.com', name: 'Test User', password: hashedPassword, role: 'user' }]
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@test.com');
      expect(res.body.message).toBe('Login successful');
    });
  });

  // ========== POST /api/auth/register ==========
  describe('POST /api/auth/register', () => {
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if user already exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@test.com', password: 'RuntimePass123!' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('User already exists with this email');
    });

    it('should register a new user and return token', async () => {
      // Check existing user - none found
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Insert user
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 2, email: 'new@test.com', name: 'New User', created_at: new Date().toISOString() }]
      });
      // Insert default settings
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Insert welcome notification
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'RuntimePass123!', name: 'New User' });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('new@test.com');
      expect(res.body.message).toBe('User registered successfully');
    });
  });

  // ========== GET /api/auth/me ==========
  describe('GET /api/auth/me', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should return user data with valid token', async () => {
      const token = generateToken();

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1, email: 'test@test.com', name: 'Test User',
          phone: null, farm_name: null, farm_size: null,
          location: null, bio: null, role: 'user',
          email_verified: false, created_at: new Date().toISOString()
        }]
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('test@test.com');
    });
  });

  // ========== GET /api/auth/profile ==========
  describe('GET /api/auth/profile', () => {
    it('should return profile for authenticated user', async () => {
      const token = generateToken();

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1, email: 'test@test.com', name: 'Test User',
          phone: '555-1234', farm_name: 'Test Farm', farm_size: '100 acres',
          location: 'Kansas', bio: 'Farmer', role: 'user',
          email_verified: true, created_at: new Date().toISOString()
        }]
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.profile.farm_name).toBe('Test Farm');
    });
  });

  // ========== PUT /api/auth/profile ==========
  describe('PUT /api/auth/profile', () => {
    it('should update profile', async () => {
      const token = generateToken();

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1, email: 'test@test.com', name: 'Updated Name',
          phone: '555-9999', farm_name: 'New Farm', farm_size: '200 acres',
          location: 'Iowa', bio: 'Updated bio', role: 'user',
          email_verified: true, created_at: new Date().toISOString()
        }]
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', farm_name: 'New Farm' });

      expect(res.statusCode).toBe(200);
      expect(res.body.profile.name).toBe('Updated Name');
    });
  });

  // ========== POST /api/auth/forgot-password ==========
  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('should return success even if email not found (prevents enumeration)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('If an account exists');
    });

    it('should create reset token for existing user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@test.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeUndefined();
      expect(res.body.message).toContain('If an account exists');
    });
  });

  // ========== POST /api/auth/reset-password ==========
  describe('POST /api/auth/reset-password', () => {
    it('should return 400 if token or password missing', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'abc' });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if password too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'abc', password: '12345' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('at least 12');
    });

    it('should return 400 if token is invalid or expired', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalidtoken', password: 'newpassword123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should reset password with valid token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, token: 'validtoken', used: false }]
      });
      pool.query.mockResolvedValueOnce({ rows: [] }); // update users
      pool.query.mockResolvedValueOnce({ rows: [] }); // update password_resets

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'validtoken', password: 'newpassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('reset successfully');
    });
  });

  // ========== POST /api/auth/refresh-token ==========
  describe('POST /api/auth/refresh-token', () => {
    it('should return new token for authenticated user', async () => {
      const token = generateToken();

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();

      // Verify the new token is valid
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(1);
    });
  });

});

// ========== Health & Docs Endpoints ==========
describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.version).toBe('2.0.0');
      expect(res.body.database).toBe('connected');
      expect(res.body.features).toBeInstanceOf(Array);
    });

    it('should report disconnected when db fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.database).toBe('disconnected');
    });
  });

  describe('GET /api/docs', () => {
    it('should return API documentation', async () => {
      const res = await request(app).get('/api/docs');

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('AI Agriculture Assistant API');
      expect(res.body.endpoints).toBeDefined();
      expect(res.body.endpoints.auth).toBeInstanceOf(Array);
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });
});

// ========== Middleware Tests ==========
describe('Auth Middleware', () => {
  it('should reject requests without authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('No authorization header');
  });

  it('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Invalid or expired');
  });

  it('should reject requests with expired token', async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'test@test.com' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );

    // Small delay to ensure token is expired
    await new Promise(resolve => setTimeout(resolve, 100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
  });
});
