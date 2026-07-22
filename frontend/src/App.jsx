import { useEffect, useState } from "react";
import "./styles/App.css";
import logoImage from "./assets/logo.png";
import imlyJholImage from "./products/ImlyJhol.png";
import lapsiJholImage from "./products/Lapsi.png";
import lapsiCandyImage from "./products/lapsiCandy.png";
import KhattuImage from "./products/Khattu.png";
import BechiImage from "./products/bechi.PNG";
import MangoJholImage from "./products/mango.PNG";
import NimbuImage from "./products/nimbu.PNG";
import RangilaImage from "./products/Rangila.PNG";
import momoPauImage from "./products/momoPau.png";
import AdminPage from "./pages/AdminPage";
import AboutPage from "./pages/AboutPage";
import CartPage from "./pages/CartPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import LegalPage from "./pages/LegalPage";

const products = [
  {
    id: 1,
    name: "Lapsi Candy",
    price: 6.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: lapsiCandyImage,
  },
  {
    id: 2,
    name: "Khattu",
    price: 6.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: KhattuImage,
  },
  {
    id: 3,
    name: "Bechi Nunilo",
    price: 6.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: BechiImage,
  },
  {
    id: 4,
    name: "Rangila",
    price: 6.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: RangilaImage,
  },

    {
    id: 5,
    name: "Mango Jhol",
    price: 7.99,
    description: "A bold, chewy titaura with sweet, sour, and spicy notes.",
    imageUrl: MangoJholImage,
  },
  {
    id: 6,
    name: "Imly Jhol",
    price: 7.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: imlyJholImage,
  },
  {
    id: 7,
    name: "Nibuwa Jhol",
    price: 7.99,
    description: "A colorful mix made for sharing, gifting, and cravings.",
    imageUrl: NimbuImage,
  },
  {
    id: 8,
    name: "Lapsi Jhol",
    price: 7.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: imlyJholImage,
  },

    {
    id: 9,
    name: "MoMo pau",
    price: 8.99,
    description: "Tangy mango with a warm chili kick for snack lovers.",
    imageUrl: momoPauImage,
  },
      {
    id: 10,
    name: "Donation",
    price: 1.99,
    description: "Donation_test",
    imageUrl: "",
  },


];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function App() {
  const [activePage, setActivePage] = useState("home");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const productsWithInventory = products.map((product) => ({
    ...product,
    stock: inventory[String(product.id)] ?? 0,
  }));

  useEffect(() => {
    loadInventory();
    checkOwnerSession();
  }, []);

  useEffect(() => {
    function openOwnerPageFromHash() {
      if (window.location.hash === "#owner") {
        setActivePage("admin");
      }
    }

    openOwnerPageFromHash();
    window.addEventListener("hashchange", openOwnerPageFromHash);

    return () => {
      window.removeEventListener("hashchange", openOwnerPageFromHash);
    };
  }, []);

  useEffect(() => {
    if (activePage === "admin" && isOwner) {
      loadOrders();
    }
  }, [activePage, isOwner]);

  function addToCart(product) {
    if (product.stock <= 0) return;
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      if (existing.quantity >= product.stock) return;
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
      return;
    }

    setCart([...cart, { ...product, quantity: 1 }]);
  }

  function updateQuantity(productId, change) {
    setCart(
      cart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.min(item.stock, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart(cart.filter((item) => item.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  async function placeOrder(order) {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error("Order could not be saved.");
    }

    const savedOrder = await response.json();
    setOrders((currentOrders) => [savedOrder, ...currentOrders]);
    return savedOrder;
  }

  async function loginOwner(password) {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      return false;
    }

    setIsOwner(true);
    await loadOrders();
    return true;
  }

  async function logoutOwner() {
    await fetch(`${API_URL}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    });
    setIsOwner(false);
    setOrders([]);
    setActivePage("home");
    window.location.hash = "";
  }

  async function checkOwnerSession() {
    const response = await fetch(`${API_URL}/api/admin/session`, {
      credentials: "include",
    });
    setIsOwner(response.ok);
  }

  async function loadOrders() {
    const response = await fetch(`${API_URL}/api/admin/orders`, {
      credentials: "include",
    });

    if (!response.ok) {
      setIsOwner(false);
      setOrders([]);
      return;
    }

    const savedOrders = await response.json();
    setOrders(savedOrders);
  }

  async function loadInventory() {
    const response = await fetch(`${API_URL}/api/inventory`);
    if (!response.ok) return;
    const items = await response.json();
    setInventory(Object.fromEntries(
      items.map((item) => [String(item.productId), item.quantity])
    ));
  }

  async function updateInventory(productId, quantity) {
    const response = await fetch(`${API_URL}/api/admin/inventory/${productId}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    });
    if (!response.ok) throw new Error("Inventory could not be updated.");
    setInventory((current) => ({ ...current, [String(productId)]: quantity }));
  }

  async function deleteOrder(orderId) {
    const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Order could not be deleted.");
    }

    setOrders((currentOrders) =>
      currentOrders.filter((order) => String(order.id) !== String(orderId))
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="app">
      <header className="site-header">
        <button className="brand" onClick={() => setActivePage("home")}>
          <img src={logoImage} alt="Rangila Brooo logo" />
          <span>Rangila Brooo</span>
        </button>

        <nav className="nav">
          {activePage === "admin" ? (
            <button className="active">Admin</button>
          ) : (
            <>
              <button
                className={activePage === "home" ? "active" : ""}
                onClick={() => setActivePage("home")}
              >
                Home
              </button>
              <button
                className={activePage === "cart" ? "active" : ""}
                onClick={() => setActivePage("cart")}
              >
                Cart ({cartCount})
              </button>
              <button
                className={activePage === "about" ? "active" : ""}
                onClick={() => setActivePage("about")}
              >
                Explore
              </button>
              {/* <button
                className={activePage === "contact" ? "active" : ""}
                onClick={() => setActivePage("contact")}
              >
                Contact
              </button> */}
              </>
          )}
        </nav>
      </header>

      <main>
        {activePage === "home" && (
          <HomePage
            products={productsWithInventory}
            cart={cart}
            addToCart={addToCart}
            updateQuantity={updateQuantity}
          />
        )}
        {activePage === "cart" && (
          <CartPage
            cart={cart}
            total={total}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            placeOrder={placeOrder}
            clearCart={clearCart}
            goHome={() => setActivePage("home")}
          />
        )}
        {activePage === "about" && <AboutPage />}
        {activePage === "contact" && <ContactPage />}
        {activePage === "privacy-policy" && <LegalPage pageType="privacy-policy" />}
        {activePage === "terms-of-service" && <LegalPage pageType="terms-of-service" />}
        {activePage === "refund-policy" && <LegalPage pageType="refund-policy" />}
        {activePage === "shipping-policy" && <LegalPage pageType="shipping-policy" />}
        {activePage === "admin" && (
          <AdminPage
            products={productsWithInventory}
            onUpdateInventory={updateInventory}
            orders={orders}
            isOwner={isOwner}
            loginOwner={loginOwner}
            logoutOwner={logoutOwner}
            onDeleteOrder={deleteOrder}
          />
        )}
      </main>

      <footer className="site-footer">
        <div>
          <p className="eyebrow">Follow the flavor</p>
          <h3>Rangila Brooo</h3>
          <p>Bold Nepali snack vibes, crafted for sharing and gifting.</p>
        </div>
        <div className="footer-links">
          <a href="#" onClick={(event) => { event.preventDefault(); setActivePage("privacy-policy"); }}>
            Privacy Policy
          </a>
          <a href="#" onClick={(event) => { event.preventDefault(); setActivePage("terms-of-service"); }}>
            Terms of Service
          </a>
          <a href="#" onClick={(event) => { event.preventDefault(); setActivePage("refund-policy"); }}>
            Refund Policy
          </a>
          <a href="#" onClick={(event) => { event.preventDefault(); setActivePage("shipping-policy"); }}>
            Shipping Policy
          </a>
          <a
            href="https://www.instagram.com/rangila_brooo?igsh=N3A5ZTF6bzllcHA3"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
