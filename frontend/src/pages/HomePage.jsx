import packageImage from "../assets/package.png";
import Momopau from "../products/momoPau.png";


import "../styles/HomePage.css";

function HomePage({ products, cart, addToCart, updateQuantity }) {
  const heroImage = Momopau;


  return (
    <>
      <section className="festival-banner" aria-labelledby="festival-title">
        <div className="festival-garland" aria-hidden="true" />
        <div className="festival-copy">
          <p className="festival-kicker">Rangila Brooo celebrates</p>
          <h2 id="festival-title">Dashain <span>&</span> Tihar</h2>
          <p className="festival-subtitle">Special Offer</p>
          <p>Share the joy. Pass the pau. Celebrate with your favorite Nepali flavors.</p>
          <p className="festival-wishes">Happy Dashain &amp; Tihar <span aria-hidden="true">✦</span> शुभकामना</p>
          <small>Automatically applied to every pack. No code needed.</small>
        </div>
        <div className="festival-art">
          <span className="festival-kite" aria-hidden="true" />
          <span className="festival-kite festival-kite-small" aria-hidden="true" />
          <div className="festival-savings"><span>FESTIVE TREAT</span><strong>UPTO 15% OFF</strong><span>EVERY PAU</span></div>
          <div className="festival-diyas" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </section>
      <section className="hero">
        <div>
          <p className="eyebrow">Authentic Nepali Titaura</p>
          <h1>A bold taste. 
            Crafted to be remembered.</h1>
          <p className="hero-copy">
          Every bite brings together sweet, sour, spicy, and unmistakably Nepali flavors. Handmade in small batches with premium ingredients for people who crave something extraordinary.
          </p>
        </div>
        <div className="hero-product">
          <img src={heroImage} alt="Featured Rangila Brooo product" />
        </div>
      </section>

      <section className="section" id="featured-products">
        <div className="section-heading">
          <p className="eyebrow">Shop</p>
          <h2>Featured Products</h2>
        </div>

        <div className="products">
          {products.map((product) => {
            const cartItem = cart.find((item) => item.id === product.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            const stockIsKnown = product.stock !== null;
            const outOfStock = stockIsKnown && product.stock <= 0;

            return (
              <article className="card" key={product.id}>
                <img
                  className="product-image"
                  src={product.imageUrl || packageImage}
                  alt={product.name}
                />
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                {quantity > 0 && (
                  <p className="cart-note">In cart: {quantity}</p>
                )}
                <div className="card-footer">
                  <div>
                    <div className="offer-price">
                      <del aria-label={`Original price $${product.originalPrice.toFixed(2)}`}>${product.originalPrice.toFixed(2)}</del>
                      <strong aria-label={`Offer price $${product.price.toFixed(2)}`}>${product.price.toFixed(2)}</strong>
                    </div>
                    <span className="offer-saving"></span>
                    {stockIsKnown && product.stock <= 2 && (
                      <p className={outOfStock ? "stock-label out" : "stock-label low"}>
                        {outOfStock
                          ? "Out of stock"
                          : `Only ${product.stock} left`}
                      </p>
                    )}
                  </div>
                  <div className="home-cart-actions">
                    {quantity > 0 && (
                      <div className="home-quantity-controls">
                        <button disabled={stockIsKnown && quantity >= product.stock} onClick={() => addToCart(product)}>+</button>
                        <span>{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, -1)}>-</button>
                      </div>
                    )}
                    <button disabled={outOfStock || (stockIsKnown && quantity >= product.stock)} onClick={() => addToCart(product)}>
                      {outOfStock ? "Out of Stock" : "Add to Cart"}
                    </button>
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
