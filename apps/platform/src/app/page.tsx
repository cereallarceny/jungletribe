export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header wrap">
        <a className="wordmark" href="/" aria-label="Jungle Tribe home">
          <span aria-hidden="true" className="brand-mark">
            jt.
          </span>
          Jungle Tribe
        </a>
        <nav aria-label="Main navigation">
          <a href="#collections">Your plants</a>
          <a href="#care">Plant care</a>
        </nav>
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">For the love of growing things</p>
            <h1 id="hero-title">
              A little jungle.
              <br />A little peace of mind.
            </h1>
            <p className="lede">
              A home for every plant you love, and a community to help care for
              them when life takes you elsewhere.
            </p>
            <a className="button" href="#collections">
              Meet Jungle Tribe <span aria-hidden="true">↗</span>
            </a>
            <p className="launch-note">
              <span className="status-dot" aria-hidden="true" /> Taking root in
              Nashville. Coming soon.
            </p>
          </div>
          <div className="garden" aria-hidden="true">
            <div className="garden-sun" />
            <div className="garden-stem" />
            <div className="garden-leaf leaf-one" />
            <div className="garden-leaf leaf-two" />
            <div className="garden-leaf leaf-three" />
            <div className="garden-leaf leaf-four" />
            <div className="garden-pot" />
            <span className="garden-caption">Good things take root.</span>
          </div>
        </section>
        <section className="features wrap" aria-label="What we are growing">
          <article id="collections" className="feature">
            <p className="eyebrow">01 / Your plants</p>
            <h2>Every leaf has a story.</h2>
            <p>
              We’re building a free place to keep your collections, care notes,
              and photos together. From your first pothos to your prized
              anthurium.
            </p>
            <p className="feature-note">
              Unlimited plants. Private by default.
            </p>
          </article>
          <article id="care" className="feature">
            <p className="eyebrow">02 / Your community</p>
            <h2>
              Away from home.
              <br />
              Still in good hands.
            </h2>
            <p>
              Our plant-care marketplace is in the works, starting with a
              community in Nashville. Find care for your plants without having
              to catalog them first.
            </p>
            <p className="feature-note">Bookings are not available yet.</p>
          </article>
        </section>
      </main>
      <footer className="site-footer wrap">
        <span>Jungle Tribe</span>
        <span>For plant people, by plant people.</span>
      </footer>
    </>
  );
}
