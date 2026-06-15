require("dotenv").config();

const cors = require("cors");
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4000;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "owner123";
const OWNER_TOKEN = process.env.OWNER_TOKEN || "dev-owner-token";
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : null;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, storage: pool ? "postgres" : "json" });
});

app.post("/api/orders", async (req, res) => {
  const order = req.body;
  const validationError = validateOrder(order);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const savedOrder = {
    ...order,
    id: Date.now(),
    createdAt: new Date().toLocaleString(),
    status: "new",
  };
  await saveOrder(savedOrder);

  res.status(201).json(savedOrder);
});

app.post("/api/admin/login", (req, res) => {
  if (req.body.password !== OWNER_PASSWORD) {
    return res.status(401).json({ error: "Invalid owner password." });
  }

  res.json({ token: OWNER_TOKEN });
});

app.get("/api/admin/orders", requireOwner, async (req, res) => {
  const orders = await readOrders();
  res.json(orders);
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
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (token !== OWNER_TOKEN) {
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
    if (!String(order.customer[field] || "").trim()) {
      return `${field} is required.`;
    }
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

async function ensurePostgresDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'new',
      order_data JSONB NOT NULL
    )
  `);
}

async function ensureDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, "[]");
  }
}
