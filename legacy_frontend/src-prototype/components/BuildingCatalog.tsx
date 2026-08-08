"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BUILDINGS_PAGE_SIZE,
  fetchPublicBuildings,
  type BuildingPage,
  type PublicBuilding,
} from "@/lib/buildings";

type BuildingCatalogProps = {
  initialPage: number;
  initialQuery?: string;
  mode: "buildings" | "search";
};

const EMPTY_PAGE: BuildingPage = {
  buildings: [],
  total: 0,
  page: 1,
  pageCount: 1,
};

function BuildingCard({ building }: { building: PublicBuilding }) {
  const location = [building.neighborhood, building.borough].filter(Boolean).join(" · ");
  const details = [
    building.stories ? `${building.stories} stories` : null,
    building.totalUnits ? `${building.totalUnits} residences` : null,
  ].filter(Boolean);

  return (
    <article className="catalog-card">
      <Link href={`/buildings/${building.slug}`} aria-label={`View ${building.name}`}>
        <div
          className={`catalog-card-image${building.heroImageUrl ? " has-image" : ""}`}
          style={building.heroImageUrl ? { backgroundImage: `url(${building.heroImageUrl})` } : undefined}
        >
          {!building.heroImageUrl && (
            <span className="catalog-monogram" aria-hidden="true">
              {building.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="catalog-id">{building.buildingId}</span>
          <span className="catalog-arrow" aria-hidden="true">↗</span>
        </div>
        <div className="catalog-card-copy">
          <div>
            <p className="catalog-location">{location || "New York City"}</p>
            <h2>{building.name}</h2>
            <p>{building.address}, {building.city}, {building.state} {building.zipCode ?? ""}</p>
          </div>
          {details.length > 0 && <span className="catalog-details">{details.join(" · ")}</span>}
        </div>
      </Link>
    </article>
  );
}

export function BuildingCatalog({ initialPage, initialQuery = "", mode }: BuildingCatalogProps) {
  const router = useRouter();
  const [result, setResult] = useState<BuildingPage>(EMPTY_PAGE);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchPublicBuildings({ page: initialPage, search: initialQuery })
      .then((nextResult) => {
        if (active) setResult(nextResult);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load buildings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialPage, initialQuery]);

  function navigate(page: number, search = initialQuery) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (page > 1) params.set("page", String(page));
    const target = mode === "search" ? "/search" : "/buildings";
    router.push(`${target}${params.size ? `?${params}` : ""}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(1, query);
  }

  const firstResult = result.total === 0 ? 0 : (result.page - 1) * BUILDINGS_PAGE_SIZE + 1;
  const lastResult = Math.min(result.page * BUILDINGS_PAGE_SIZE, result.total);

  return (
    <main className="catalog-page">
      <section className="catalog-header">
        <p className="eyebrow">Verified New York buildings</p>
        <div className="catalog-title-row">
          <h1>{mode === "search" ? "Search buildings" : "Buildings"}</h1>
          {!loading && !error && <p>{result.total} verified building{result.total === 1 ? "" : "s"}</p>}
        </div>
        <form className="catalog-search" onSubmit={submitSearch} role="search">
          <label htmlFor="building-search">Building, address, or neighborhood</label>
          <div>
            <input
              id="building-search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, address, or neighborhood"
              type="search"
            />
            <button type="submit">Search <span aria-hidden="true">→</span></button>
          </div>
        </form>
      </section>

      <section className="catalog-results" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="catalog-grid" aria-label="Loading buildings">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="catalog-skeleton" key={index} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="catalog-state" role="alert">
            <span className="state-mark">!</span>
            <h2>We couldn&apos;t load the buildings.</h2>
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}

        {!loading && !error && result.buildings.length === 0 && (
          <div className="catalog-state">
            <span className="state-mark">0</span>
            <h2>No buildings found.</h2>
            <p>Try another building name, address, or neighborhood.</p>
            {initialQuery && <button type="button" onClick={() => navigate(1, "")}>View all buildings</button>}
          </div>
        )}

        {!loading && !error && result.buildings.length > 0 && (
          <>
            <div className="catalog-summary">
              <span>Showing {firstResult}–{lastResult} of {result.total}</span>
              {initialQuery && <span>Results for “{initialQuery}”</span>}
            </div>
            <div className="catalog-grid">
              {result.buildings.map((building) => <BuildingCard building={building} key={building.id} />)}
            </div>
            <nav className="catalog-pagination" aria-label="Buildings pagination">
              <button
                type="button"
                disabled={result.page <= 1}
                onClick={() => navigate(result.page - 1)}
              >
                ← Previous
              </button>
              <span>Page {result.page} of {result.pageCount}</span>
              <button
                type="button"
                disabled={result.page >= result.pageCount}
                onClick={() => navigate(result.page + 1)}
              >
                Next →
              </button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}
