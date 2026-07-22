require("dotenv").config();

const cors = require("cors");
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const Stripe = require("stripe");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 4000;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
if (!OWNER_PASSWORD) throw new Error("OWNER_PASSWORD environment variable is required.");
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const adminSessions = new Map();
const loginAttempts = new Map();
const PRODUCT_CATALOG = new Map([
  ["1", { name: "Lapsi Candy", price: 6.99 }],
  ["2", { name: "Khattu", price: 6.99 }],
  ["3", { name: "Bechi Nunilo", price: 6.99 }],
  ["4", { name: "Rangila", price: 6.99 }],
  ["5", { name: "Mango Jhol", price: 7.99 }],
  ["6", { name: "Imly Jhol", price: 7.99 }],
  ["7", { name: "Nibuwa Jhol", price: 7.99 }],
  ["8", { name: "Lapsi Jhol", price: 7.99 }],
  ["9", { name: "MoMo pau", price: 8.99 }],
  ["10", { name: "Donation", price: 1.99 }],
]);
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");
const DEFAULT_INVENTORY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((productId) => ({
  productId: String(productId),
  quantity: 0,
}));
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: {
          rejectUnauthorized: false }
    })
  : null;

const allowedOrigins = [
  "http://localhost:5173",
  "https://rangilabroo.netlify.app",
  "https://rangilabroo.com",
  "https://www.rangilabroo.com",
];

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Allows requests such as Render health checks with no Origin header
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, storage: pool ? "postgres" : "json" });
});

app.get("/api/inventory", async (req, res) => {
  res.json(await readInventory());
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;
    const validationError = validateOrder(order);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const pricedOrder = priceCart(order.items, order.shipping?.method);
    if (pricedOrder.error) return res.status(400).json({ error: pricedOrder.error });

    const stockError = await validateInventory(pricedOrder.items);
    if (stockError) {
      return res.status(409).json({ error: stockError });
    }

    if (!stripe) {
      return res.status(500).json({
        error: "Stripe is not configured on the server.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.payment.intentId
    );

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        error: `Payment is not complete. Current status: ${paymentIntent.status}`,
      });
    }

    const expectedAmount = pricedOrder.totalCents;

    if (paymentIntent.amount_received !== expectedAmount) {
      return res.status(400).json({
        error: "Paid amount does not match the order total.",
      });
    }

    if (paymentIntent.currency !== "usd") {
      return res.status(400).json({
        error: "Payment currency does not match the order currency.",
      });
    }

    const existingOrders = await readOrders();

    const duplicateOrder = existingOrders.find(
      (existingOrder) =>
        existingOrder.payment?.intentId === paymentIntent.id
    );

    if (duplicateOrder) {
      return res.status(200).json(duplicateOrder);
    }

    const savedOrder = {
      customer: sanitizeCustomer(order.customer),
      items: pricedOrder.items,
      shipping: pricedOrder.shipping,
      subtotal: pricedOrder.subtotalCents / 100,
      total: pricedOrder.totalCents / 100,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: "paid",
      payment: {
        intentId: paymentIntent.id,
        status: paymentIntent.status,
        amountReceived: paymentIntent.amount_received,
        currency: paymentIntent.currency,
        paymentMethodType: paymentIntent.payment_method_types?.[0] || "card",
      },
    };

    await saveOrderWithInventory(savedOrder);

    return res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Save order error:", error);

    return res.status(500).json({
      error: "Order could not be saved.",
    });
  }
});

app.post("/api/create-payment-intent", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({
      error: "Stripe is not configured on the server.",
    });
  }

  try {
    const currency = String(req.body.currency || "usd").toLowerCase();
    const shippingMethod = req.body.shippingMethod || "unknown";
    const customer = req.body.customer || {};
    const pricedOrder = priceCart(req.body.items, shippingMethod);
    if (pricedOrder.error) return res.status(400).json({ error: pricedOrder.error });

    const stockError = await validateInventory(pricedOrder.items);

    if (stockError) {
      return res.status(409).json({ error: stockError });
    }

    if (currency !== "usd") {
      return res.status(400).json({
        error: "Only USD payments are currently supported.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricedOrder.totalCents,
      currency,

      automatic_payment_methods: {
        enabled: true,
      },

      metadata: {
        store: "Rangila Brooo",
        shippingMethod,
        customerName: String(customer.fullName || ""),
        customerPhone: String(customer.phone || ""),
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe PaymentIntent error:", error);

    return res.status(500).json({
      error: "Unable to create payment intent.",
    });
  }
});


app.post("/api/admin/login", (req, res) => {
  const attemptKey = req.ip;
  const now = Date.now();
  const attempt = loginAttempts.get(attemptKey);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }

  if (!safeEqual(req.body.password, OWNER_PASSWORD)) {
    const current = attempt && attempt.resetAt > now
      ? attempt
      : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    current.count += 1;
    loginAttempts.set(attemptKey, current);
    return res.status(401).json({ error: "Invalid owner password." });
  }

  loginAttempts.delete(attemptKey);
  const sessionId = crypto.randomBytes(32).toString("hex");
  adminSessions.set(sessionId, now + ADMIN_SESSION_TTL_MS);
  res.setHeader("Set-Cookie", buildSessionCookie(sessionId, ADMIN_SESSION_TTL_MS));
  res.json({ success: true });
});

app.get("/api/admin/session", requireOwner, (req, res) => res.json({ authenticated: true }));

app.post("/api/admin/logout", (req, res) => {
  const sessionId = readCookie(req, "admin_session");
  if (sessionId) adminSessions.delete(sessionId);
  res.setHeader("Set-Cookie", buildSessionCookie("", 0));
  res.json({ success: true });
});

app.get("/api/admin/orders", requireOwner, async (req, res) => {
  const orders = await readOrders();
  res.json(orders);
});

app.get("/api/admin/inventory", requireOwner, async (req, res) => {
  res.json(await readInventory());
});

app.put("/api/admin/inventory/:productId", requireOwner, async (req, res) => {
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: "Quantity must be a non-negative whole number." });
  }

  await setInventoryQuantity(req.params.productId, quantity);
  return res.json({ productId: String(req.params.productId), quantity });
});

app.delete("/api/admin/orders/:orderId", requireOwner, async (req, res) => {
  try {
    const deleted = await deleteOrder(req.params.orderId);

    if (!deleted) {
      return res.status(404).json({ error: "Order not found." });
    }

    return res.json({ success: true, orderId: req.params.orderId });
  } catch (error) {
    console.error("Delete order error:", error);
    return res.status(500).json({
      error: "Order could not be deleted.",
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Order storage: ${pool ? "PostgreSQL" : "JSON file"}`);
});

function requireOwner(req, res, next) {
  const sessionId = readCookie(req, "admin_session");
  const expiresAt = sessionId ? adminSessions.get(sessionId) : 0;
  if (!expiresAt || expiresAt <= Date.now()) {
    if (sessionId) adminSessions.delete(sessionId);
    return res.status(401).json({ error: "Owner access required." });
  }

  next();
}

function validateOrder(order) {
  if (!order || typeof order !== "object") {
    return "Order is required.";
  }

  if (!order.customer || typeof order.customer !== "object") {
    return "Customer information is required.";
  }

  const requiredCustomerFields = [
    "fullName",
    "streetAddress",
    "city",
    "state",
    "zipcode",
    "phone",
  ];

  for (const field of requiredCustomerFields) {
    const value = String(order.customer[field] || "").trim();
    if (!value) {
      return `${field} is required.`;
    }
    if (value.length > customerFieldLimit(field)) {
      return `${field} is too long.`;
    }
  }

  if (String(order.customer.apartment || "").length > 100) {
    return "apartment is too long.";
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return "Order items are required.";
  }

  if (!order.shipping || typeof order.shipping !== "object") {
    return "Shipping information is required.";
  }

  if (typeof order.subtotal !== "number" || typeof order.total !== "number") {
    return "Order totals are required.";
  }

  if (typeof order.subtotal !== "number" || typeof order.total !== "number") {
  return "Order totals are required.";
}

if (!order.payment || typeof order.payment !== "object") {
  return "Payment information is required.";
}

if (!String(order.payment.intentId || "").startsWith("pi_")) {
  return "Valid payment intent ID is required.";
}

if (order.payment.status !== "succeeded") {
  return "Payment must be successful before the order is saved.";
}
  return "";
}

async function readOrders() {
  if (pool) {
    await ensurePostgresDatabase();
    const result = await pool.query(
      "SELECT order_data FROM orders ORDER BY created_at DESC"
    );

    return result.rows.map((row) => row.order_data);
  }

  await ensureDatabase();
  const rawOrders = await fs.readFile(ORDERS_FILE, "utf8");
  return JSON.parse(rawOrders);
}

async function saveOrder(order) {
  if (pool) {
    await ensurePostgresDatabase();
    await pool.query(
      `INSERT INTO orders (id, created_at, status, order_data)
       VALUES ($1, $2, $3, $4)`,
      [String(order.id), new Date(order.id), order.status, order]
    );
    return;
  }

  await ensureDatabase();
  const orders = await readOrders();

  orders.unshift(order);
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

async function deleteOrder(orderId) {
  if (pool) {
    await ensurePostgresDatabase();
    const result = await pool.query("DELETE FROM orders WHERE id = $1", [String(orderId)]);
    return result.rowCount > 0;
  }

  await ensureDatabase();
  const orders = await readOrders();
  const filteredOrders = orders.filter((order) => String(order.id) !== String(orderId));

  if (filteredOrders.length === orders.length) {
    return false;
  }

  await fs.writeFile(ORDERS_FILE, JSON.stringify(filteredOrders, null, 2));
  return true;
}

async function saveOrderWithInventory(order) {
  if (!pool) {
    await decrementInventory(order.items);
    try {
      await saveOrder(order);
    } catch (error) {
      await restoreInventory(order.items);
      throw error;
    }
    return;
  }

  await ensurePostgresDatabase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of order.items) {
      const result = await client.query(
        `UPDATE inventory SET quantity = quantity - $1
         WHERE product_id = $2 AND quantity >= $1`,
        [item.quantity, String(item.id)]
      );
      if (result.rowCount === 0) throw new Error(`Insufficient stock for product ${item.id}.`);
    }
    await client.query(
      `INSERT INTO orders (id, created_at, status, order_data)
       VALUES ($1, $2, $3, $4)`,
      [String(order.id), new Date(order.id), order.status, order]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function restoreInventory(items) {
  const inventory = await readInventory();
  for (const item of items) {
    const stock = inventory.find((entry) => entry.productId === String(item.id));
    if (stock) stock.quantity += item.quantity;
  }
  await fs.writeFile(INVENTORY_FILE, JSON.stringify(inventory, null, 2));
}

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function readCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function buildSessionCookie(value, maxAgeMs) {
  const production = process.env.NODE_ENV === "production";
  const cookieSecurity = production ? "; SameSite=None; Secure" : "; SameSite=Lax";
  return `admin_session=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${cookieSecurity}`;
}

function priceCart(items, shippingMethod) {
  if (!Array.isArray(items) || items.length === 0) return { error: "Cart items are required." };
  if (!["delivery", "pickup"].includes(shippingMethod)) return { error: "Invalid shipping method." };

  const seen = new Set();
  const canonicalItems = [];
  let subtotalCents = 0;
  for (const item of items) {
    const productId = String(item.id);
    const product = PRODUCT_CATALOG.get(productId);
    const quantity = Number(item.quantity);
    if (!product || seen.has(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return { error: "Cart contains an invalid product or quantity." };
    }
    seen.add(productId);
    const priceCents = Math.round(product.price * 100);
    subtotalCents += priceCents * quantity;
    canonicalItems.push({ id: Number(productId), name: product.name, price: product.price, quantity });
  }

  const shippingCents = shippingMethod === "delivery" ? 899 : 0;
  return {
    items: canonicalItems,
    subtotalCents,
    totalCents: subtotalCents + shippingCents,
    shipping: shippingMethod === "delivery"
      ? { method: "delivery", cost: 8.99, label: "Delivery ($8.99)" }
      : { method: "pickup", cost: 0, label: "Pickup at 1400 Sierra Spring Dr" },
  };
}

function sanitizeCustomer(customer) {
  return {
    fullName: String(customer.fullName).trim(),
    streetAddress: String(customer.streetAddress).trim(),
    apartment: String(customer.apartment || "").trim(),
    city: String(customer.city).trim(),
    state: String(customer.state).trim(),
    zipcode: String(customer.zipcode).trim(),
    phone: String(customer.phone).trim(),
  };
}

function customerFieldLimit(field) {
  return {
    fullName: 120,
    streetAddress: 200,
    city: 100,
    state: 50,
    zipcode: 20,
    phone: 30,
  }[field] || 200;
}

async function readInventory() {
  if (pool) {
    await ensurePostgresDatabase();
    const result = await pool.query(
      "SELECT product_id, quantity FROM inventory ORDER BY product_id"
    );
    return result.rows.map((row) => ({
      productId: String(row.product_id),
      quantity: Number(row.quantity),
    }));
  }

  await ensureDatabase();
  return JSON.parse(await fs.readFile(INVENTORY_FILE, "utf8"));
}

async function setInventoryQuantity(productId, quantity) {
  if (pool) {
    await ensurePostgresDatabase();
    await pool.query(
      `INSERT INTO inventory (product_id, quantity) VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [String(productId), quantity]
    );
    return;
  }

  const inventory = await readInventory();
  const existing = inventory.find((item) => item.productId === String(productId));
  if (existing) existing.quantity = quantity;
  else inventory.push({ productId: String(productId), quantity });
  await fs.writeFile(INVENTORY_FILE, JSON.stringify(inventory, null, 2));
}

async function validateInventory(items) {
  if (!Array.isArray(items) || items.length === 0) return "Cart items are required.";
  const inventory = await readInventory();

  for (const item of items) {
    const stock = inventory.find((entry) => entry.productId === String(item.id));
    const requested = Number(item.quantity);
    if (!stock || !Number.isInteger(requested) || requested < 1 || requested > stock.quantity) {
      return `${item.name || "A product"} does not have enough stock available.`;
    }
  }
  return "";
}

async function decrementInventory(items) {
  if (pool) {
    for (const item of items) {
      const result = await pool.query(
        `UPDATE inventory SET quantity = quantity - $1
         WHERE product_id = $2 AND quantity >= $1`,
        [Number(item.quantity), String(item.id)]
      );
      if (result.rowCount === 0) throw new Error(`Insufficient stock for ${item.name}.`);
    }
    return;
  }

  const inventory = await readInventory();
  for (const item of items) {
    const stock = inventory.find((entry) => entry.productId === String(item.id));
    if (!stock || stock.quantity < item.quantity) throw new Error(`Insufficient stock for ${item.name}.`);
    stock.quantity -= item.quantity;
  }
  await fs.writeFile(INVENTORY_FILE, JSON.stringify(inventory, null, 2));
}

async function ensurePostgresDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'new',
      order_data JSONB NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT PRIMARY KEY,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
    )
  `);
  for (const item of DEFAULT_INVENTORY) {
    await pool.query(
      "INSERT INTO inventory (product_id, quantity) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [item.productId, item.quantity]
    );
  }
}

async function ensureDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, "[]");
  }
  try {
    await fs.access(INVENTORY_FILE);
  } catch {
    await fs.writeFile(INVENTORY_FILE, JSON.stringify(DEFAULT_INVENTORY, null, 2));
  }
}
