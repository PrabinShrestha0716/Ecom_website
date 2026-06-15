import bannerImage from "../assets/banner.png";
import "../styles/AboutPage.css";

function AboutPage() {
  return (
    <section className="page about-page">
      <div className="section-heading">
        <p className="eyebrow">About Me</p>
        <h1>Made for people who miss the taste of home.</h1>
      </div>

      <div className="about-grid">
        <div>
          <p>
            Rangila Brooo is a small snack shop inspired by the bold flavors of
            Nepali titaura: sweet, sour, salty, and spicy all at once.
          </p>
          <p>
            This store is built around simple ingredients, bright flavor, and
            the joy of opening a packet that instantly feels familiar.
          </p>
        </div>
        <div className="about-panel">
          <img src={bannerImage} alt="Rangila Brooo packaging sticker" />
          <h2>What We Care About</h2>
          <ul>
            <li>Fresh, flavorful snacks</li>
            <li>Friendly service</li>
            <li>Products that feel personal and nostalgic</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default AboutPage;
