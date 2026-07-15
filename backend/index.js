require("dotenv").config();

const cors = require("cors");
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 4000;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "owner123";
const OWNER_TOKEN = process.env.OWNER_TOKEN || "dev-owner-token";
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : null;

app.use(
  cors({
    origin: [
      "https://rangilabroo.netlify.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, storage: pool ? "postgres" : "json" });
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

    const expectedAmount = Math.round(order.total * 100);

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
      ...order,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: "paid",
      payment: {
        ...order.payment,
        intentId: paymentIntent.id,
        status: paymentIntent.status,
        amountReceived: paymentIntent.amount_received,
        currency: paymentIntent.currency,
      },
    };

    await saveOrder(savedOrder);

    return res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Save order error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Order could not be saved.",
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
    const amount = Number(req.body.amount);
    const currency = String(req.body.currency || "usd").toLowerCase();
    const shippingMethod = req.body.shippingMethod || "unknown";
    const customer = req.body.customer || {};

    if (!Number.isInteger(amount) || amount < 50) {
      return res.status(400).json({
        error: "Amount must be a valid number of cents.",
      });
    }

    if (currency !== "usd") {
      return res.status(400).json({
        error: "Only USD payments are currently supported.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
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
      error:
        error instanceof Error
          ? error.message
          : "Unable to create payment intent.",
    });
  }
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
