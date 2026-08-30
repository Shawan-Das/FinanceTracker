"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// server/dist/middleware/rateLimit.js
var require_rateLimit = __commonJS({
  "server/dist/middleware/rateLimit.js"(exports2) {
    "use strict";
    var __importDefault2 = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sensitiveLimiter = exports2.authLimiter = exports2.apiLimiter = void 0;
    var express_rate_limit_1 = __importDefault2(require("express-rate-limit"));
    exports2.apiLimiter = (0, express_rate_limit_1.default)({
      windowMs: 1 * 60 * 1e3,
      // 1 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later."
        }
      }
    });
    exports2.authLimiter = (0, express_rate_limit_1.default)({
      windowMs: 15 * 60 * 1e3,
      // 15 minutes
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many authentication attempts. Please try again in 15 minutes."
        }
      }
    });
    exports2.sensitiveLimiter = (0, express_rate_limit_1.default)({
      windowMs: 15 * 60 * 1e3,
      // 15 minutes
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many attempts. Please try again in 15 minutes."
        }
      }
    });
  }
});

// server/dist/database/connection.js
var require_connection = __commonJS({
  "server/dist/database/connection.js"(exports2) {
    "use strict";
    var __importDefault2 = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.db = void 0;
    var pg_1 = __importDefault2(require("pg"));
    var dotenv_12 = __importDefault2(require("dotenv"));
    dotenv_12.default.config();
    var pool = new pg_1.default.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 2e3
    });
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
    exports2.db = {
      query: (text, params) => pool.query(text, params),
      getClient: () => pool.connect(),
      pool
    };
    exports2.default = exports2.db;
  }
});

// server/dist/shared/id.js
var require_id = __commonJS({
  "server/dist/shared/id.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateId = generateId;
    exports2.getIdPrefix = getIdPrefix;
    exports2.isValidId = isValidId;
    var ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    function randomString(length) {
      let result = "";
      const bytes = new Uint8Array(length);
      if (typeof globalThis.crypto?.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(bytes);
      } else {
        const { randomBytes } = require("crypto");
        const buf = randomBytes(length);
        for (let i = 0; i < length; i++)
          bytes[i] = buf[i];
      }
      for (let i = 0; i < length; i++) {
        result += ALPHABET[bytes[i] % ALPHABET.length];
      }
      return result;
    }
    var PREFIXES = {
      users: "usr",
      email_verifications: "evt",
      login_attempts: "lat",
      accounts: "acc",
      people: "per",
      categories: "cat",
      loans: "ln",
      transactions: "txn",
      transaction_transfers: "tfr",
      loan_repayments: "lre"
    };
    function generateId(table) {
      const prefix = PREFIXES[table];
      return `${prefix}_${randomString(12)}`;
    }
    function getIdPrefix(id) {
      const underscore = id.indexOf("_");
      if (underscore === -1)
        return void 0;
      return id.substring(0, underscore);
    }
    function isValidId(id) {
      const underscore = id.indexOf("_");
      if (underscore === -1)
        return false;
      const prefix = id.substring(0, underscore);
      const rest = id.substring(underscore + 1);
      return rest.length === 12 && /^[a-zA-Z0-9]{12}$/.test(rest);
    }
  }
});

// server/dist/database/seed.js
var require_seed = __commonJS({
  "server/dist/database/seed.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.seedDefaultCategories = seedDefaultCategories;
    var connection_1 = require_connection();
    var id_1 = require_id();
    var SCHEMA = "finance_tracker";
    var DEFAULT_INCOME_CATEGORIES = [
      "Salary",
      "Bonus",
      "Freelance",
      "Business Income",
      "Gift Received",
      "Interest",
      "Other Income"
    ];
    var DEFAULT_EXPENSE_CATEGORIES = [
      "Food",
      "Transport",
      "Rent",
      "Shopping",
      "Utilities",
      "Entertainment",
      "Education",
      "Medical",
      "Other Expense"
    ];
    async function seedDefaultCategories(userId) {
      const client = await connection_1.db.getClient();
      try {
        await client.query("BEGIN");
        for (const name of DEFAULT_INCOME_CATEGORIES) {
          const id = (0, id_1.generateId)("categories");
          await client.query(`INSERT INTO ${SCHEMA}.categories (id, user_id, name, type)
         VALUES ($1, $2, $3, 'INCOME')
         ON CONFLICT (user_id, name, type) DO NOTHING`, [id, userId, name]);
        }
        for (const name of DEFAULT_EXPENSE_CATEGORIES) {
          const id = (0, id_1.generateId)("categories");
          await client.query(`INSERT INTO ${SCHEMA}.categories (id, user_id, name, type)
         VALUES ($1, $2, $3, 'EXPENSE')
         ON CONFLICT (user_id, name, type) DO NOTHING`, [id, userId, name]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  }
});

// server/dist/shared/token.js
var require_token = __commonJS({
  "server/dist/shared/token.js"(exports2) {
    "use strict";
    var __importDefault2 = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.signToken = signToken;
    exports2.verifyToken = verifyToken;
    exports2.setTokenCookie = setTokenCookie;
    exports2.clearTokenCookie = clearTokenCookie;
    exports2.getTokenFromCookie = getTokenFromCookie;
    var jsonwebtoken_1 = __importDefault2(require("jsonwebtoken"));
    var cookie_1 = __importDefault2(require("cookie"));
    var JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret-change-in-production";
    var JWT_EXPIRY = "7d";
    var COOKIE_NAME = "token";
    function signToken(userId) {
      return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    }
    function verifyToken(token) {
      try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
      } catch {
        return null;
      }
    }
    function setTokenCookie(res, token) {
      const isProduction2 = process.env.NODE_ENV === "production";
      const cookieStr = cookie_1.default.serialize(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction2,
        sameSite: isProduction2 ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60,
        // 7 days in seconds
        path: "/"
      });
      res.setHeader("Set-Cookie", cookieStr);
    }
    function clearTokenCookie(res) {
      const isProduction2 = process.env.NODE_ENV === "production";
      const cookieStr = cookie_1.default.serialize(COOKIE_NAME, "", {
        httpOnly: true,
        secure: isProduction2,
        sameSite: isProduction2 ? "strict" : "lax",
        maxAge: 0,
        path: "/"
      });
      res.setHeader("Set-Cookie", cookieStr);
    }
    function getTokenFromCookie(cookieHeader) {
      if (!cookieHeader)
        return null;
      const parsed = cookie_1.default.parse(cookieHeader);
      return parsed[COOKIE_NAME] || null;
    }
  }
});

// server/dist/middleware/auth.js
var require_auth = __commonJS({
  "server/dist/middleware/auth.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.requireAuth = requireAuth;
    exports2.getUserId = getUserId;
    var token_1 = require_token();
    function requireAuth(req, res, next) {
      const token = (0, token_1.getTokenFromCookie)(req.headers.cookie);
      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to access this resource"
          }
        });
        return;
      }
      const payload = (0, token_1.verifyToken)(token);
      if (!payload) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Your session has expired. Please log in again."
          }
        });
        return;
      }
      req.userId = payload.userId;
      next();
    }
    function getUserId(req) {
      const userId = req.userId;
      if (!userId) {
        throw new Error("Not authenticated");
      }
      return userId;
    }
  }
});

// server/dist/middleware/validation.js
var require_validation = __commonJS({
  "server/dist/middleware/validation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateBody = validateBody;
    exports2.validateQuery = validateQuery;
    function validateBody(schema) {
      return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
          const firstError = result.error.errors[0];
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: firstError?.message || "Invalid input"
            }
          });
          return;
        }
        req.body = result.data;
        next();
      };
    }
    function validateQuery(schema) {
      return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
          const firstError = result.error.errors[0];
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: firstError?.message || "Invalid query parameters"
            }
          });
          return;
        }
        req.query = result.data;
        next();
      };
    }
  }
});

// server/dist/services/lockout.js
var require_lockout = __commonJS({
  "server/dist/services/lockout.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isAccountLocked = isAccountLocked;
    exports2.recordFailedLogin = recordFailedLogin;
    exports2.resetFailedLogins = resetFailedLogins;
    var connection_1 = require_connection();
    var id_1 = require_id();
    var SCHEMA = "finance_tracker";
    var MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10);
    var LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || "10", 10);
    async function isAccountLocked(email) {
      const result = await connection_1.db.query(`SELECT is_locked, locked_until
     FROM ${SCHEMA}.users
     WHERE email = $1`, [email]);
      if (result.rows.length === 0) {
        return { locked: false };
      }
      const user = result.rows[0];
      if (!user.is_locked || !user.locked_until) {
        return { locked: false };
      }
      const lockExpiry = new Date(user.locked_until);
      const now = /* @__PURE__ */ new Date();
      if (now >= lockExpiry) {
        await connection_1.db.query(`UPDATE ${SCHEMA}.users
       SET is_locked = FALSE, locked_until = NULL, failed_login_attempts = 0
       WHERE email = $1`, [email]);
        return { locked: false };
      }
      const remainingSeconds = Math.ceil((lockExpiry.getTime() - now.getTime()) / 1e3);
      return { locked: true, remainingSeconds };
    }
    async function recordFailedLogin(email, ipAddress) {
      const id = (0, id_1.generateId)("login_attempts");
      await connection_1.db.query(`INSERT INTO ${SCHEMA}.login_attempts (id, email, ip_address, success)
     VALUES ($1, $2, $3, FALSE)`, [id, email, ipAddress || null]);
      const result = await connection_1.db.query(`UPDATE ${SCHEMA}.users
     SET failed_login_attempts = failed_login_attempts + 1,
         last_failed_login = NOW(),
         updated_at = NOW()
     WHERE email = $1
     RETURNING failed_login_attempts`, [email]);
      if (result.rows.length === 0) {
        return { locked: false, attemptsRemaining: MAX_ATTEMPTS };
      }
      const attempts = result.rows[0].failed_login_attempts;
      const attemptsRemaining = MAX_ATTEMPTS - attempts;
      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1e3);
        await connection_1.db.query(`UPDATE ${SCHEMA}.users
       SET is_locked = TRUE, locked_until = $1, updated_at = NOW()
       WHERE email = $2`, [lockUntil, email]);
        return { locked: true, attemptsRemaining: 0, lockDurationMinutes: LOCKOUT_MINUTES };
      }
      return { locked: false, attemptsRemaining };
    }
    async function resetFailedLogins(email) {
      await connection_1.db.query(`UPDATE ${SCHEMA}.users
     SET failed_login_attempts = 0,
         is_locked = FALSE,
         locked_until = NULL,
         last_failed_login = NULL,
         updated_at = NOW()
     WHERE email = $1`, [email]);
      const id = (0, id_1.generateId)("login_attempts");
      await connection_1.db.query(`INSERT INTO ${SCHEMA}.login_attempts (id, email, success)
     VALUES ($1, $2, TRUE)`, [id, email]);
    }
  }
});

// server/dist/services/email.js
var require_email = __commonJS({
  "server/dist/services/email.js"(exports2) {
    "use strict";
    var __importDefault2 = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sendEmail = sendEmail;
    exports2.sendVerificationCode = sendVerificationCode;
    exports2.generateVerificationCode = generateVerificationCode;
    var nodemailer_1 = __importDefault2(require("nodemailer"));
    var dotenv_12 = __importDefault2(require("dotenv"));
    dotenv_12.default.config();
    var transporter = nodemailer_1.default.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    transporter.verify().then(() => {
      console.log("\u2705 Email server connected");
    }).catch((err) => {
      console.warn("\u26A0\uFE0F  Email server not available:", err.message);
      console.warn("   Emails will be logged to console instead.");
    });
    var isEmailConfigured = !!process.env.SMTP_USER && process.env.SMTP_USER !== "your-ethereal-user@ethereal.email";
    function verificationEmailHtml(code, purpose) {
      const title = purpose === "registration" ? "Verify Your Email" : "Reset Your Password";
      const body = purpose === "registration" ? "Thank you for signing up! Use the code below to verify your email address." : "You requested a password reset. Use the code below to set a new password.";
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #0284c7; padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .body { padding: 32px; }
    .code { background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .code span { font-size: 32px; font-weight: bold; color: #0c4a6e; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .text { color: #374151; line-height: 1.6; font-size: 14px; }
    .footer { padding: 16px 32px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\u{1F4B0} Finance Tracker</h1>
    </div>
    <div class="body">
      <h2 style="color: #111827; margin-top: 0;">${title}</h2>
      <p class="text">${body}</p>
      <div class="code">
        <span>${code}</span>
      </div>
      <p class="text">This code expires in <strong>15 minutes</strong>.</p>
      <p class="text">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Personal Finance Tracker &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
    }
    function verificationEmailText(code, purpose) {
      const title = purpose === "registration" ? "Verify Your Email" : "Reset Your Password";
      const body = purpose === "registration" ? "Thank you for signing up! Use the code below to verify your email address." : "You requested a password reset. Use the code below to set a new password.";
      return `
${title}
Finance Tracker

${body}

Your verification code: ${code}

This code expires in 15 minutes.

If you didn't request this, you can safely ignore this email.
  `.trim();
    }
    async function sendEmail(options) {
      try {
        if (!isEmailConfigured) {
          console.log("\n\u{1F4E7} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
          console.log(`   To: ${options.to}`);
          console.log(`   Subject: ${options.subject}`);
          console.log("   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
          const codeMatch = options.text.match(/code:\s*(\w+)/i);
          if (codeMatch) {
            console.log(`   \u{1F511} Verification Code: ${codeMatch[1]}`);
          }
          console.log("   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
          return true;
        }
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Finance Tracker <noreply@financetracker.com>",
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        });
        return true;
      } catch (error) {
        console.error("Failed to send email:", error);
        return false;
      }
    }
    async function sendVerificationCode(email, code, purpose) {
      const subject = purpose === "registration" ? "Verify Your Email - Finance Tracker" : "Reset Your Password - Finance Tracker";
      return sendEmail({
        to: email,
        subject,
        html: verificationEmailHtml(code, purpose),
        text: verificationEmailText(code, purpose)
      });
    }
    function generateVerificationCode() {
      return Math.floor(1e5 + Math.random() * 9e5).toString();
    }
  }
});

// server/dist/routes/auth.js
var require_auth2 = __commonJS({
  "server/dist/routes/auth.js"(exports2) {
    "use strict";
    var __importDefault2 = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var bcrypt_1 = __importDefault2(require("bcrypt"));
    var zod_1 = require("zod");
    var connection_1 = require_connection();
    var seed_1 = require_seed();
    var auth_12 = require_auth();
    var validation_1 = require_validation();
    var rateLimit_12 = require_rateLimit();
    var lockout_1 = require_lockout();
    var email_1 = require_email();
    var id_1 = require_id();
    var token_1 = require_token();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    var CODE_EXPIRY_MINUTES = parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || "15", 10);
    async function createVerificationCode(userId, purpose) {
      await connection_1.db.query(`UPDATE ${SCHEMA}.email_verifications
     SET used = TRUE
     WHERE user_id = $1 AND purpose = $2 AND used = FALSE`, [userId, purpose]);
      const code = (0, email_1.generateVerificationCode)();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1e3);
      const id = (0, id_1.generateId)("email_verifications");
      await connection_1.db.query(`INSERT INTO ${SCHEMA}.email_verifications (id, user_id, code, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)`, [id, userId, code, purpose, expiresAt]);
      return code;
    }
    var registerSchema = zod_1.z.object({
      full_name: zod_1.z.string().min(1, "Full name is required").max(255),
      email: zod_1.z.string().email("Invalid email address").max(255),
      password: zod_1.z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number"),
      confirm_password: zod_1.z.string()
    }).refine((data) => data.password === data.confirm_password, {
      message: "Passwords do not match",
      path: ["confirm_password"]
    });
    router.post("/register", rateLimit_12.authLimiter, (0, validation_1.validateBody)(registerSchema), async (req, res) => {
      try {
        const { full_name, email, password } = req.body;
        const existing = await connection_1.db.query(`SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`, [email]);
        if (existing.rows.length > 0) {
          const user2 = existing.rows[0];
          if (user2.is_verified) {
            res.status(409).json({
              success: false,
              error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" }
            });
            return;
          }
          const code2 = await createVerificationCode(user2.id, "registration");
          await (0, email_1.sendVerificationCode)(email, code2, "registration");
          res.status(200).json({
            success: true,
            data: {
              message: "Account already pending verification. A new code has been sent.",
              user_id: user2.id,
              email
            }
          });
          return;
        }
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        const userId = (0, id_1.generateId)("users");
        const result = await connection_1.db.query(`INSERT INTO ${SCHEMA}.users (id, full_name, email, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, full_name, email`, [userId, full_name, email, passwordHash]);
        const user = result.rows[0];
        const code = await createVerificationCode(user.id, "registration");
        await (0, email_1.sendVerificationCode)(email, code, "registration");
        res.status(201).json({
          success: true,
          data: {
            message: "Account created. Please check your email for a verification code.",
            user_id: user.id,
            email
          }
        });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    var verifyEmailSchema = zod_1.z.object({
      email: zod_1.z.string().email(),
      code: zod_1.z.string().length(6, "Code must be 6 digits")
    });
    router.post("/verify-email", rateLimit_12.sensitiveLimiter, (0, validation_1.validateBody)(verifyEmailSchema), async (req, res) => {
      try {
        const { email, code } = req.body;
        const userResult = await connection_1.db.query(`SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`, [email]);
        if (userResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "INVALID_CODE", message: "Invalid verification code" }
          });
          return;
        }
        const user = userResult.rows[0];
        if (user.is_verified) {
          (0, token_1.setTokenCookie)(res, (0, token_1.signToken)(user.id));
          res.status(200).json({
            success: true,
            data: { message: "Email already verified. You are logged in.", user_id: user.id }
          });
          return;
        }
        const codeResult = await connection_1.db.query(`SELECT id FROM ${SCHEMA}.email_verifications
       WHERE user_id = $1 AND code = $2 AND purpose = 'registration'
         AND used = FALSE AND expires_at > NOW()`, [user.id, code]);
        if (codeResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "INVALID_CODE", message: "Invalid or expired verification code" }
          });
          return;
        }
        await connection_1.db.query(`UPDATE ${SCHEMA}.users
       SET is_verified = TRUE, updated_at = NOW()
       WHERE id = $1`, [user.id]);
        await connection_1.db.query(`UPDATE ${SCHEMA}.email_verifications
       SET used = TRUE
       WHERE id = $1`, [codeResult.rows[0].id]);
        await (0, seed_1.seedDefaultCategories)(user.id);
        (0, token_1.setTokenCookie)(res, (0, token_1.signToken)(user.id));
        res.json({
          success: true,
          data: {
            message: "Email verified successfully!",
            user_id: user.id
          }
        });
      } catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    var resendVerificationSchema = zod_1.z.object({
      email: zod_1.z.string().email()
    });
    router.post("/resend-verification", rateLimit_12.sensitiveLimiter, (0, validation_1.validateBody)(resendVerificationSchema), async (req, res) => {
      try {
        const { email } = req.body;
        const userResult = await connection_1.db.query(`SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`, [email]);
        if (userResult.rows.length === 0) {
          res.json({
            success: true,
            data: { message: "If an account with this email exists, a verification code has been sent." }
          });
          return;
        }
        const user = userResult.rows[0];
        if (user.is_verified) {
          res.json({
            success: true,
            data: { message: "Email already verified. You can log in." }
          });
          return;
        }
        const code = await createVerificationCode(user.id, "registration");
        await (0, email_1.sendVerificationCode)(email, code, "registration");
        res.json({
          success: true,
          data: { message: "A new verification code has been sent to your email." }
        });
      } catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    var loginSchema = zod_1.z.object({
      email: zod_1.z.string().email("Invalid email address"),
      password: zod_1.z.string().min(1, "Password is required")
    });
    router.post("/login", rateLimit_12.authLimiter, (0, validation_1.validateBody)(loginSchema), async (req, res) => {
      try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const lockStatus = await (0, lockout_1.isAccountLocked)(email);
        if (lockStatus.locked) {
          const minutes = Math.ceil((lockStatus.remainingSeconds || 0) / 60);
          res.status(423).json({
            success: false,
            error: {
              code: "ACCOUNT_LOCKED",
              message: `Account is locked due to too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
              remainingSeconds: lockStatus.remainingSeconds
            }
          });
          return;
        }
        const result = await connection_1.db.query(`SELECT id, full_name, email, password_hash, is_verified, is_locked
       FROM ${SCHEMA}.users
       WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
          await (0, lockout_1.recordFailedLogin)(email, ipAddress);
          res.status(401).json({
            success: false,
            error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
          });
          return;
        }
        const user = result.rows[0];
        if (!user.is_verified) {
          res.status(403).json({
            success: false,
            error: {
              code: "EMAIL_NOT_VERIFIED",
              message: "Please verify your email before logging in."
            }
          });
          return;
        }
        const validPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!validPassword) {
          const lockResult = await (0, lockout_1.recordFailedLogin)(email, ipAddress);
          if (lockResult.locked) {
            res.status(423).json({
              success: false,
              error: {
                code: "ACCOUNT_LOCKED",
                message: `Account locked for ${lockResult.lockDurationMinutes} minutes due to too many failed attempts.`,
                lockDurationMinutes: lockResult.lockDurationMinutes
              }
            });
          } else {
            res.status(401).json({
              success: false,
              error: {
                code: "INVALID_CREDENTIALS",
                message: `Invalid email or password. ${lockResult.attemptsRemaining} attempt${lockResult.attemptsRemaining !== 1 ? "s" : ""} remaining.`,
                attemptsRemaining: lockResult.attemptsRemaining
              }
            });
          }
          return;
        }
        await (0, lockout_1.resetFailedLogins)(email);
        (0, token_1.setTokenCookie)(res, (0, token_1.signToken)(user.id));
        res.json({
          success: true,
          data: {
            id: user.id,
            full_name: user.full_name,
            email: user.email
          }
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    var forgotPasswordSchema = zod_1.z.object({
      email: zod_1.z.string().email()
    });
    router.post("/forgot-password", rateLimit_12.sensitiveLimiter, (0, validation_1.validateBody)(forgotPasswordSchema), async (req, res) => {
      try {
        const { email } = req.body;
        const userResult = await connection_1.db.query(`SELECT id, is_verified FROM ${SCHEMA}.users WHERE email = $1`, [email]);
        if (userResult.rows.length > 0 && userResult.rows[0].is_verified) {
          const user = userResult.rows[0];
          const code = await createVerificationCode(user.id, "password_reset");
          await (0, email_1.sendVerificationCode)(email, code, "password_reset");
        }
        res.json({
          success: true,
          data: {
            message: "If an account with this email exists, a password reset code has been sent."
          }
        });
      } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    var resetPasswordSchema = zod_1.z.object({
      email: zod_1.z.string().email(),
      code: zod_1.z.string().length(6, "Code must be 6 digits"),
      password: zod_1.z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number"),
      confirm_password: zod_1.z.string()
    }).refine((data) => data.password === data.confirm_password, {
      message: "Passwords do not match",
      path: ["confirm_password"]
    });
    router.post("/reset-password", rateLimit_12.sensitiveLimiter, (0, validation_1.validateBody)(resetPasswordSchema), async (req, res) => {
      try {
        const { email, code, password } = req.body;
        const userResult = await connection_1.db.query(`SELECT id FROM ${SCHEMA}.users WHERE email = $1`, [email]);
        if (userResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "INVALID_CODE", message: "Invalid or expired reset code" }
          });
          return;
        }
        const user = userResult.rows[0];
        const codeResult = await connection_1.db.query(`SELECT id FROM ${SCHEMA}.email_verifications
       WHERE user_id = $1 AND code = $2 AND purpose = 'password_reset'
         AND used = FALSE AND expires_at > NOW()`, [user.id, code]);
        if (codeResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "INVALID_CODE", message: "Invalid or expired reset code" }
          });
          return;
        }
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        await connection_1.db.query(`UPDATE ${SCHEMA}.users
       SET password_hash = $1,
           is_locked = FALSE,
           locked_until = NULL,
           failed_login_attempts = 0,
           updated_at = NOW()
       WHERE id = $2`, [passwordHash, user.id]);
        await connection_1.db.query(`UPDATE ${SCHEMA}.email_verifications SET used = TRUE WHERE id = $1`, [codeResult.rows[0].id]);
        res.json({
          success: true,
          data: { message: "Password reset successfully. You can now log in with your new password." }
        });
      } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    router.post("/logout", (_req, res) => {
      (0, token_1.clearTokenCookie)(res);
      res.json({ success: true });
    });
    router.get("/me", auth_12.requireAuth, async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT id, full_name, email, is_verified, default_currency, created_at
       FROM ${SCHEMA}.users
       WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "USER_NOT_FOUND", message: "User not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "An unexpected error occurred" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/accounts.js
var require_accounts = __commonJS({
  "server/dist/routes/accounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var zod_1 = require("zod");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var validation_1 = require_validation();
    var id_1 = require_id();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    router.get("/", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.v_account_balances
       WHERE user_id = $1
       ORDER BY account_type, account_name`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("List accounts error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load accounts" }
        });
      }
    });
    router.get("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const accountId = req.params.id;
        const result = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.v_account_balances
       WHERE user_id = $1 AND account_id = $2`, [userId, accountId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Account not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Get account error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load account" }
        });
      }
    });
    var createAccountSchema = zod_1.z.object({
      name: zod_1.z.string().min(1, "Name is required").max(255),
      account_type: zod_1.z.enum(["BANK", "CASH", "MOBILE_WALLET", "OTHER"]),
      currency: zod_1.z.string().min(2).max(3).default("BDT"),
      opening_balance: zod_1.z.coerce.number().default(0),
      opening_balance_date: zod_1.z.string().optional(),
      notes: zod_1.z.string().optional()
    });
    router.post("/", (0, validation_1.validateBody)(createAccountSchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const { name, account_type, currency, opening_balance, opening_balance_date, notes } = req.body;
        const id = (0, id_1.generateId)("accounts");
        const result = await connection_1.db.query(`INSERT INTO ${SCHEMA}.accounts (id, user_id, name, account_type, currency, opening_balance, opening_balance_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [id, userId, name, account_type, currency, opening_balance, opening_balance_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0], notes]);
        res.status(201).json({ success: true, data: result.rows[0] });
      } catch (error) {
        if (error.code === "23505") {
          res.status(409).json({
            success: false,
            error: { code: "DUPLICATE", message: "An account with this name already exists" }
          });
          return;
        }
        console.error("Create account error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to create account" }
        });
      }
    });
    var updateAccountSchema = zod_1.z.object({
      name: zod_1.z.string().min(1).max(255).optional(),
      account_type: zod_1.z.enum(["BANK", "CASH", "MOBILE_WALLET", "OTHER"]).optional(),
      opening_balance: zod_1.z.coerce.number().optional(),
      opening_balance_date: zod_1.z.string().optional(),
      is_active: zod_1.z.boolean().optional(),
      notes: zod_1.z.string().optional()
    });
    router.patch("/:id", (0, validation_1.validateBody)(updateAccountSchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const accountId = req.params.id;
        const updates = req.body;
        const fields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        if (fields.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "NO_UPDATES", message: "No fields to update" }
          });
          return;
        }
        fields.push(`updated_at = NOW()`);
        values.push(userId, accountId);
        const result = await connection_1.db.query(`UPDATE ${SCHEMA}.accounts
       SET ${fields.join(", ")}
       WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING *`, values);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Account not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Update account error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to update account" }
        });
      }
    });
    router.delete("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const accountId = req.params.id;
        const txResult = await connection_1.db.query(`SELECT COUNT(*) as count FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND account_id = $2 AND deleted_at IS NULL`, [userId, accountId]);
        if (parseInt(txResult.rows[0].count) > 0) {
          res.status(409).json({
            success: false,
            error: {
              code: "ACCOUNT_HAS_TRANSACTIONS",
              message: "Cannot delete an account with existing transactions. Deactivate it instead."
            }
          });
          return;
        }
        const result = await connection_1.db.query(`DELETE FROM ${SCHEMA}.accounts
       WHERE user_id = $1 AND id = $2
       RETURNING id`, [userId, accountId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Account not found" }
          });
          return;
        }
        res.json({ success: true, data: { id: result.rows[0].id } });
      } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to delete account" }
        });
      }
    });
    router.get("/:id/transactions", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const accountId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const countResult = await connection_1.db.query(`SELECT COUNT(*) as total FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND account_id = $2 AND deleted_at IS NULL`, [userId, accountId]);
        const result = await connection_1.db.query(`SELECT t.*, p.name as person_name, c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.account_id = $2 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT $3 OFFSET $4`, [userId, accountId, limit, offset]);
        const total = parseInt(countResult.rows[0].total);
        res.json({
          success: true,
          data: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        console.error("Get account transactions error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load transactions" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/people.js
var require_people = __commonJS({
  "server/dist/routes/people.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var zod_1 = require("zod");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var validation_1 = require_validation();
    var id_1 = require_id();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    router.get("/", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT p.*,
              COALESCE(pb.amount_they_owe_you, 0) AS amount_they_owe_you,
              COALESCE(pb.amount_you_owe_them, 0) AS amount_you_owe_them
       FROM ${SCHEMA}.people p
       LEFT JOIN ${SCHEMA}.v_person_balances pb ON pb.user_id = p.user_id AND pb.person_id = p.id
       WHERE p.user_id = $1 AND p.is_active = TRUE
       ORDER BY p.name`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("List people error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load people" }
        });
      }
    });
    router.get("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const personId = req.params.id;
        const result = await connection_1.db.query(`SELECT p.*,
              COALESCE(pb.amount_they_owe_you, 0) AS amount_they_owe_you,
              COALESCE(pb.amount_you_owe_them, 0) AS amount_you_owe_them,
              COALESCE(pb.total_lent, 0) AS total_lent,
              COALESCE(pb.total_lent_repaid, 0) AS total_lent_repaid,
              COALESCE(pb.total_borrowed, 0) AS total_borrowed,
              COALESCE(pb.total_borrow_repaid, 0) AS total_borrow_repaid
       FROM ${SCHEMA}.people p
       LEFT JOIN ${SCHEMA}.v_person_balances pb ON pb.user_id = p.user_id AND pb.person_id = p.id
       WHERE p.user_id = $1 AND p.id = $2`, [userId, personId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Person not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Get person error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load person" }
        });
      }
    });
    var createPersonSchema = zod_1.z.object({
      name: zod_1.z.string().min(1, "Name is required").max(255),
      phone: zod_1.z.string().max(50).optional(),
      email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
      notes: zod_1.z.string().optional()
    });
    router.post("/", (0, validation_1.validateBody)(createPersonSchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const { name, phone, email, notes } = req.body;
        const id = (0, id_1.generateId)("people");
        const result = await connection_1.db.query(`INSERT INTO ${SCHEMA}.people (id, user_id, name, phone, email, notes)
       VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6)
       RETURNING *`, [id, userId, name, phone || null, email || null, notes || null]);
        res.status(201).json({
          success: true,
          data: { ...result.rows[0], amount_they_owe_you: 0, amount_you_owe_them: 0 }
        });
      } catch (error) {
        console.error("Create person error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to create person" }
        });
      }
    });
    var updatePersonSchema = zod_1.z.object({
      name: zod_1.z.string().min(1).max(255).optional(),
      phone: zod_1.z.string().max(50).optional().nullable(),
      email: zod_1.z.string().optional().nullable(),
      notes: zod_1.z.string().optional().nullable(),
      is_active: zod_1.z.boolean().optional()
    });
    router.patch("/:id", (0, validation_1.validateBody)(updatePersonSchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const personId = req.params.id;
        const updates = req.body;
        const fields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        if (fields.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "NO_UPDATES", message: "No fields to update" }
          });
          return;
        }
        fields.push(`updated_at = NOW()`);
        values.push(userId, personId);
        const result = await connection_1.db.query(`UPDATE ${SCHEMA}.people
       SET ${fields.join(", ")}
       WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING *`, values);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Person not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Update person error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to update person" }
        });
      }
    });
    router.delete("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const personId = req.params.id;
        const balanceResult = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1 AND person_id = $2`, [userId, personId]);
        if (balanceResult.rows.length > 0) {
          const b = balanceResult.rows[0];
          if (parseFloat(b.amount_they_owe_you) > 0 || parseFloat(b.amount_you_owe_them) > 0) {
            res.status(409).json({
              success: false,
              error: {
                code: "OUTSTANDING_BALANCE",
                message: "Cannot delete a person with outstanding balances. Set them inactive instead."
              }
            });
            return;
          }
        }
        const result = await connection_1.db.query(`UPDATE ${SCHEMA}.people SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING id`, [userId, personId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Person not found" }
          });
          return;
        }
        res.json({ success: true, data: { id: result.rows[0].id } });
      } catch (error) {
        console.error("Delete person error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to delete person" }
        });
      }
    });
    router.get("/:id/transactions", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const personId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const countResult = await connection_1.db.query(`SELECT COUNT(*) as total FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND person_id = $2 AND deleted_at IS NULL`, [userId, personId]);
        const result = await connection_1.db.query(`SELECT t.*, a.name as account_name, c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.person_id = $2 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT $3 OFFSET $4`, [userId, personId, limit, offset]);
        const total = parseInt(countResult.rows[0].total);
        res.json({
          success: true,
          data: result.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
      } catch (error) {
        console.error("Get person transactions error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load transactions" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/categories.js
var require_categories = __commonJS({
  "server/dist/routes/categories.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var zod_1 = require("zod");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var validation_1 = require_validation();
    var id_1 = require_id();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    router.get("/", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.categories
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY type, name`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("List categories error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load categories" }
        });
      }
    });
    var createCategorySchema = zod_1.z.object({
      name: zod_1.z.string().min(1, "Name is required").max(255),
      type: zod_1.z.enum(["INCOME", "EXPENSE"]),
      icon: zod_1.z.string().max(50).optional(),
      color: zod_1.z.string().max(7).optional()
    });
    router.post("/", (0, validation_1.validateBody)(createCategorySchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const { name, type, icon, color } = req.body;
        const id = (0, id_1.generateId)("categories");
        const result = await connection_1.db.query(`INSERT INTO ${SCHEMA}.categories (id, user_id, name, type, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [id, userId, name, type, icon || null, color || null]);
        res.status(201).json({ success: true, data: result.rows[0] });
      } catch (error) {
        if (error.code === "23505") {
          res.status(409).json({
            success: false,
            error: { code: "DUPLICATE", message: "A category with this name and type already exists" }
          });
          return;
        }
        console.error("Create category error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to create category" }
        });
      }
    });
    var updateCategorySchema = zod_1.z.object({
      name: zod_1.z.string().min(1).max(255).optional(),
      icon: zod_1.z.string().max(50).optional().nullable(),
      color: zod_1.z.string().max(7).optional().nullable(),
      is_active: zod_1.z.boolean().optional()
    });
    router.patch("/:id", (0, validation_1.validateBody)(updateCategorySchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const categoryId = req.params.id;
        const updates = req.body;
        const fields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        if (fields.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "NO_UPDATES", message: "No fields to update" }
          });
          return;
        }
        fields.push(`updated_at = NOW()`);
        values.push(userId, categoryId);
        const result = await connection_1.db.query(`UPDATE ${SCHEMA}.categories
       SET ${fields.join(", ")}
       WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING *`, values);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Category not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Update category error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to update category" }
        });
      }
    });
    router.delete("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const categoryId = req.params.id;
        const result = await connection_1.db.query(`UPDATE ${SCHEMA}.categories SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING id`, [userId, categoryId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Category not found" }
          });
          return;
        }
        res.json({ success: true, data: { id: result.rows[0].id } });
      } catch (error) {
        console.error("Delete category error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to delete category" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/transactions.js
var require_transactions = __commonJS({
  "server/dist/routes/transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var zod_1 = require("zod");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var validation_1 = require_validation();
    var id_1 = require_id();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    var listTransactionsQuery = zod_1.z.object({
      page: zod_1.z.coerce.number().int().min(1).default(1),
      limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
      from: zod_1.z.string().optional(),
      to: zod_1.z.string().optional(),
      account_id: zod_1.z.string().optional(),
      person_id: zod_1.z.string().optional(),
      type: zod_1.z.string().optional(),
      category_id: zod_1.z.string().optional(),
      search: zod_1.z.string().optional(),
      sort: zod_1.z.enum(["date_asc", "date_desc"]).default("date_desc")
    });
    router.get("/", (0, validation_1.validateQuery)(listTransactionsQuery), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const { page, limit, from, to, account_id, person_id, type, category_id, search, sort } = req.query;
        const offset = (page - 1) * limit;
        const conditions = ["t.user_id = $1", "t.deleted_at IS NULL"];
        const values = [userId];
        let paramIndex = 2;
        if (from) {
          conditions.push(`t.transaction_date >= $${paramIndex}`);
          values.push(from);
          paramIndex++;
        }
        if (to) {
          conditions.push(`t.transaction_date <= $${paramIndex}`);
          values.push(to);
          paramIndex++;
        }
        if (account_id) {
          conditions.push(`t.account_id = $${paramIndex}`);
          values.push(account_id);
          paramIndex++;
        }
        if (person_id) {
          conditions.push(`t.person_id = $${paramIndex}`);
          values.push(person_id);
          paramIndex++;
        }
        if (type) {
          conditions.push(`t.transaction_type = $${paramIndex}`);
          values.push(type);
          paramIndex++;
        }
        if (category_id) {
          conditions.push(`t.category_id = $${paramIndex}`);
          values.push(category_id);
          paramIndex++;
        }
        if (search) {
          conditions.push(`(t.description ILIKE $${paramIndex} OR t.reference ILIKE $${paramIndex})`);
          values.push(`%${search}%`);
          paramIndex++;
        }
        const whereClause = conditions.join(" AND ");
        const orderClause = sort === "date_asc" ? "t.transaction_date ASC, t.id ASC" : "t.transaction_date DESC, t.id DESC";
        const countResult = await connection_1.db.query(`SELECT COUNT(*) as total
       FROM ${SCHEMA}.transactions t
       WHERE ${whereClause}`, values);
        const dataValues = [...values, limit, offset];
        const result = await connection_1.db.query(`SELECT t.*,
              a.name as account_name,
              p.name as person_name,
              c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, dataValues);
        const total = parseInt(countResult.rows[0].total);
        res.json({
          success: true,
          data: result.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
      } catch (error) {
        console.error("List transactions error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load transactions" }
        });
      }
    });
    router.get("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const txId = req.params.id;
        const result = await connection_1.db.query(`SELECT t.*,
              a.name as account_name,
              p.name as person_name,
              c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL`, [txId, userId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Transaction not found" }
          });
          return;
        }
        let transfer = null;
        if (result.rows[0].transaction_type === "TRANSFER") {
          const transferResult = await connection_1.db.query(`SELECT tt.*,
                fa.name as from_account_name,
                ta.name as to_account_name
         FROM ${SCHEMA}.transaction_transfers tt
         JOIN ${SCHEMA}.accounts fa ON fa.id = tt.from_account_id
         JOIN ${SCHEMA}.accounts ta ON ta.id = tt.to_account_id
         WHERE tt.transaction_id = $1`, [txId]);
          transfer = transferResult.rows[0] || null;
        }
        res.json({
          success: true,
          data: { ...result.rows[0], transfer }
        });
      } catch (error) {
        console.error("Get transaction error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load transaction" }
        });
      }
    });
    var createTransactionSchema = zod_1.z.object({
      transaction_type: zod_1.z.enum([
        "INCOME",
        "EXPENSE",
        "TRANSFER",
        "LEND",
        "LEND_REPAYMENT",
        "BORROW",
        "BORROW_REPAYMENT",
        "ADJUSTMENT"
      ]),
      transaction_date: zod_1.z.string().min(1, "Date is required"),
      amount: zod_1.z.coerce.number().positive("Amount must be greater than zero"),
      account_id: zod_1.z.string().optional(),
      person_id: zod_1.z.string().optional(),
      category_id: zod_1.z.string().optional(),
      loan_id: zod_1.z.string().optional(),
      description: zod_1.z.string().optional(),
      reference: zod_1.z.string().optional(),
      to_account_id: zod_1.z.string().optional()
    });
    router.post("/", (0, validation_1.validateBody)(createTransactionSchema), async (req, res) => {
      const client = await connection_1.db.getClient();
      try {
        const userId = (0, auth_12.getUserId)(req);
        const { transaction_type, transaction_date, amount, account_id, person_id, category_id, loan_id, description, reference, to_account_id } = req.body;
        const validationErrors = [];
        if (transaction_type !== "ADJUSTMENT" && !account_id) {
          validationErrors.push("Account is required");
        }
        if (["LEND", "LEND_REPAYMENT", "BORROW", "BORROW_REPAYMENT"].includes(transaction_type) && !person_id) {
          validationErrors.push("Person is required for lending/borrowing transactions");
        }
        if (transaction_type === "TRANSFER" && !to_account_id) {
          validationErrors.push("Destination account is required for transfers");
        }
        if (transaction_type === "TRANSFER" && account_id && to_account_id && account_id === to_account_id) {
          validationErrors.push("Source and destination accounts cannot be the same");
        }
        if (validationErrors.length > 0) {
          res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: validationErrors.join("; ") }
          });
          return;
        }
        if (account_id) {
          const acc = await client.query(`SELECT id FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`, [account_id, userId]);
          if (acc.rows.length === 0) {
            res.status(400).json({
              success: false,
              error: { code: "INVALID_ACCOUNT", message: "Account not found" }
            });
            return;
          }
        }
        if (to_account_id) {
          const acc = await client.query(`SELECT id FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`, [to_account_id, userId]);
          if (acc.rows.length === 0) {
            res.status(400).json({
              success: false,
              error: { code: "INVALID_ACCOUNT", message: "Destination account not found" }
            });
            return;
          }
        }
        if (person_id) {
          const p = await client.query(`SELECT id FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2 AND is_active = TRUE`, [person_id, userId]);
          if (p.rows.length === 0) {
            res.status(400).json({
              success: false,
              error: { code: "INVALID_PERSON", message: "Person not found" }
            });
            return;
          }
        }
        await client.query("BEGIN");
        const txId = (0, id_1.generateId)("transactions");
        const txResult = await client.query(`INSERT INTO ${SCHEMA}.transactions
       (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, category_id, loan_id, description, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [txId, userId, transaction_type, transaction_date, amount, account_id || null, person_id || null, category_id || null, loan_id || null, description || null, reference || null]);
        const tx = txResult.rows[0];
        if (transaction_type === "TRANSFER" && account_id && to_account_id) {
          const tfrId = (0, id_1.generateId)("transaction_transfers");
          await client.query(`INSERT INTO ${SCHEMA}.transaction_transfers (id, transaction_id, from_account_id, to_account_id, amount)
         VALUES ($1, $2, $3, $4, $5)`, [tfrId, tx.id, account_id, to_account_id, amount]);
        }
        if (transaction_type === "LEND_REPAYMENT" || transaction_type === "BORROW_REPAYMENT") {
          if (loan_id) {
            const lreId = (0, id_1.generateId)("loan_repayments");
            await client.query(`INSERT INTO ${SCHEMA}.loan_repayments (id, loan_id, transaction_id, amount, repayment_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`, [lreId, loan_id, tx.id, amount, transaction_date, description || null]);
          }
        }
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: tx });
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create transaction error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to create transaction" }
        });
      } finally {
        client.release();
      }
    });
    var updateTransactionSchema = zod_1.z.object({
      transaction_date: zod_1.z.string().optional(),
      amount: zod_1.z.coerce.number().positive().optional(),
      account_id: zod_1.z.string().optional().nullable(),
      person_id: zod_1.z.string().optional().nullable(),
      category_id: zod_1.z.string().optional().nullable(),
      description: zod_1.z.string().optional().nullable(),
      reference: zod_1.z.string().optional().nullable()
    });
    router.patch("/:id", (0, validation_1.validateBody)(updateTransactionSchema), async (req, res) => {
      const client = await connection_1.db.getClient();
      try {
        const userId = (0, auth_12.getUserId)(req);
        const txId = req.params.id;
        const existing = await client.query(`SELECT * FROM ${SCHEMA}.transactions
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [txId, userId]);
        if (existing.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Transaction not found" }
          });
          return;
        }
        const updates = req.body;
        const fields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        if (fields.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "NO_UPDATES", message: "No fields to update" }
          });
          return;
        }
        fields.push(`updated_at = NOW()`);
        values.push(txId, userId);
        const result = await client.query(`UPDATE ${SCHEMA}.transactions
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`, values);
        const tx = existing.rows[0];
        if ((tx.transaction_type === "LEND_REPAYMENT" || tx.transaction_type === "BORROW_REPAYMENT") && req.body.amount !== void 0) {
          const newAmount = parseFloat(req.body.amount);
          const oldAmount = parseFloat(tx.amount);
          if (newAmount !== oldAmount) {
            await client.query(`UPDATE ${SCHEMA}.loan_repayments SET amount = $1 WHERE transaction_id = $2`, [newAmount, txId]);
            if (tx.loan_id) {
              const loanResult = await client.query(`SELECT l.*,
                    COALESCE(lr.total_repaid, 0) AS total_repaid
             FROM ${SCHEMA}.loans l
             LEFT JOIN (
               SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
               FROM ${SCHEMA}.loan_repayments lr2
               INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
               GROUP BY lr2.loan_id
             ) lr ON lr.loan_id = l.id
             WHERE l.id = $1`, [tx.loan_id]);
              if (loanResult.rows.length > 0) {
                const loan = loanResult.rows[0];
                const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
                const totalRepaid = parseFloat(loan.total_repaid || "0");
                if (loan.status === "PAID" && totalRepaid < totalDue) {
                  await client.query(`UPDATE ${SCHEMA}.loans SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`, [tx.loan_id]);
                }
                if (loan.status === "ACTIVE" && totalRepaid >= totalDue) {
                  await client.query(`UPDATE ${SCHEMA}.loans SET status = 'PAID', updated_at = NOW() WHERE id = $1`, [tx.loan_id]);
                }
              }
            }
          }
        }
        await client.query("COMMIT");
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Update transaction error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to update transaction" }
        });
      } finally {
        client.release();
      }
    });
    router.delete("/:id", async (req, res) => {
      const client = await connection_1.db.getClient();
      try {
        const userId = (0, auth_12.getUserId)(req);
        const txId = req.params.id;
        const existing = await client.query(`SELECT * FROM ${SCHEMA}.transactions
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [txId, userId]);
        if (existing.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Transaction not found" }
          });
          return;
        }
        await client.query("BEGIN");
        await client.query(`UPDATE ${SCHEMA}.transactions SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1`, [txId]);
        const tx = existing.rows[0];
        if (tx.transaction_type === "LEND_REPAYMENT" || tx.transaction_type === "BORROW_REPAYMENT") {
          await client.query(`DELETE FROM ${SCHEMA}.loan_repayments WHERE transaction_id = $1`, [txId]);
          if (tx.loan_id) {
            const loanResult = await client.query(`SELECT l.*,
                  COALESCE(lr.total_repaid, 0) AS total_repaid
           FROM ${SCHEMA}.loans l
           LEFT JOIN (
             SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
             FROM ${SCHEMA}.loan_repayments lr2
             INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
             WHERE lr2.loan_id = $1
             GROUP BY lr2.loan_id
           ) lr ON lr.loan_id = l.id
           WHERE l.id = $1`, [tx.loan_id]);
            if (loanResult.rows.length > 0) {
              const loan = loanResult.rows[0];
              const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
              const totalRepaid = parseFloat(loan.total_repaid || "0");
              if (loan.status === "PAID" && totalRepaid < totalDue) {
                await client.query(`UPDATE ${SCHEMA}.loans SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`, [tx.loan_id]);
              }
            }
          }
        }
        await client.query("COMMIT");
        res.json({ success: true, data: { id: txId } });
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Delete transaction error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to delete transaction" }
        });
      } finally {
        client.release();
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/loans.js
var require_loans = __commonJS({
  "server/dist/routes/loans.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var zod_1 = require("zod");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var validation_1 = require_validation();
    var id_1 = require_id();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    router.get("/", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT l.*,
              p.name as person_name,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       LEFT JOIN (
         SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr2
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr2.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1
       ORDER BY l.status = 'ACTIVE' DESC, l.start_date DESC`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("List loans error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load loans" }
        });
      }
    });
    router.get("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const loanId = req.params.id;
        const result = await connection_1.db.query(`SELECT l.*,
              p.name as person_name,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       LEFT JOIN (
         SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr2
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr2.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.id = $1 AND l.user_id = $2`, [loanId, userId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Loan not found" }
          });
          return;
        }
        const repayments = await connection_1.db.query(`SELECT lr.*, t.transaction_date, t.account_id, a.name as account_name
       FROM ${SCHEMA}.loan_repayments lr
       INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE lr.loan_id = $1
       ORDER BY lr.repayment_date DESC`, [loanId]);
        res.json({
          success: true,
          data: {
            ...result.rows[0],
            repayments: repayments.rows
          }
        });
      } catch (error) {
        console.error("Get loan error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load loan" }
        });
      }
    });
    var createLoanSchema = zod_1.z.object({
      person_id: zod_1.z.string().optional(),
      direction: zod_1.z.enum(["BORROWED", "LENT"]),
      principal_amount: zod_1.z.coerce.number().positive("Principal must be greater than zero"),
      interest_amount: zod_1.z.coerce.number().min(0).default(0),
      start_date: zod_1.z.string().min(1),
      due_date: zod_1.z.string().optional().nullable(),
      description: zod_1.z.string().optional()
    });
    router.post("/", (0, validation_1.validateBody)(createLoanSchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const { person_id, direction, principal_amount, interest_amount, start_date, due_date, description } = req.body;
        const id = (0, id_1.generateId)("loans");
        const result = await connection_1.db.query(`INSERT INTO ${SCHEMA}.loans (id, user_id, person_id, direction, principal_amount, interest_amount, start_date, due_date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [id, userId, person_id || null, direction, principal_amount, interest_amount, start_date, due_date || null, description || null]);
        res.status(201).json({
          success: true,
          data: { ...result.rows[0], total_repaid: 0, remaining_amount: principal_amount + interest_amount }
        });
      } catch (error) {
        console.error("Create loan error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to create loan" }
        });
      }
    });
    var updateLoanSchema = zod_1.z.object({
      due_date: zod_1.z.string().optional().nullable(),
      status: zod_1.z.enum(["ACTIVE", "PAID", "OVERDUE", "CANCELLED"]).optional(),
      description: zod_1.z.string().optional().nullable()
    });
    router.patch("/:id", (0, validation_1.validateBody)(updateLoanSchema), async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const loanId = req.params.id;
        const updates = req.body;
        const fields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        if (fields.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: "NO_UPDATES", message: "No fields to update" }
          });
          return;
        }
        fields.push(`updated_at = NOW()`);
        values.push(loanId, userId);
        const result = await connection_1.db.query(`UPDATE ${SCHEMA}.loans
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`, values);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Loan not found" }
          });
          return;
        }
        res.json({ success: true, data: result.rows[0] });
      } catch (error) {
        console.error("Update loan error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to update loan" }
        });
      }
    });
    router.delete("/:id", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const loanId = req.params.id;
        const repayResult = await connection_1.db.query(`SELECT COUNT(*) as count FROM ${SCHEMA}.loan_repayments WHERE loan_id = $1`, [loanId]);
        if (parseInt(repayResult.rows[0].count) > 0) {
          res.status(409).json({
            success: false,
            error: {
              code: "HAS_REPAYMENTS",
              message: "Cannot delete a loan with existing repayments. Cancel it instead."
            }
          });
          return;
        }
        const result = await connection_1.db.query(`DELETE FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2 RETURNING id`, [loanId, userId]);
        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Loan not found" }
          });
          return;
        }
        res.json({ success: true, data: { id: loanId } });
      } catch (error) {
        console.error("Delete loan error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to delete loan" }
        });
      }
    });
    var createRepaymentSchema = zod_1.z.object({
      amount: zod_1.z.coerce.number().positive("Amount must be greater than zero"),
      repayment_date: zod_1.z.string().min(1),
      account_id: zod_1.z.string(),
      notes: zod_1.z.string().optional()
    });
    router.post("/:id/repayments", (0, validation_1.validateBody)(createRepaymentSchema), async (req, res) => {
      const client = await connection_1.db.getClient();
      try {
        const userId = (0, auth_12.getUserId)(req);
        const loanId = req.params.id;
        const { amount, repayment_date, account_id, notes } = req.body;
        const loanResult = await client.query(`SELECT * FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2`, [loanId, userId]);
        if (loanResult.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Loan not found" }
          });
          return;
        }
        const loan = loanResult.rows[0];
        const repaidResult = await client.query(`SELECT COALESCE(SUM(lr.amount), 0) as total_repaid
       FROM ${SCHEMA}.loan_repayments lr
       INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
       WHERE lr.loan_id = $1`, [loanId]);
        const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid);
        const remaining = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount) - totalRepaid;
        if (amount > remaining) {
          res.status(400).json({
            success: false,
            error: {
              code: "AMOUNT_EXCEEDS",
              message: `Repayment amount ($${amount}) exceeds remaining balance ($${remaining})`
            }
          });
          return;
        }
        await client.query("BEGIN");
        const txType = loan.direction === "LENT" ? "LEND_REPAYMENT" : "BORROW_REPAYMENT";
        const txId = (0, id_1.generateId)("transactions");
        const txResult = await client.query(`INSERT INTO ${SCHEMA}.transactions
       (id, user_id, transaction_type, transaction_date, amount, account_id, person_id, loan_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [txId, userId, txType, repayment_date, amount, account_id, loan.person_id, loanId, notes || null]);
        const tx = txResult.rows[0];
        const lreId = (0, id_1.generateId)("loan_repayments");
        await client.query(`INSERT INTO ${SCHEMA}.loan_repayments (id, loan_id, transaction_id, amount, repayment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`, [lreId, loanId, tx.id, amount, repayment_date, notes || null]);
        const newTotalRepaid = totalRepaid + amount;
        const totalDue = parseFloat(loan.principal_amount) + parseFloat(loan.interest_amount);
        if (newTotalRepaid >= totalDue) {
          await client.query(`UPDATE ${SCHEMA}.loans SET status = 'PAID', updated_at = NOW() WHERE id = $1`, [loanId]);
        }
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: tx });
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create repayment error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to record repayment" }
        });
      } finally {
        client.release();
      }
    });
    router.get("/:id/repayments", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const loanId = req.params.id;
        const loanCheck = await connection_1.db.query(`SELECT id FROM ${SCHEMA}.loans WHERE id = $1 AND user_id = $2`, [loanId, userId]);
        if (loanCheck.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Loan not found" }
          });
          return;
        }
        const result = await connection_1.db.query(`SELECT lr.*, t.account_id, a.name as account_name
       FROM ${SCHEMA}.loan_repayments lr
       INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE lr.loan_id = $1
       ORDER BY lr.repayment_date DESC`, [loanId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("List repayments error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load repayments" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/dashboard.js
var require_dashboard = __commonJS({
  "server/dist/routes/dashboard.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    router.get("/summary", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const from = req.query.from;
        const to = req.query.to;
        const accountsResult = await connection_1.db.query(`SELECT account_id, account_name, account_type, currency, opening_balance, current_balance
       FROM ${SCHEMA}.v_account_balances
       WHERE user_id = $1
       ORDER BY account_type, account_name`, [userId]);
        const accounts = accountsResult.rows;
        const totalAccountBalance = accounts.reduce((sum, a) => sum + parseFloat(a.current_balance), 0);
        const peopleResult = await connection_1.db.query(`SELECT SUM(amount_they_owe_you) AS total_receivable,
              SUM(amount_you_owe_them) AS total_payable
       FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1`, [userId]);
        const totalReceivable = parseFloat(peopleResult.rows[0]?.total_receivable || "0");
        const totalPayable = parseFloat(peopleResult.rows[0]?.total_payable || "0");
        let dateCondition = "";
        const values = [userId];
        let paramIndex = 2;
        if (from) {
          dateCondition += ` AND transaction_date >= $${paramIndex}`;
          values.push(from);
          paramIndex++;
        }
        if (to) {
          dateCondition += ` AND transaction_date <= $${paramIndex}`;
          values.push(to);
          paramIndex++;
        }
        const totalsResult = await connection_1.db.query(`SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
       FROM ${SCHEMA}.transactions
       WHERE user_id = $1 AND deleted_at IS NULL ${dateCondition}`, values);
        const totalIncome = parseFloat(totalsResult.rows[0].total_income);
        const totalExpense = parseFloat(totalsResult.rows[0].total_expense);
        const netPosition = totalAccountBalance + totalReceivable - totalPayable;
        res.json({
          success: true,
          data: {
            accounts,
            totalAccountBalance,
            totalReceivable,
            totalPayable,
            totalIncome,
            totalExpense,
            netPosition
          }
        });
      } catch (error) {
        console.error("Dashboard summary error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load dashboard summary" }
        });
      }
    });
    router.get("/recent-transactions", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT t.*,
              a.name as account_name,
              p.name as person_name,
              c.name as category_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT 10`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("Recent transactions error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load recent transactions" }
        });
      }
    });
    router.get("/people-summary", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT person_id, person_name, amount_they_owe_you, amount_you_owe_them
       FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1
       ORDER BY GREATEST(amount_they_owe_you, amount_you_owe_them) DESC
       LIMIT 10`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("People summary error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load people summary" }
        });
      }
    });
    router.get("/loan-summary", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT l.id, l.direction, l.principal_amount, l.interest_amount,
              l.start_date, l.due_date, l.status, l.description,
              p.name as person_name,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       LEFT JOIN (
         SELECT lr.loan_id, SUM(lr.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1 AND l.status = 'ACTIVE'
       ORDER BY l.due_date ASC NULLS LAST, l.start_date DESC`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("Loan summary error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load loan summary" }
        });
      }
    });
    router.get("/monthly-chart", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT
         TO_CHAR(transaction_date, 'YYYY-MM') AS month,
         COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense
       FROM ${SCHEMA}.transactions
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND transaction_date >= CURRENT_DATE - INTERVAL '12 months'
         AND transaction_type IN ('INCOME', 'EXPENSE')
       GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
       ORDER BY month ASC`, [userId]);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("Monthly chart error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load chart data" }
        });
      }
    });
    router.get("/expense-by-category", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const from = req.query.from;
        const to = req.query.to;
        let dateCondition = "";
        const values = [userId];
        let paramIndex = 2;
        if (from) {
          dateCondition += ` AND t.transaction_date >= $${paramIndex}`;
          values.push(from);
          paramIndex++;
        }
        if (to) {
          dateCondition += ` AND t.transaction_date <= $${paramIndex}`;
          values.push(to);
          paramIndex++;
        }
        const result = await connection_1.db.query(`SELECT c.name AS category_name, c.color,
              COALESCE(SUM(t.amount), 0) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.deleted_at IS NULL
         AND t.transaction_type = 'EXPENSE'
         ${dateCondition}
       GROUP BY c.name, c.color
       ORDER BY total DESC`, values);
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error("Expense by category error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to load expense breakdown" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/routes/reports.js
var require_reports = __commonJS({
  "server/dist/routes/reports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var express_12 = require("express");
    var connection_1 = require_connection();
    var auth_12 = require_auth();
    var router = (0, express_12.Router)();
    var SCHEMA = "finance_tracker";
    router.use(auth_12.requireAuth);
    router.get("/income", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const from = req.query.from;
        const to = req.query.to;
        let dateCondition = "";
        const values = [userId];
        let paramIndex = 2;
        if (from) {
          dateCondition += ` AND t.transaction_date >= $${paramIndex}`;
          values.push(from);
          paramIndex++;
        }
        if (to) {
          dateCondition += ` AND t.transaction_date <= $${paramIndex}`;
          values.push(to);
          paramIndex++;
        }
        const byCategory = await connection_1.db.query(`SELECT c.name AS category_name, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'INCOME' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY c.name ORDER BY total DESC`, values);
        const byMonth = await connection_1.db.query(`SELECT TO_CHAR(t.transaction_date, 'YYYY-MM') AS month, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'INCOME' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY month ORDER BY month ASC`, values);
        const totalResult = await connection_1.db.query(`SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'INCOME' AND t.deleted_at IS NULL ${dateCondition}`, values);
        res.json({
          success: true,
          data: {
            total: parseFloat(totalResult.rows[0].total),
            byCategory: byCategory.rows,
            byMonth: byMonth.rows
          }
        });
      } catch (error) {
        console.error("Income report error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to generate income report" }
        });
      }
    });
    router.get("/expense", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const from = req.query.from;
        const to = req.query.to;
        let dateCondition = "";
        const values = [userId];
        let paramIndex = 2;
        if (from) {
          dateCondition += ` AND t.transaction_date >= $${paramIndex}`;
          values.push(from);
          paramIndex++;
        }
        if (to) {
          dateCondition += ` AND t.transaction_date <= $${paramIndex}`;
          values.push(to);
          paramIndex++;
        }
        const byCategory = await connection_1.db.query(`SELECT c.name AS category_name, c.color, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY c.name, c.color ORDER BY total DESC`, values);
        const byAccount = await connection_1.db.query(`SELECT a.name AS account_name, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY a.name ORDER BY total DESC`, values);
        const byMonth = await connection_1.db.query(`SELECT TO_CHAR(t.transaction_date, 'YYYY-MM') AS month, SUM(t.amount) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}
       GROUP BY month ORDER BY month ASC`, values);
        const totalResult = await connection_1.db.query(`SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM ${SCHEMA}.transactions t
       WHERE t.user_id = $1 AND t.transaction_type = 'EXPENSE' AND t.deleted_at IS NULL ${dateCondition}`, values);
        res.json({
          success: true,
          data: {
            total: parseFloat(totalResult.rows[0].total),
            byCategory: byCategory.rows,
            byAccount: byAccount.rows,
            byMonth: byMonth.rows
          }
        });
      } catch (error) {
        console.error("Expense report error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to generate expense report" }
        });
      }
    });
    router.get("/account-statement", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const accountId = req.query.account_id;
        if (!accountId) {
          res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: "account_id is required" }
          });
          return;
        }
        const accResult = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.accounts WHERE id = $1 AND user_id = $2`, [accountId, userId]);
        if (accResult.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Account not found" }
          });
          return;
        }
        const account = accResult.rows[0];
        const txResult = await connection_1.db.query(`SELECT t.*, p.name as person_name, c.name as category_name,
              CASE
                WHEN t.transaction_type = 'INCOME' THEN t.amount
                WHEN t.transaction_type = 'EXPENSE' THEN -t.amount
                WHEN t.transaction_type = 'LEND' THEN -t.amount
                WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount
                WHEN t.transaction_type = 'BORROW' THEN t.amount
                WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN -t.amount
                WHEN t.transaction_type = 'TRANSFER' THEN
                  CASE
                    WHEN tt.from_account_id = $2 THEN -t.amount
                    WHEN tt.to_account_id = $2 THEN t.amount
                    ELSE 0
                  END
                ELSE 0
              END AS effect
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.people p ON p.id = t.person_id
       LEFT JOIN ${SCHEMA}.categories c ON c.id = t.category_id
       LEFT JOIN ${SCHEMA}.transaction_transfers tt ON tt.transaction_id = t.id
       WHERE t.user_id = $1
         AND (t.account_id = $2
              OR tt.from_account_id = $2
              OR tt.to_account_id = $2)
         AND t.deleted_at IS NULL
       ORDER BY t.transaction_date ASC, t.id ASC`, [userId, accountId]);
        let runningBalance = parseFloat(account.opening_balance);
        const transactions = txResult.rows.map((tx) => {
          runningBalance += parseFloat(tx.effect);
          return { ...tx, running_balance: runningBalance };
        });
        res.json({
          success: true,
          data: {
            account,
            openingBalance: parseFloat(account.opening_balance),
            closingBalance: runningBalance,
            transactions
          }
        });
      } catch (error) {
        console.error("Account statement error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to generate account statement" }
        });
      }
    });
    router.get("/person-statement", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const personId = req.query.person_id;
        if (!personId) {
          res.status(400).json({
            success: false,
            error: { code: "VALIDATION_ERROR", message: "person_id is required" }
          });
          return;
        }
        const pResult = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.people WHERE id = $1 AND user_id = $2`, [personId, userId]);
        if (pResult.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Person not found" }
          });
          return;
        }
        const person = pResult.rows[0];
        const txResult = await connection_1.db.query(`SELECT t.*, a.name as account_name
       FROM ${SCHEMA}.transactions t
       LEFT JOIN ${SCHEMA}.accounts a ON a.id = t.account_id
       WHERE t.user_id = $1 AND t.person_id = $2 AND t.deleted_at IS NULL
       ORDER BY t.transaction_date ASC, t.id ASC`, [userId, personId]);
        const balanceResult = await connection_1.db.query(`SELECT * FROM ${SCHEMA}.v_person_balances
       WHERE user_id = $1 AND person_id = $2`, [userId, personId]);
        const balance = balanceResult.rows[0] || {
          amount_they_owe_you: 0,
          amount_you_owe_them: 0,
          total_lent: 0,
          total_lent_repaid: 0,
          total_borrowed: 0,
          total_borrow_repaid: 0
        };
        const loansResult = await connection_1.db.query(`SELECT l.*,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN (
         SELECT lr2.loan_id, SUM(lr2.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr2
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr2.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr2.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1 AND l.person_id = $2
       ORDER BY l.start_date DESC`, [userId, personId]);
        res.json({
          success: true,
          data: {
            person,
            balance,
            transactions: txResult.rows,
            loans: loansResult.rows
          }
        });
      } catch (error) {
        console.error("Person statement error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to generate person statement" }
        });
      }
    });
    router.get("/loan", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const result = await connection_1.db.query(`SELECT l.*,
              p.name as person_name,
              COALESCE(lr.total_repaid, 0) AS total_repaid,
              (l.principal_amount + l.interest_amount - COALESCE(lr.total_repaid, 0)) AS remaining_amount
       FROM ${SCHEMA}.loans l
       LEFT JOIN ${SCHEMA}.people p ON p.id = l.person_id
       LEFT JOIN (
         SELECT lr.loan_id, SUM(lr.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1
       ORDER BY l.start_date DESC`, [userId]);
        const summary = await connection_1.db.query(`SELECT
         COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_count,
         SUM(principal_amount + interest_amount) FILTER (WHERE status = 'ACTIVE') AS total_active_principal,
         SUM(COALESCE(lr.total_repaid, 0)) FILTER (WHERE status = 'ACTIVE') AS total_active_repaid,
         COUNT(*) FILTER (WHERE status = 'OVERDUE') AS overdue_count
       FROM ${SCHEMA}.loans l
       LEFT JOIN (
         SELECT lr.loan_id, SUM(lr.amount) as total_repaid
         FROM ${SCHEMA}.loan_repayments lr
         INNER JOIN ${SCHEMA}.transactions t ON t.id = lr.transaction_id AND t.deleted_at IS NULL
         GROUP BY lr.loan_id
       ) lr ON lr.loan_id = l.id
       WHERE l.user_id = $1`, [userId]);
        res.json({
          success: true,
          data: {
            loans: result.rows,
            summary: summary.rows[0]
          }
        });
      } catch (error) {
        console.error("Loan report error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to generate loan report" }
        });
      }
    });
    router.get("/financial-position", async (req, res) => {
      try {
        const userId = (0, auth_12.getUserId)(req);
        const accounts = await connection_1.db.query(`SELECT SUM(current_balance) AS total FROM ${SCHEMA}.v_account_balances WHERE user_id = $1`, [userId]);
        const people = await connection_1.db.query(`SELECT SUM(amount_they_owe_you) AS total_receivable, SUM(amount_you_owe_them) AS total_payable
       FROM ${SCHEMA}.v_person_balances WHERE user_id = $1`, [userId]);
        const loans = await connection_1.db.query(`SELECT
         SUM(CASE WHEN direction = 'BORROWED' AND status = 'ACTIVE' THEN principal_amount + interest_amount ELSE 0 END) AS total_borrowed,
         SUM(CASE WHEN direction = 'LENT' AND status = 'ACTIVE' THEN principal_amount + interest_amount ELSE 0 END) AS total_lent
       FROM ${SCHEMA}.loans
       WHERE user_id = $1`, [userId]);
        const totalCash = parseFloat(accounts.rows[0]?.total || "0");
        const totalReceivable = parseFloat(people.rows[0]?.total_receivable || "0");
        const totalPayable = parseFloat(people.rows[0]?.total_payable || "0");
        const totalBorrowed = parseFloat(loans.rows[0]?.total_borrowed || "0");
        const totalLent = parseFloat(loans.rows[0]?.total_lent || "0");
        const netPosition = totalCash + totalReceivable - totalPayable;
        res.json({
          success: true,
          data: {
            totalCash,
            totalReceivable,
            totalPayable,
            netPosition,
            loanSummary: {
              totalBorrowed,
              totalLent
            }
          }
        });
      } catch (error) {
        console.error("Financial position error:", error);
        res.status(500).json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to calculate financial position" }
        });
      }
    });
    exports2.default = router;
  }
});

// server/dist/app.js
var __importDefault = exports && exports.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var cookie_parser_1 = __importDefault(require("cookie-parser"));
var compression_1 = __importDefault(require("compression"));
var helmet_1 = __importDefault(require("helmet"));
var cors_1 = __importDefault(require("cors"));
var path_1 = __importDefault(require("path"));
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var rateLimit_1 = require_rateLimit();
var auth_1 = __importDefault(require_auth2());
var accounts_1 = __importDefault(require_accounts());
var people_1 = __importDefault(require_people());
var categories_1 = __importDefault(require_categories());
var transactions_1 = __importDefault(require_transactions());
var loans_1 = __importDefault(require_loans());
var dashboard_1 = __importDefault(require_dashboard());
var reports_1 = __importDefault(require_reports());
var app = (0, express_1.default)();
var PORT = parseInt(process.env.PORT || "3001", 10);
var isProduction = process.env.NODE_ENV === "production";
app.use((0, helmet_1.default)({
  contentSecurityPolicy: isProduction ? void 0 : false
}));
app.use((0, compression_1.default)());
var allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3001"
].filter(Boolean);
app.use((0, cors_1.default)({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", auth_1.default);
app.use("/api/accounts", rateLimit_1.apiLimiter, accounts_1.default);
app.use("/api/people", rateLimit_1.apiLimiter, people_1.default);
app.use("/api/categories", rateLimit_1.apiLimiter, categories_1.default);
app.use("/api/transactions", rateLimit_1.apiLimiter, transactions_1.default);
app.use("/api/loans", rateLimit_1.apiLimiter, loans_1.default);
app.use("/api/dashboard", rateLimit_1.apiLimiter, dashboard_1.default);
app.use("/api/reports", rateLimit_1.apiLimiter, reports_1.default);
app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() } });
});
if (isProduction) {
  const clientBuildPath = path_1.default.resolve(__dirname, "../../client/dist");
  app.use(express_1.default.static(clientBuildPath, {
    maxAge: "1y",
    // Cache static assets for 1 year
    immutable: true,
    index: false
    // Don't serve index.html for '/' via static
  }));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path_1.default.join(clientBuildPath, "index.html"), (err) => {
        if (err) {
          console.error("Failed to serve index.html:", err);
          res.status(500).json({
            success: false,
            error: { code: "BUILD_MISSING", message: "Frontend build not found. Run npm run build in the client directory." }
          });
        }
      });
    }
  });
}
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "SERVER_ERROR",
      message: isProduction ? "An unexpected error occurred" : err.message
    }
  });
});
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\u{1F680} Finance Tracker API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  });
}
exports.default = app;
