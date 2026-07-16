import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "../styles/CartPage.css";

function PaymentStep({
  clientSecret,
  checkoutForm,
  orderTotal,
  onPaymentError,
  onPaymentProcessing,
  onPaymentSuccess,
  paymentError,
  paymentProcessing,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [elementError, setElementError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (paymentProcessing) {
      return;
    }

    if (!stripe || !elements) {
      onPaymentError("Stripe is still loading. Please wait.");
      return;
    }

    if (!paymentElementReady) {
      onPaymentError("Payment form is still loading. Please wait.");
      return;
    }

    if (!clientSecret) {
      onPaymentError("Payment was not initialized. Please go back and try again.");
      return;
    }

    onPaymentError("");
    setElementError("");
    onPaymentProcessing(true);

    try {
      /*
       * Submits and validates the PaymentElement before confirmation.
       */
      const submitResult = await elements.submit();

      if (submitResult.error) {
        onPaymentError(
          submitResult.error.message || "Please check your payment details."
        );
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,

        /*
         * Card payments normally remain on this page.
         * Payment methods requiring authentication may redirect.
         */
        redirect: "if_required",

        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,

          payment_method_data: {
            billing_details: {
              name: checkoutForm.fullName,
              phone: checkoutForm.phone,

              address: {
                line1: checkoutForm.streetAddress || STORE_PICKUP_ADDRESS,
                line2: checkoutForm.apartment || undefined,
                city: checkoutForm.city || STORE_CITY,
                state: checkoutForm.state || STORE_STATE,
                postal_code: checkoutForm.zipcode || STORE_ZIP,
                country: "US",
              },
            },
          },
        },
      });

      if (error) {
        onPaymentError(error.message || "Payment could not be completed.");
        return;
      }

      if (!paymentIntent) {
        /*
         * This generally means Stripe redirected the customer for
         * authentication. The return page should verify the result.
         */
        return;
      }

      if (paymentIntent.status === "succeeded") {
        await onPaymentSuccess(paymentIntent);
        return;
      }

      if (paymentIntent.status === "processing") {
        onPaymentError(
          "Your payment is processing. Please do not submit another payment."
        );
        return;
      }

      onPaymentError(
        `Payment was not completed. Current status: ${paymentIntent.status}`
      );
    } catch (error) {
      console.error("Stripe payment error:", error);

      onPaymentError(
        error instanceof Error
          ? error.message
          : "An unexpected payment error occurred."
      );
    } finally {
      onPaymentProcessing(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Payment</p>
        <h2>Payment Method</h2>
        <p className="section-note">
          Enter your payment information securely through Stripe.
        </p>
      </div>

      <div className="card-element">
        <PaymentElement
          onReady={() => {
            setPaymentElementReady(true);
            setElementError("");
            onPaymentError("");
          }}
          onLoadError={(event) => {
            setPaymentElementReady(false);

            const message =
              event?.error?.message || "The payment form could not load.";

            setElementError(message);
          }}
          onChange={(event) => {
            if (event.error) {
              setElementError(event.error.message);
            } else {
              setElementError("");
            }
          }}
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                name: "never",
                address: "never",
              },
            },
          }}
        />
      </div>

      {(elementError || paymentError) && (
        <p className="order-message error">
          {elementError || paymentError}
        </p>
      )}

      <div className="checkout-total">
        <span>Order Total</span>
        <strong>${orderTotal.toFixed(2)}</strong>
      </div>

      <button
        type="submit"
        disabled={
          paymentProcessing ||
          !stripe ||
          !elements ||
          !paymentElementReady
        }
      >
        {paymentProcessing
          ? "Processing Payment..."
          : `Pay $${orderTotal.toFixed(2)} & Place Order`}
      </button>

      {!paymentElementReady && !elementError && (
        <p className="order-message">Loading secure payment form…</p>
      )}
    </form>
  );
}

const STRIPE_PROMISE = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const STORE_PICKUP_ADDRESS = "1400 Sierra Spring Dr";
const STORE_CITY = "Bedford";
const STORE_STATE = "Texas";
const STORE_ZIP = "76021";
const DELIVERY_SHIPPING = {
  method: "delivery",
  cost: 8.99,
  label: "Delivery ($8.99)",
};
const PICKUP_SHIPPING = {
  method: "pickup",
  cost: 0,
  label: `Pickup at ${STORE_PICKUP_ADDRESS}`,
};
const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

function CartPage({
  cart,
  total,
  updateQuantity,
  removeFromCart,
  placeOrder,
  clearCart,
  goHome,
}) {
  const [shippingMethod, setShippingMethod] = useState("delivery");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    fullName: "",
    streetAddress: "",
    apartment: "",
    city: "",
    state: "",
    zipcode: "",
    phone: "",
  });
  const [checkoutError, setCheckoutError] = useState("");

  const shippingInfo =
    shippingMethod === "pickup" ? PICKUP_SHIPPING : DELIVERY_SHIPPING;
  const orderTotal = total + shippingInfo.cost;

  function updateCheckoutField(fieldName, value) {
    setCheckoutForm({
      ...checkoutForm,
      [fieldName]: value,
    });
  }

  function validateDeliveryDetails() {
    if (!checkoutForm.fullName.trim()) {
      return "Full name is required.";
    }

    if (!checkoutForm.phone.trim()) {
      return "Contact number is required.";
    }

    if (shippingMethod === "delivery") {
      if (!checkoutForm.streetAddress.trim()) {
        return "Street address is required for delivery.";
      }
      if (!checkoutForm.city.trim()) {
        return "City is required for delivery.";
      }
      if (!checkoutForm.state.trim()) {
        return "State is required for delivery.";
      }
      if (!checkoutForm.zipcode.trim()) {
        return "ZIP code is required for delivery.";
      }
    }

    return "";
  }

  function buildCustomerAddress() {
    if (shippingMethod === "pickup") {
      return {
        fullName: checkoutForm.fullName,
        streetAddress: STORE_PICKUP_ADDRESS,
        apartment: checkoutForm.apartment,
        city: STORE_CITY,
        state: STORE_STATE,
        zipcode: STORE_ZIP,
        phone: checkoutForm.phone,
      };
    }

    return {
      fullName: checkoutForm.fullName,
      streetAddress: checkoutForm.streetAddress,
      apartment: checkoutForm.apartment,
      city: checkoutForm.city,
      state: checkoutForm.state,
      zipcode: checkoutForm.zipcode,
      phone: checkoutForm.phone,
    };
  }

async function startPayment() {
  const validationError = validateDeliveryDetails();

  if (validationError) {
    setCheckoutError(validationError);
    return;
  }

  if (orderTotal <= 0) {
    setCheckoutError("The order total must be greater than zero.");
    return;
  }

  setCheckoutError("");
  setPaymentError("");
  setPaymentProcessing(true);

  try {
    const response = await fetch(`${API_URL}/api/create-payment-intent`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        /*
         * Temporary development structure.
         * For production, send product IDs and quantities and let the
         * backend calculate the amount.
         */
        amount: Math.round(orderTotal * 100),
        currency: "usd",

        customer: {
          fullName: checkoutForm.fullName,
          phone: checkoutForm.phone,
        },

        shippingMethod,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Payment server returned ${response.status}.`
      );
    }

    if (!data.clientSecret) {
      throw new Error("The payment server did not return a client secret.");
    }

    setClientSecret(data.clientSecret);
    setCheckoutStep(2);
  } catch (error) {
    console.error("Payment initialization error:", error);

    setCheckoutError(
      error instanceof Error
        ? error.message
        : "Unable to initialize payment."
    );
  } finally {
    setPaymentProcessing(false);
  }
}
async function submitOrder(paymentIntent) {
  if (orderSubmitted) {
    return;
  }

  setCheckoutError("");

  const order = {
    customer: buildCustomerAddress(),
    items: cart.map((item) => ({ ...item })),
    shipping: shippingInfo,
    subtotal: total,
    total: orderTotal,

    payment: {
      intentId: paymentIntent.id,
      status: paymentIntent.status,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
    },
  };

  try {
    const savedOrder = await placeOrder(order);

    setPlacedOrder(savedOrder);
    setOrderSubmitted(true);
    clearCart();
  } catch (error) {
    console.error("Order save error:", error);

    /*
     * Payment may already have succeeded, so don't tell the customer
     * to pay again.
     */
    setCheckoutError(
      "Payment succeeded, but we could not save the order automatically. " +
        `Payment reference: ${paymentIntent.id}`
    );
  }
 }

  function openCheckout() {
    setIsCheckoutOpen(true);
    setCheckoutStep(1);
    setCheckoutError("");
    setPaymentError("");
    setPaymentProcessing(false);
  }

  function renderShippingFields() {
    if (shippingMethod === "pickup") {
      return (
        <div className="pickup-details">
          <p>
            Pickup address: <strong>{STORE_PICKUP_ADDRESS}</strong>
          </p>
          <p>
            City: {STORE_CITY}, State: {STORE_STATE}, ZIP: {STORE_ZIP}
          </p>
        </div>
      );
    }

    return (
      <>
        <label htmlFor="full-address">Street Address</label>
        <input
          id="full-address"
          required
          placeholder="Street address, P.O. box, company name, c/o"
          value={checkoutForm.streetAddress}
          onChange={(event) =>
            updateCheckoutField("streetAddress", event.target.value)
          }
        />

        <label htmlFor="apartment">Apartment, Suite, Unit</label>
        <input
          id="apartment"
          placeholder="Apartment, suite, unit, building, floor"
          value={checkoutForm.apartment}
          onChange={(event) =>
            updateCheckoutField("apartment", event.target.value)
          }
        />

        <div className="checkout-field-grid">
          <div>
            <label htmlFor="city">City</label>
            <input
              id="city"
              required
              placeholder="City"
              value={checkoutForm.city}
              onChange={(event) =>
                updateCheckoutField("city", event.target.value)
              }
            />
          </div>
          <div>
            <label htmlFor="state">State</label>
            <select
              id="state"
              required
              value={checkoutForm.state}
              onChange={(event) =>
                updateCheckoutField("state", event.target.value)
              }
            >
              <option value="">Select state</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="checkout-field-grid">
          <div>
            <label htmlFor="checkout-zip">ZIP Code</label>
            <input
              id="checkout-zip"
              required
              inputMode="numeric"
              maxLength="5"
              pattern="[0-9]{5}"
              placeholder="ZIP code"
              value={checkoutForm.zipcode}
              onChange={(event) =>
                updateCheckoutField(
                  "zipcode",
                  event.target.value.replace(/\D/g, "")
                )
              }
            />
          </div>
        </div>
      </>
    );
  }

  function renderShippingSummary() {
    return (
      <div className="shipping-summary-card">
        <div className="shipping-summary-header">
          <h3>Pickup or Delivery</h3>
          <p className="shipping-summary-description">
            Choose pickup to collect, or delivery for a flat $9 shipping fee.
          </p>
        </div>

        <label className="shipping-option">
          <input
            type="radio"
            name="shipping-method"
            value="delivery"
            checked={shippingMethod === "delivery"}
            onChange={() => setShippingMethod("delivery")}
          />
          <span>
            Delivery <strong>+$8.99.00</strong>
          </span>
        </label>

        <label className="shipping-option">
          <input
            type="radio"
            name="shipping-method"
            value="pickup"
            checked={shippingMethod === "pickup"}
            onChange={() => setShippingMethod("pickup")}
          />
          <span>Pickup at {STORE_PICKUP_ADDRESS}</span>
        </label>

        {shippingMethod === "pickup" && (
          <p className="shipping-summary-detail">
            Pickup address: {STORE_PICKUP_ADDRESS}, {STORE_CITY}, {STORE_STATE} {STORE_ZIP}
          </p>
        )}
      </div>
    );
  }

  function renderStepContent() {
    if (checkoutStep === 1) {
      return (
        <>
          <div className="checkout-header">
            <p className="eyebrow">Checkout</p>
            <h2>Customer Information</h2>
            <p className="section-note">
              Enter your contact details and delivery preference before payment.
            </p>
          </div>

          <div className="checkout-card">
            <div className="checkout-section">
              <h3>Contact Details</h3>
              <div className="checkout-field-grid">
                <div>
                  <label htmlFor="full-name">Full Name</label>
                  <input
                    id="full-name"
                    required
                    value={checkoutForm.fullName}
                    onChange={(event) =>
                      updateCheckoutField("fullName", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor="phone">Contact Number</label>
                  <input
                    id="phone"
                    required
                    type="tel"
                    placeholder="Phone number"
                    value={checkoutForm.phone}
                    onChange={(event) =>
                      updateCheckoutField("phone", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="checkout-section">
              <h3>Shipping Details</h3>
              <p className="section-note">
                {shippingMethod === "pickup"
                  ? "Pickup selected, no address required."
                  : "Delivery selected, please provide your address."}
              </p>
              {renderShippingFields()}
            </div>
          </div>

          <div className="checkout-total">
            <span>Order Total</span>
            <strong>${orderTotal.toFixed(2)}</strong>
          </div>

          {checkoutError && (
            <p className="order-message error">{checkoutError}</p>
          )}
        <button
          className="payment-button"
          type="button"
          onClick={startPayment}
          disabled={paymentProcessing}
        >
          {paymentProcessing ? "Preparing Payment..." : "Continue to Payment"}
        </button>
        </>
      );
    }

 if (!clientSecret) {
  return (
    <p className="order-message error">
      Payment could not be initialized. Please return to the previous step.
    </p>
  );
 }

 const stripeOptions = {
  clientSecret,

  appearance: {
    theme: "stripe",

    variables: {
      colorPrimary: "#e52629",
      colorText: "#3b1f0f",
      borderRadius: "8px",
      fontSizeBase: "16px",
    },
  },
 };

 return (
  <Elements
    key={clientSecret}
    stripe={STRIPE_PROMISE}
    options={stripeOptions}
  >
    <PaymentStep
      clientSecret={clientSecret}
      checkoutForm={checkoutForm}
      orderTotal={orderTotal}
      onPaymentError={setPaymentError}
      onPaymentProcessing={setPaymentProcessing}
      onPaymentSuccess={submitOrder}
      paymentError={paymentError}
      paymentProcessing={paymentProcessing}
    />
  </Elements>
 );  }

  function openInvoice(order) {
    const invoiceWindow = window.open("", "_blank", "width=900,height=1000");
    if (!invoiceWindow) {
      return;
    }

    invoiceWindow.document.write(buildInvoiceHtml(order));
    invoiceWindow.document.close();
    invoiceWindow.focus();
  }

  function buildInvoiceHtml(order) {
    const itemRows = order.items
      .map(
        (item) =>
          `<div class="item-row"><span>${escapeHtml(item.name)} x ${item.quantity}</span><strong>$${(
            item.price * item.quantity
          ).toFixed(2)}</strong></div>`
      )
      .join("");

    const createdAt = order.createdAt || new Date().toLocaleString();

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice #${order.id || "N/A"}</title>
    <style>
      * { box-sizing: border-box; }
      body { color: #3b1f0f; font-family: Arial, sans-serif; margin: 0; padding: 32px; }
      .invoice { border: 1px solid #f3d2a2; border-radius: 8px; margin: 0 auto; max-width: 720px; padding: 28px; }
      header { align-items: flex-start; border-bottom: 1px solid #f3d2a2; display: flex; justify-content: space-between; padding-bottom: 18px; }
      h1, h2 { color: #8a2f0a; margin: 0; }
      section { border-bottom: 1px solid #f3d2a2; padding: 18px 0; }
      p { line-height: 1.5; margin: 4px 0; }
      .item-row, .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; }
      .grand-total { color: #8a2f0a; font-size: 1.2rem; }
      .invoice-actions { margin-bottom: 20px; display: flex; justify-content: flex-end; }
      button { background: #dc2626; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font-size: 1rem; padding: 10px 15px; }
      @media print { body { padding: 0; } .invoice { border: 0; } button { display: none; } }
    </style>
  </head>
  <body>
    <div class="invoice-actions">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
    <main class="invoice">
      <header>
        <div>
          <h1>Rangila Brooo</h1>
          <p>Invoice</p>
        </div>
        <div>
          <strong>Order #${order.id || "N/A"}</strong>
          <p>${escapeHtml(createdAt)}</p>
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
        ${order.customer.apartment ? `<p>${escapeHtml(order.customer.apartment)}</p>` : ""}
        <p>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.zipcode)}</p>
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

  if (placedOrder) {
    return (
      <section className="page order-confirmation-page">
        <div className="order-confirmation">
          <p className="eyebrow">Order Processed</p>
          <h1>Thank you, {placedOrder.customer.fullName}.</h1>
          <p>
            We received your order.
          </p>
          <div className="checkout-total">
            <span>Order Total</span>
            <strong>${placedOrder.total.toFixed(2)}</strong>
          </div>
          <div className="confirmation-actions">
            <button onClick={() => openInvoice(placedOrder)}>
              View Invoice
            </button>
            <button onClick={goHome}>Continue Shopping</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="section-heading">
        <p className="eyebrow">Your Order</p>
        <h1>Cart</h1>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <h2>Your cart is empty.</h2>
          <p>
            Add some titaura from the home page and your order will appear here.
          </p>
          <button onClick={goHome}>Continue Shopping</button>
        </div>
      ) : (
<div className={`cart-layout${isCheckoutOpen ? " checkout-active" : ""}`}>
  {/* 1. Cart items */}
  {!isCheckoutOpen && (
    <div className="cart-list">
      {cart.map((item) => (
        <article className="cart-item" key={item.id}>
          <div className="cart-item-image-block">
            {item.imageUrl ? (
              <img
                className="cart-item-image"
                src={item.imageUrl}
                alt={item.name}
              />
            ) : null}

            <div>
              <h3>{item.name}</h3>
              <p>${item.price.toFixed(2)} each</p>
            </div>
          </div>

          <div className="quantity-controls">
            <button onClick={() => updateQuantity(item.id, -1)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, 1)}>+</button>
          </div>

          <strong>${(item.price * item.quantity).toFixed(2)}</strong>

          <button
            className="ghost-button"
            onClick={() => removeFromCart(item.id)}
          >
            Remove
          </button>
        </article>
      ))}
    </div>
  )}

  {!isCheckoutOpen && (
    <aside className="order-summary">
      <h2>Order Summary</h2>

      {renderShippingSummary()}

      <div className="summary-row">
        <span>Subtotal</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      <div className="summary-row">
        <span>{shippingInfo.label}</span>
        <strong>${shippingInfo.cost.toFixed(2)}</strong>
      </div>

      <div className="summary-row total-row">
        <span>Total</span>
        <strong>${orderTotal.toFixed(2)}</strong>
      </div>

      <button
        className="checkout-button"
        disabled={orderSubmitted}
        onClick={openCheckout}
      >
        {orderSubmitted ? "Order Processed" : "Checkout"}
      </button>
    </aside>
  )}

  {/* 3. Customer information or payment method */}
  {isCheckoutOpen && (
    <div className="checkout-content">
      {renderStepContent()}
    </div>
  )}
</div>
      )}
    </section>
  );
}
export default CartPage;
