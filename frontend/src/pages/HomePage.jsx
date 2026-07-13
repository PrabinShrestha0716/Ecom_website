import packageImage from "../assets/package.png";
import Momopau from "../products/momoPau.png";
import JholPau from "../products/jholpau.png";


import "../styles/HomePage.css";

function HomePage({ products, cart, addToCart, updateQuantity }) {
  const heroImage = products[0]?.imageUrl || Momopau;
  const heroImage2 = products[0]?.imageUrl || JholPau;


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

      <section className="hero">
        <div className="hero-product2">
          <img src={heroImage2} alt="Featured Rangila Brooo product" />
        </div>

        <div>
          <p className="eyebrow">THE RANGILA EXPERIENCE</p>
          <h1>Where nostalgia
meets bold flavor.</h1>
          <p className="hero-copy">
            Rich, handcrafted titaura made for those who appreciate authentic ingredients, unforgettable flavor, and the joy of sharing something truly unique.
          </p>
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
                  src={product.imageUrl || packageImage}
                  alt={product.name}
                />
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                {quantity > 0 && (
                  <p className="cart-note">In cart: {quantity}</p>
                )}
                <div className="card-footer">
                  <strong>${product.price.toFixed(2)}</strong>
                  <div className="home-cart-actions">
                    {quantity > 0 && (
                      <div className="home-quantity-controls">
                        <button onClick={() => addToCart(product)}>+</button>
                        <span>{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, -1)}>-</button>
                      </div>
                    )}
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
