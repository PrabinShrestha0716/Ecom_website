import packageImage from "../assets/package.png";
import "../styles/HomePage.css";

function HomePage({ products, cart, addToCart, updateQuantity }) {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Authentic Nepali Titaura</p>
          <h1>Sweet, sour, spicy snacks with real personality.</h1>
          <p className="hero-copy">
            Shop bright, flavorful titaura made for cravings, care packages,
            and sharing with people who understand bold taste.
          </p>
        </div>
        <div className="hero-product">
          <img src={packageImage} alt="Rangila Brooo titaura package" />
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Shop</p>
          <h2>Featured Products</h2>
        </div>

        <div className="products">
          {products.map((product) => {
            const cartItem = cart.find((item) => item.id === product.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            return (
              <article className="card" key={product.id}>
                <img
                  className="product-image"
                  src={packageImage}
                  alt={`${product.name} package`}
                />
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                {quantity > 0 && (
                  <p className="cart-note">In cart: {quantity}</p>
                )}
                <div className="card-footer">
                  <strong>${product.price.toFixed(2)}</strong>
                  <div className="home-cart-actions">
                    <div className="home-quantity-controls">
                      <button onClick={() => addToCart(product)}>+</button>
                      <span>{quantity}</span>
                      <button
                        disabled={quantity === 0}
                        onClick={() => updateQuantity(product.id, -1)}
                      >
                        -
                      </button>
                    </div>
                    <button onClick={() => addToCart(product)}>Add to Cart</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default HomePage;
