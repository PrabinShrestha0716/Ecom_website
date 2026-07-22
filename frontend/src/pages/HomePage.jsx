import packageImage from "../assets/package.png";
import Momopau from "../products/momoPau.png";


import "../styles/HomePage.css";

function HomePage({ products, cart, addToCart, updateQuantity }) {
  const heroImage = Momopau;


  return (
    <>
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

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Shop</p>
          <h2>Featured Products</h2>
        </div>

        <div className="products">
          {products.map((product) => {
            const cartItem = cart.find((item) => item.id === product.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            const outOfStock = product.stock <= 0;

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
                    <strong>${product.price.toFixed(2)}</strong>
                    {product.stock <= 2 && (
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
                        <button disabled={quantity >= product.stock} onClick={() => addToCart(product)}>+</button>
                        <span>{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, -1)}>-</button>
                      </div>
                    )}
                    <button disabled={outOfStock || quantity >= product.stock} onClick={() => addToCart(product)}>
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
