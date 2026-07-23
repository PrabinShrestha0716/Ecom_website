import { useEffect, useState } from "react";
import bechiImage from "../Explore/Bechi Nunilo.jpg";
import imlyImage from "../Explore/Imly Jhol.jpg";
import khattuImage from "../Explore/khattu.jpg";
import lapsiImage from "../Explore/Lapsi.png";
import logoImage from "../Explore/Logo.png";
import mangoImage from "../Explore/Mango Jhol.jpg";
import momoImage from "../Explore/momo.jpg";
import nibuwaImage from "../Explore/Nibuwa.jpg";
import rangilaImage from "../Explore/Rangila.jpg";
import rangilaJarsImage from "../Explore/Rangila1.png";
import "../styles/AboutPage.css";

const gallery = [
  { src: rangilaImage, title: "Rangila", note: "Bold, spicy and unmistakably Nepali", shape: "tall" },
  { src: momoImage, title: "Momo Pau", note: "A closer look at every sweet and fiery bite", shape: "wide" },
  { src: mangoImage, title: "Mango Jhol", note: "Sweet mango soaked in our signature jhol", shape: "tall" },
  { src: logoImage, title: "Meet Our Yeti", note: "The spirit behind Rangila Brooo", shape: "square" },
  { src: imlyImage, title: "Imly Jhol", note: "Tangy tamarind with a spicy finish", shape: "tall" },
  { src: khattuImage, title: "Khattu", note: "Sour, salty and seriously snackable", shape: "wide" },
  { src: nibuwaImage, title: "Nibuwa Jhol", note: "Bright citrus flavor with a proper kick", shape: "tall" },
  { src: lapsiImage, title: "Lapsi Jhol", note: "A classic taste of home", shape: "tall" },
  { src: bechiImage, title: "Bechi Nunilo", note: "The perfect balance of salty and sour", shape: "tall" },
  { src: rangilaJarsImage, title: "Made to Share", note: "Little jars packed with big flavor", shape: "tall" },
];

function AboutPage({ goShop }) {
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    if (activeImage === null) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setActiveImage(null);
      if (event.key === "ArrowRight") setActiveImage((current) => (current + 1) % gallery.length);
      if (event.key === "ArrowLeft") setActiveImage((current) => (current - 1 + gallery.length) % gallery.length);
    }

    document.body.classList.add("gallery-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("gallery-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImage]);

  return (
    <section className="explore-page">
      <div className="explore-intro">
        <div>
          <p className="eyebrow">Sweet · Sour · Spicy · Nepali</p>
          <h1>Explore the world of <span>Rangila.</span></h1>
        </div>
        <div className="explore-intro-copy">
          <p>
            Take a closer look at the flavors, textures, and little details that
            make every Rangila Brooo snack feel like home.
          </p>
          <button onClick={goShop}>Taste the collection <span aria-hidden="true">→</span></button>
        </div>
      </div>

      <div className="gallery-heading">
        <p>From our kitchen</p>
        <span>Click any photo to explore</span>
      </div>

      <div className="explore-gallery">
        {gallery.map((image, index) => (
          <button
            className={`gallery-card gallery-card--${image.shape}`}
            key={image.title}
            onClick={() => setActiveImage(index)}
            aria-label={`View ${image.title} photo`}
          >
            <img src={image.src} alt={`${image.title} by Rangila Brooo`} loading={index > 2 ? "lazy" : "eager"} />
            <span className="gallery-card-shade" />
            <span className="gallery-card-copy">
              <strong>{image.title}</strong>
              <small>{image.note}</small>
            </span>
            <span className="gallery-card-open" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>

      <div className="explore-story">
        <p className="eyebrow">More than a snack</p>
        <h2>Made with nostalgia.<br />Shared with joy.</h2>
        <p>Every packet carries bold flavor, a little piece of Nepal, and a very happy yeti.</p>
      </div>

      {activeImage !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${gallery[activeImage].title} image viewer`} onClick={() => setActiveImage(null)}>
          <button className="lightbox-close" onClick={() => setActiveImage(null)} aria-label="Close image viewer">×</button>
          <button className="lightbox-arrow lightbox-arrow--left" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage - 1 + gallery.length) % gallery.length); }} aria-label="Previous image">‹</button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={gallery[activeImage].src} alt={`${gallery[activeImage].title} by Rangila Brooo`} />
            <figcaption><strong>{gallery[activeImage].title}</strong><span>{gallery[activeImage].note}</span></figcaption>
          </figure>
          <button className="lightbox-arrow lightbox-arrow--right" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage + 1) % gallery.length); }} aria-label="Next image">›</button>
        </div>
      )}
    </section>
  );
}

export default AboutPage;
