import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "../styles/CartPage.css";
import logoImage from "../assets/logo.png";

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
          formatPaymentError(
            submitResult.error.message || "Please check your payment details."
          )
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
        onPaymentError(formatPaymentError(error.message || "Payment could not be completed."));
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
        formatPaymentError(
          error instanceof Error
            ? error.message
            : "An unexpected payment error occurred."
        )
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
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
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

function formatPaymentError(error) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "Payment could not be completed.";

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("known test card")) {
    return "This payment method can't verified";
  }

  if (normalizedMessage.includes("card was declined")) {
    return "Your card was declined.";
  }

  if (normalizedMessage.includes("payment cannot be processed")) {
    return "Your payment could not be processed right now. Please try again in a moment.";
  }

  return message;
}

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
  const [addressSuggestions, setAddressSuggestions] = useState([]);
useEffect(() => {
  const address = checkoutForm.streetAddress.trim();

  if (address.length < 3) {
    setAddressSuggestions([]);
    return;
  }

  if (!GEOAPIFY_KEY) {
    console.error("Geoapify API key is missing.");
    return;
  }

  const controller = new AbortController();

  const timer = setTimeout(async () => {
    try {
      const params = new URLSearchParams({
        text: address,
        filter: "countrycode:us",
        limit: "5",
        format: "json",
        apiKey: GEOAPIFY_KEY,
      });

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
        {
          signal: controller.signal,
        }
      );

      const data = await response.json();

      console.log("Geoapify response:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || `Geoapify request failed: ${response.status}`
        );
      }

      setAddressSuggestions(data.results || []);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Geoapify autocomplete error:", error);
        setAddressSuggestions([]);
      }
    }
  }, 500);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [checkoutForm.streetAddress]);
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
<div className="address-wrapper">

<input
    id="full-address"
    required
    placeholder="Street address"
    value={checkoutForm.streetAddress}
    autoComplete="off"
    onChange={(e)=>
        updateCheckoutField("streetAddress",e.target.value)
    }
/>

{addressSuggestions.length > 0 && (

<div className="address-dropdown">

{addressSuggestions.map((address)=>(
<div
className="address-item"
key={address.place_id || address.formatted }
onClick={()=>{
    setCheckoutForm({
        ...checkoutForm,

        streetAddress:
            `${address.housenumber ?? ""} ${address.street ?? ""}`,

        city:
            address.city ?? "",

        state:
            address.state ?? "",

        zipcode:
            address.postcode ?? "",
    });

    setAddressSuggestions([]);
}}
>

{address.formatted}

</div>
))}

</div>

)}

</div>
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
            Delivery <strong>+$8.99
              
            </strong>
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
          `<tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const createdAt = new Date(order.createdAt || Date.now()).toLocaleString();

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice #${order.id || "N/A"}</title>
    <style>
      * { box-sizing: border-box; }
      body { background: #f4f4f4; color: #1f1f1f; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px; }
      .invoice-wrapper { margin: 0 auto; max-width: 820px; }
      .invoice { background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.08); overflow: hidden; }
      .invoice-body { padding: 36px 40px; }
      .topbar { align-items: center; display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e8e8e8; padding-bottom: 24px; }
      .brand { display: flex; align-items: center; gap: 14px; }
      .brand img { width: 72px; height: auto; border-radius: 12px; }
      .brand-details { line-height: 1.3; }
      .brand-details strong { display: block; font-size: 1.05rem; color: #1f1f1f; }
      .brand-details span { color: #6b7280; font-size: 0.95rem; }
      .invoice-meta { text-align: right; }
      .invoice-meta strong { display: block; font-size: 1.2rem; color: #111827; }
      .invoice-meta p { margin: 6px 0 0; color: #6b7280; font-size: 0.95rem; }
      .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 28px; }
      .section-card { background: #f9fafb; border-radius: 14px; padding: 20px; }
      .section-card h2 { margin: 0 0 12px; color: #111827; font-size: 1rem; }
      .section-card p { margin: 4px 0; color: #4b5563; font-size: 0.95rem; }
      table { border-collapse: collapse; margin-top: 30px; width: 100%; }
      table thead th { padding: 16px 14px; text-align: left; font-size: 0.95rem; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
      table tbody tr td { padding: 16px 14px; border-bottom: 1px solid #f3f4f6; font-size: 0.95rem; color: #111827; }
      table tbody tr:last-child td { border-bottom: none; }
      .totals { margin-top: 28px; width: 100%; max-width: 360px; margin-left: auto; }
      .totals .total-row { display: flex; justify-content: space-between; padding: 12px 0; color: #374151; }
      .totals .grand-total { font-size: 1.15rem; font-weight: 700; color: #111827; }
      .notes { margin-top: 28px; color: #6b7280; font-size: 0.95rem; line-height: 1.7; }
      .print-button { margin: 18px 0 0; display: inline-flex; padding: 12px 18px; border-radius: 10px; background: #dc2626; color: #fff; border: none; cursor: pointer; font-size: 0.95rem; }
      @media print { body { padding: 0; background: #fff; } .invoice-wrapper { box-shadow: none; } .print-button { display: none; } }
    </style>
  </head>
  <body>
    <div class="invoice-wrapper">
      <main class="invoice">
        <div class="invoice-body">
          <div class="topbar">
            <div class="brand">
              <img src="${logoImage}" alt="Rangila Brooo logo" />
              <div class="brand-details">
                <strong>Rangila Brooo</strong>
                <span>Bedford, Texas</span>
              </div>
            </div>
            <div class="invoice-meta">
              <strong>Invoice</strong>
              <p>Invoice #: ${order.id || "N/A"}</p>
              <p>Date: ${escapeHtml(createdAt)}</p>
            </div>
          </div>

          <div class="section-grid">
            <div class="section-card">
              <h2>Bill To</h2>
              <p>${escapeHtml(order.customer.fullName)}</p>
              <p>${escapeHtml(order.customer.phone)}</p>
              <p>${escapeHtml(order.customer.streetAddress)}</p>
              ${order.customer.apartment ? `<p>${escapeHtml(order.customer.apartment)}</p>` : ""}
              <p>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.zipcode)}</p>
            </div>
            <div class="section-card">
              <h2>Shipping</h2>
              <p>${escapeHtml(order.shipping.label)}</p>
              <p>Method: ${escapeHtml(order.shipping.method)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>$${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Shipping</span>
              <span>$${order.shipping.cost.toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total</span>
              <span>$${order.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="notes">
            <p>Thank you for your purchase! Please keep this invoice for your records.</p>
          </div>

          <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
        </div>
      </main>
    </div>
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
