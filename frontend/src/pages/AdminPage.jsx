import { useState } from "react";
import "../styles/AdminPage.css";
import logoImage from "../assets/logo.png";

function AdminPage({ products, orders, isOwner, loginOwner, logoutOwner, onDeleteOrder, onUpdateInventory }) {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminView, setAdminView] = useState("orders");

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

  async function confirmDeleteOrder() {
    if (!orderToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError("");
      await onDeleteOrder(orderToDelete.id);

      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
    } catch {
      setDeleteError("This order could not be deleted right now.");
      setOrderToDelete(null);
    } finally {
      setIsDeleting(false);
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
          <h1>{adminView === "receipt" ? "Create Receipt" : adminView === "inventory" ? "Inventory" : "Placed Orders"}</h1>
        </div>
        <button className="owner-logout" onClick={logoutOwner}>
          Log Out
        </button>
      </div>

      <nav className="admin-view-nav" aria-label="Admin pages">
        <button
          className={adminView === "orders" ? "active" : ""}
          onClick={() => setAdminView("orders")}
        >
          Placed Orders
        </button>
        <button
          className={adminView === "receipt" ? "active" : ""}
          onClick={() => setAdminView("receipt")}
        >
          Create Receipt
        </button>
        <button
          className={adminView === "inventory" ? "active" : ""}
          onClick={() => setAdminView("inventory")}
        >
          Inventory
        </button>
      </nav>

      {deleteError && <p className="admin-status-error">{deleteError}</p>}

      {adminView === "inventory" ? (
        <InventoryManager products={products} onUpdateInventory={onUpdateInventory} />
      ) : adminView === "receipt" ? (
        <ManualReceiptBuilder products={products} onPrint={openReceiptPdf} />
      ) : selectedOrder ? (
        <OrderReceipt
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          onDownload={() => openReceiptPdf(selectedOrder)}
        />
      ) : (
        <OrderList
          orders={orders}
          onSelectOrder={setSelectedOrder}
          onDeleteOrder={setOrderToDelete}
        />
      )}

      {orderToDelete && (
        <div
          className="delete-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setOrderToDelete(null);
            }
          }}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <p className="eyebrow">Confirm deletion</p>
            <h2 id="delete-modal-title">Delete order #{orderToDelete.id}?</h2>
            <p id="delete-modal-description">
              This will permanently remove the order and cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button
                className="delete-modal-cancel"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="delete-modal-confirm"
                onClick={confirmDeleteOrder}
                disabled={isDeleting}
                autoFocus
              >
                {isDeleting ? "Deleting..." : "Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InventoryManager({ products, onUpdateInventory }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(
    products.map((product) => [product.id, product.stock])
  ));
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");

  async function saveStock(product) {
    const quantity = Number(draft[product.id]);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setMessage("Stock must be a non-negative whole number.");
      return;
    }

    try {
      setSavingId(product.id);
      setMessage("");
      await onUpdateInventory(product.id, quantity);
      setMessage(`${product.name} inventory updated to ${quantity}.`);
    } catch {
      setMessage("Inventory could not be updated right now.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="inventory-manager">
      <p className="inventory-note">
        Set the number of units available. Products at zero are automatically marked out of stock.
      </p>
      {message && <p className="inventory-message">{message}</p>}
      <div className="inventory-list">
        {products.map((product) => (
          <div className="inventory-row" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <small>{product.stock > 0 ? `${product.stock} currently available` : "Out of stock"}</small>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              aria-label={`${product.name} stock`}
              value={draft[product.id] ?? product.stock}
              onChange={(event) => setDraft((current) => ({
                ...current,
                [product.id]: event.target.value,
              }))}
            />
            <button onClick={() => saveStock(product)} disabled={savingId === product.id}>
              {savingId === product.id ? "Saving..." : "Save"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManualReceiptBuilder({ products, onPrint }) {
  const [customer, setCustomer] = useState({
    fullName: "",
    phone: "",
    streetAddress: "",
    apartment: "",
    city: "",
    state: "",
    zipcode: "",
  });
  const [quantities, setQuantities] = useState({});
  const [shippingCost, setShippingCost] = useState("0");
  const [receipt, setReceipt] = useState(null);

  function updateCustomer(event) {
    setCustomer((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function updateProductQuantity(productId, value) {
    const quantity = Math.max(0, Number.parseInt(value, 10) || 0);
    setQuantities((current) => ({ ...current, [productId]: quantity }));
  }

  function generateReceipt(event) {
    event.preventDefault();
    const items = products
      .map((product, index) => ({
        ...product,
        id: `${product.id}-${index}`,
        quantity: quantities[`${product.id}-${index}`] || 0,
      }))
      .filter((product) => product.quantity > 0);

    if (items.length === 0) return;

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = Math.max(0, Number(shippingCost) || 0);

    setReceipt({
      id: `R-${Date.now()}`,
      createdAt: new Date().toLocaleString(),
      customer,
      items,
      subtotal,
      shipping: {
        label: deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : "No charge",
      },
      total: subtotal + deliveryFee,
      manualReceipt: true,
    });
  }

  if (receipt) {
    return (
      <OrderReceipt
        order={receipt}
        onBack={() => setReceipt(null)}
        onDownload={() => onPrint(receipt)}
      />
    );
  }

  return (
    <form className="manual-receipt-form" onSubmit={generateReceipt}>
      <section className="receipt-form-card">
        <h2>Customer Information</h2>
        <div className="receipt-form-grid">
          <label>
            Full Name
            <input name="fullName" value={customer.fullName} onChange={updateCustomer} required />
          </label>
          <label>
            Phone
            <input name="phone" value={customer.phone} onChange={updateCustomer} required />
          </label>
          <label className="full-width">
            Street Address
            <input name="streetAddress" value={customer.streetAddress} onChange={updateCustomer} required />
          </label>
          <label>
            Apartment (optional)
            <input name="apartment" value={customer.apartment} onChange={updateCustomer} />
          </label>
          <label>
            City
            <input name="city" value={customer.city} onChange={updateCustomer} required />
          </label>
          <label>
            State
            <input name="state" value={customer.state} onChange={updateCustomer} required />
          </label>
          <label>
            ZIP Code
            <input name="zipcode" value={customer.zipcode} onChange={updateCustomer} required />
          </label>
        </div>
      </section>

      <section className="receipt-form-card">
        <h2>Products</h2>
        <div className="receipt-product-list">
          {products.map((product, index) => (
            <label className="receipt-product" key={`${product.id}-${index}`}>
              <span>
                <strong>{product.name}</strong>
                <small>${product.price.toFixed(2)} each</small>
              </span>
              <input
                type="number"
                min="0"
                step="1"
                aria-label={`${product.name} quantity`}
                value={quantities[`${product.id}-${index}`] || ""}
                onChange={(event) =>
                  updateProductQuantity(`${product.id}-${index}`, event.target.value)
                }
                placeholder="0"
              />
            </label>
          ))}
        </div>
        <label className="shipping-cost-field">
          Delivery charge ($)
          <input
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={(event) => setShippingCost(event.target.value)}
          />
        </label>
      </section>

      <button className="generate-receipt-button" type="submit">
        Generate Receipt
      </button>
    </form>
  );
}

function OrderList({ orders, onSelectOrder, onDeleteOrder }) {
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
        <div className="order-row" key={order.id}>
          <button
            className="order-row-main"
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
          <button
            className="delete-order-button"
            onClick={() => onDeleteOrder(order)}
          >
            Delete
          </button>
        </div>
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
          <div className="receipt-brand">
            <img src={logoImage} alt="Rangila Brooo logo" />
            <div>
              <h2>Rangila Brooo</h2>
              <p>Authentic Nepali flavors</p>
            </div>
          </div>
          <div className="receipt-meta">
            <h2>RECEIPT</h2>
            <strong>#{order.id}</strong>
            <p>{order.createdAt}</p>
          </div>
        </header>

        <div className="receipt-parties">
          <section className="receipt-section">
            <h3>Customer</h3>
            <strong>{order.customer.fullName}</strong>
            <p>{order.customer.phone}</p>
          </section>

          <section className="receipt-section">
            <h3>Ship To</h3>
            <p>{order.customer.streetAddress}</p>
            {order.customer.apartment && <p>{order.customer.apartment}</p>}
            <p>
              {order.customer.city}, {order.customer.state}{" "}
              {order.customer.zipcode}
            </p>
          </section>
        </div>

        <section className="receipt-section">
          <div className="receipt-items-table">
            <div className="receipt-item receipt-item-heading">
              <span>Item</span><span>Qty</span><span>Unit Price</span><span>Amount</span>
            </div>
            {order.items.map((item) => (
              <div className="receipt-item" key={item.id}>
                <span>{item.name}</span>
                <span>{item.quantity}</span>
                <span>${item.price.toFixed(2)}</span>
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
          <span>${escapeHtml(item.name)}</span>
          <span>${item.quantity}</span>
          <span>$${item.price.toFixed(2)}</span>
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
      .brand { align-items: center; display: flex; gap: 14px; }
      .brand img { height: 64px; object-fit: contain; width: 64px; }
      .brand p, .meta p { margin: 3px 0 0; }
      .meta { text-align: right; }
      .parties { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; }
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
        gap: 16px;
        padding: 8px 0;
      }
      .item-row { border-bottom: 1px solid #f3d2a2; display: grid; grid-template-columns: 1fr 60px 100px 100px; }
      .item-row span:not(:first-child), .item-row strong { text-align: right; }
      .item-heading { background: #fff7ed; color: #8a2f0a; font-weight: 700; padding: 10px 8px; }
      .total-row { display: flex; justify-content: space-between; }
      .grand-total {
        color: #8a2f0a;
        font-size: 1.2rem;
      }
      @media print {
        body { padding: 0; }
        .receipt { border: 0; }
      }
      @media (max-width: 600px) { .parties { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header>
        <div class="brand">
          <img src="${escapeHtml(logoImage)}" alt="Rangila Brooo logo" />
          <div><h1>Rangila Brooo</h1><p>Authentic Nepali flavors</p></div>
        </div>
        <div class="meta">
          <h2>RECEIPT</h2>
          <strong>#${order.id}</strong>
          <p>${escapeHtml(order.createdAt)}</p>
        </div>
      </header>

      <div class="parties">
        <section><h2>Customer</h2><p><strong>${escapeHtml(order.customer.fullName)}</strong></p><p>${escapeHtml(order.customer.phone)}</p></section>
        <section><h2>Ship To</h2><p>${escapeHtml(order.customer.streetAddress)}</p>${order.customer.apartment ? `<p>${escapeHtml(order.customer.apartment)}</p>` : ""}<p>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.zipcode)}</p></section>
      </div>

      ${order.manualReceipt ? "" : `<section>
        <h2>Payment</h2>
        <p>Method: ${escapeHtml(order.payment?.paymentMethodType || "Stripe card")}</p>
        <p>Status: ${escapeHtml(order.payment?.status || "Paid")}</p>
        <p>Amount: $${((order.payment?.amountReceived || Math.round(order.total * 100)) / 100).toFixed(2)}</p>
      </section>`}

      <section>
        <h2>Items</h2>
        <div class="item-row item-heading"><span>Item</span><span>Qty</span><span>Unit Price</span><span>Amount</span></div>
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
