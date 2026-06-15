import { useState } from "react";
import "../styles/CartPage.css";

const STORE_LOCATION = {
  label: "Bedford, TX 76021",
  lat: 32.844,
  lon: -97.1431,
};

const FREE_DELIVERY_RADIUS_MILES = 7;
const SHIPPING_COST = 9;
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

function getDistanceInMiles(start, end) {
  const earthRadiusMiles = 3958.8;
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const latDifference = toRadians(end.lat - start.lat);
  const lonDifference = toRadians(end.lon - start.lon);

  const haversineValue =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(lonDifference / 2) *
      Math.sin(lonDifference / 2);

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusMiles * centralAngle;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
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
  const [deliveryZipcode, setDeliveryZipcode] = useState("");
  const [shippingInfo, setShippingInfo] = useState(null);
  const [shippingError, setShippingError] = useState("");
  const [isCheckingShipping, setIsCheckingShipping] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
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

  async function calculateShipping(event) {
    event.preventDefault();
    const zipcode = deliveryZipcode.trim();

    if (!/^\d{5}$/.test(zipcode)) {
      setShippingError("Please enter a valid 5-digit ZIP code.");
      setShippingInfo(null);
      return;
    }

    setIsCheckingShipping(true);
    setShippingError("");

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zipcode}`);

      if (!response.ok) {
        setShippingInfo(null);
        setShippingError("We could not find that ZIP code. Please try again.");
        return;
      }

      const result = await response.json();
      const place = result.places[0];
      const customerLocation = {
        lat: Number(place.latitude),
        lon: Number(place.longitude),
      };
      const miles = getDistanceInMiles(STORE_LOCATION, customerLocation);
      const isFreeDelivery = miles <= FREE_DELIVERY_RADIUS_MILES;

      setShippingInfo({
        miles,
        cost: isFreeDelivery ? 0 : SHIPPING_COST,
        label: isFreeDelivery ? "Free home delivery" : "$9.00 shipping",
        zipcode,
        city: place["place name"],
        state: place.state,
      });
    } catch {
      setShippingInfo(null);
      setShippingError("Shipping could not be calculated right now.");
    } finally {
      setIsCheckingShipping(false);
    }
  }

  const shippingCost = shippingInfo ? shippingInfo.cost : 0;
  const orderTotal = total + shippingCost;

  function updateCheckoutField(fieldName, value) {
    setCheckoutForm({
      ...checkoutForm,
      [fieldName]: value,
    });
  }

  async function submitOrder(event) {
    event.preventDefault();
    setCheckoutError("");

    if (orderSubmitted) {
      return;
    }

    if (!shippingInfo) {
      setCheckoutError("Please calculate shipping before placing the order.");
      return;
    }

    if (checkoutForm.zipcode !== shippingInfo.zipcode) {
      setCheckoutError("Shipping ZIP must match the checkout address ZIP.");
      return;
    }

    if (
      checkoutForm.city.trim().toLowerCase() !==
        shippingInfo.city.toLowerCase() ||
      checkoutForm.state !== shippingInfo.state
    ) {
      setCheckoutError("City, state, and ZIP must match the shipping ZIP.");
      return;
    }

    const order = {
      customer: checkoutForm,
      items: cart.map((item) => ({ ...item })),
      shipping: shippingInfo,
      subtotal: total,
      total: orderTotal,
    };

    try {
      const savedOrder = await placeOrder(order);
      clearCart();
      setPlacedOrder(savedOrder);
      setOrderSubmitted(true);
    } catch {
      setCheckoutError("Order could not be saved. Please try again.");
    }
  }

  function openCheckout() {
    setIsCheckoutOpen(true);

    if (!isCheckoutOpen) {
      setOrderSubmitted(false);
    }
  }

  if (placedOrder) {
    return (
      <section className="page order-confirmation-page">
        <div className="order-confirmation">
          <p className="eyebrow">Order Processed</p>
          <h1>Thank you, {placedOrder.customer.fullName}.</h1>
          <p>
            We received your order. We will contact you soon for payment
            verification.
          </p>
          <div className="checkout-total">
            <span>Order Total</span>
            <strong>${placedOrder.total.toFixed(2)}</strong>
          </div>
          <button onClick={goHome}>Continue Shopping</button>
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
        <div className="cart-layout">
          <div className="cart-list">
            {cart.map((item) => (
              <article className="cart-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>${item.price.toFixed(2)} each</p>
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

            {isCheckoutOpen && (
              <form className="checkout-form" onSubmit={submitOrder}>
                <div>
                  <p className="eyebrow">Checkout</p>
                  <h2>Customer Information</h2>
                </div>
                <label htmlFor="full-name">Full Name</label>
                <input
                  id="full-name"
                  required
                  value={checkoutForm.fullName}
                  onChange={(event) =>
                    updateCheckoutField("fullName", event.target.value)
                  }
                />

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

                <div className="checkout-total">
                  <span>Order Total</span>
                  <strong>${orderTotal.toFixed(2)}</strong>
                </div>

                {checkoutError && (
                  <p className="order-message error">{checkoutError}</p>
                )}

                {orderSubmitted && (
                  <div className="order-processed-popup">
                    <h3>Order Processed</h3>
                    <p>
                      We received your order. We will contact you soon for
                      payment verification.
                    </p>
                  </div>
                )}

                <button type="submit" disabled={orderSubmitted}>
                  {orderSubmitted ? "Order Processed" : "Place Order"}
                </button>
              </form>
            )}
          </div>

          <aside className="order-summary">
            <h2>Order Summary</h2>
            <form className="delivery-form" onSubmit={calculateShipping}>
              <label htmlFor="delivery-zipcode">Delivery ZIP Code</label>
              <input
                id="delivery-zipcode"
                inputMode="numeric"
                maxLength="5"
                pattern="[0-9]{5}"
                placeholder="ZIP code"
                value={deliveryZipcode}
                onChange={(event) =>
                  setDeliveryZipcode(event.target.value.replace(/\D/g, ""))
                }
              />
              <button type="submit" disabled={isCheckingShipping}>
                {isCheckingShipping ? "Checking..." : "Calculate Shipping"}
              </button>
              {shippingError && (
                <p className="shipping-message error">{shippingError}</p>
              )}
            </form>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <strong>
                {shippingInfo ? shippingInfo.label : "Enter ZIP"}
              </strong>
            </div>
            <div className="summary-row total-row">
              <span>Total</span>
              <strong>${orderTotal.toFixed(2)}</strong>
            </div>
            <button
              className="checkout-button"
              disabled={!shippingInfo || orderSubmitted}
              onClick={openCheckout}
            >
              {!shippingInfo
                ? "Calculate Shipping First"
                : orderSubmitted
                ? "Order Processed"
                : "Checkout"}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

export default CartPage;
