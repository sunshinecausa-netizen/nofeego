const buildings = [
  {
    name: "The Copper",
    location: "Murray Hill · Manhattan",
    detail: "Studios to 3 bedrooms",
    price: "From $4,395",
    image:
      "https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "The Greenpoint",
    location: "Greenpoint · Brooklyn",
    detail: "Studios to 2 bedrooms",
    price: "From $3,850",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Jackson Park",
    location: "Long Island City · Queens",
    detail: "Studios to 3 bedrooms",
    price: "From $3,625",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85",
  },
];

const neighborhoods = [
  {
    name: "Upper West Side",
    borough: "Manhattan",
    description: "Brownstones, culture, and easy park access.",
    image:
      "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Williamsburg",
    borough: "Brooklyn",
    description: "Waterfront living with an independent spirit.",
    image:
      "https://images.unsplash.com/photo-1528988719300-046ff7faf8cb?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Astoria",
    borough: "Queens",
    description: "Great food, generous homes, and quick commutes.",
    image:
      "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Downtown Brooklyn",
    borough: "Brooklyn",
    description: "Connected, energetic, and close to everything.",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=85",
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Manhattan AI home">
          <span className="brand-mark">M</span>
          <span>MANHATTAN AI</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/buildings">Buildings</a>
          <a href="#neighborhoods">Neighborhoods</a>
          <a href="#about">About</a>
        </nav>
        <a className="list-link" href="mailto:hello@manhattan.ai">
          List a property <ArrowIcon />
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">New York City rentals, made clearer</p>
          <h1>Find a home that fits your New York.</h1>
        </div>
        <form className="search-panel" action="/search">
          <label className="search-field">
            <span>Where</span>
            <input
              name="location"
              type="search"
              placeholder="Neighborhood, building, or address"
              aria-label="Search by neighborhood, building, or address"
            />
          </label>
          <label className="search-field compact-field">
            <span>Move-in</span>
            <input name="moveIn" type="text" placeholder="Any date" />
          </label>
          <label className="search-field compact-field">
            <span>Monthly rent</span>
            <input name="rent" type="text" placeholder="Any price" />
          </label>
          <button type="submit">Search homes <span aria-hidden="true">→</span></button>
        </form>
        <div className="hero-meta">
          <span>Verified building information</span>
          <span>Clear availability</span>
          <span>Direct leasing contacts</span>
        </div>
      </section>

      <section className="section" id="featured">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Curated for renters</p>
            <h2>Featured buildings</h2>
          </div>
          <a href="/buildings">View all buildings <ArrowIcon /></a>
        </div>
        <div className="building-grid">
          {buildings.map((building, index) => (
            <article className={`building-card card-${index + 1}`} key={building.name}>
              <a href="#top" aria-label={`Explore ${building.name}`}>
                <div
                  className="building-image"
                  style={{ backgroundImage: `url(${building.image})` }}
                >
                  <span className="card-badge">Featured</span>
                  <span className="card-arrow"><ArrowIcon /></span>
                </div>
                <div className="building-info">
                  <div>
                    <h3>{building.name}</h3>
                    <p>{building.location}</p>
                  </div>
                  <div className="building-price">
                    <strong>{building.price}</strong>
                    <span>{building.detail}</span>
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="neighborhood-section" id="neighborhoods">
        <div className="section-heading light-heading">
          <div>
            <p className="eyebrow">Explore the city</p>
            <h2>Find your neighborhood</h2>
          </div>
          <p className="section-intro">
            New York is a city of distinct rhythms. Start with the one that feels like yours.
          </p>
        </div>
        <div className="neighborhood-grid">
          {neighborhoods.map((neighborhood) => (
            <a className="neighborhood-card" href="#top" key={neighborhood.name}>
              <div
                className="neighborhood-image"
                style={{ backgroundImage: `url(${neighborhood.image})` }}
              />
              <div className="neighborhood-copy">
                <span>{neighborhood.borough}</span>
                <h3>{neighborhood.name}</h3>
                <p>{neighborhood.description}</p>
              </div>
              <span className="neighborhood-arrow"><ArrowIcon /></span>
            </a>
          ))}
        </div>
      </section>

      <footer id="about">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">M</span>
          <span>MANHATTAN AI</span>
        </a>
        <p>A clearer way to rent in New York City.</p>
        <span>© 2026 Manhattan AI</span>
      </footer>
    </main>
  );
}
