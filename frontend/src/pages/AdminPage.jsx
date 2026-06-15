import { useState } from "react";
import "../styles/AdminPage.css";

function AdminPage({ orders, isOwner, loginOwner, logoutOwner }) {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function submitLogin(event) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const loginSucceeded = await loginOwner(password);

      if (!loginSucceeded) {
        setLoginError("Owner password is incorrect.");
        return;
      }

      setPassword("");
    } catch {
      setLoginError("Owner login is unavailable right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  function openReceiptPdf(order) {
    const receiptWindow = window.open("", "_blank", "width=820,height=1000");

    if (!receiptWindow) {
      return;
    }

    receiptWindow.document.write(buildReceiptHtml(order));
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  if (!isOwner) {
    return (
      <section className="page admin-page">
        <div className="section-heading">
          <p className="eyebrow">Owner</p>
          <h1>Owner Login</h1>
        </div>

        <form className="owner-login" onSubmit={submitLogin}>
          <h2>Private Orders Area</h2>
          <label htmlFor="owner-password">Password</label>
          <input
            id="owner-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {loginError && <p>{loginError}</p>}
          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Unlocking..." : "Unlock Orders"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="page admin-page">
      <div className="admin-header">
        <div className="section-heading">
          <p className="eyebrow">Admin</p>
          <h1>Placed Orders</h1>
        </div>
        <button className="owner-logout" onClick={logoutOwner}>
          Log Out
        </button>
      </div>

      {selectedOrder ? (
        <OrderReceipt
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          onDownload={() => openReceiptPdf(selectedOrder)}
        />
      ) : (
        <OrderList orders={orders} onSelectOrder={setSelectedOrder} />
      )}
    </section>
  );
}

function OrderList({ orders, onSelectOrder }) {
  if (orders.length === 0) {
    return (
      <div className="admin-empty">
        <h2>No orders yet.</h2>
        <p>Customer orders will appear here after checkout.</p>
      </div>
    );
  }

  return (
    <div className="orders-table">
      <div className="orders-table-header">
        <span>Order</span>
        <span>Customer</span>
        <span>Delivery</span>
        <span>Total</span>
      </div>

      {orders.map((order) => (
        <button
          className="order-row"
          key={order.id}
          onClick={() => onSelectOrder(order)}
        >
          <span>
            <strong>#{order.id}</strong>
            <small>{order.createdAt}</small>
          </span>
          <span>{order.customer.fullName}</span>
          <span>{order.shipping.label}</span>
          <strong>${order.total.toFixed(2)}</strong>
        </button>
      ))}
    </div>
  );
}

function OrderReceipt({ order, onBack, onDownload }) {
  return (
    <article className="receipt">
      <div className="receipt-actions">
        <button className="ghost-admin-button" onClick={onBack}>
          Back to Orders
        </button>
        <button onClick={onDownload}>Save Receipt as PDF</button>
      </div>

      <div className="receipt-paper">
        <header className="receipt-header">
          <div>
            <p className="eyebrow">Receipt</p>
            <h2>Rangila Brooo</h2>
          </div>
          <div>
            <strong>Order #{order.id}</strong>
            <p>{order.createdAt}</p>
          </div>
        </header>

        <section className="receipt-section">
          <h3>Customer</h3>
          <p>{order.customer.fullName}</p>
          <p>{order.customer.phone}</p>
        </section>

        <section className="receipt-section">
          <h3>Shipping Address</h3>
          <p>{order.customer.streetAddress}</p>
          {order.customer.apartment && <p>{order.customer.apartment}</p>}
          <p>
            {order.customer.city}, {order.customer.state}{" "}
            {order.customer.zipcode}
          </p>
        </section>

        <section className="receipt-section">
          <h3>Items</h3>
          <div className="receipt-items">
            {order.items.map((item) => (
              <div className="receipt-item" key={item.id}>
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>${(item.price * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="receipt-totals">
          <div>
            <span>Subtotal</span>
            <strong>${order.subtotal.toFixed(2)}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <strong>{order.shipping.label}</strong>
          </div>
          <div className="receipt-grand-total">
            <span>Total</span>
            <strong>${order.total.toFixed(2)}</strong>
          </div>
        </section>
      </div>
    </article>
  );
}

function buildReceiptHtml(order) {
  const itemRows = order.items
    .map(
      (item) =>
        `<div class="item-row">
          <span>${escapeHtml(item.name)} x ${item.quantity}</span>
          <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
        </div>`
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <title>Rangila Brooo Order ${order.id}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        color: #3b1f0f;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 32px;
      }
      .receipt {
        border: 1px solid #f3d2a2;
        border-radius: 8px;
        margin: 0 auto;
        max-width: 720px;
        padding: 28px;
      }
      header {
        align-items: flex-start;
        border-bottom: 1px solid #f3d2a2;
        display: flex;
        justify-content: space-between;
        padding-bottom: 18px;
      }
      h1, h2 {
        color: #8a2f0a;
        margin: 0;
      }
      section {
        border-bottom: 1px solid #f3d2a2;
        padding: 18px 0;
      }
      p {
        line-height: 1.5;
        margin: 4px 0;
      }
      .item-row,
      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 8px 0;
      }
      .grand-total {
        color: #8a2f0a;
        font-size: 1.2rem;
      }
      @media print {
        body { padding: 0; }
        .receipt { border: 0; }
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header>
        <div>
          <h1>Rangila Brooo</h1>
          <p>Receipt</p>
        </div>
        <div>
          <strong>Order #${order.id}</strong>
          <p>${escapeHtml(order.createdAt)}</p>
        </div>
      </header>

      <section>
        <h2>Customer</h2>
        <p>${escapeHtml(order.customer.fullName)}</p>
        <p>${escapeHtml(order.customer.phone)}</p>
      </section>

      <section>
        <h2>Shipping Address</h2>
        <p>${escapeHtml(order.customer.streetAddress)}</p>
        ${
          order.customer.apartment
            ? `<p>${escapeHtml(order.customer.apartment)}</p>`
            : ""
        }
        <p>${escapeHtml(order.customer.city)}, ${escapeHtml(
    order.customer.state
  )} ${escapeHtml(order.customer.zipcode)}</p>
      </section>

      <section>
        <h2>Items</h2>
        ${itemRows}
      </section>

      <section>
        <div class="total-row">
          <span>Subtotal</span>
          <strong>$${order.subtotal.toFixed(2)}</strong>
        </div>
        <div class="total-row">
          <span>Shipping</span>
          <strong>${escapeHtml(order.shipping.label)}</strong>
        </div>
        <div class="total-row grand-total">
          <span>Total</span>
          <strong>$${order.total.toFixed(2)}</strong>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default AdminPage;
