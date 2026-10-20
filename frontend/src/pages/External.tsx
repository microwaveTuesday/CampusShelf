import { useRef, useState } from "react";
import { ArrowUpRight, Search, Globe, Plus } from "lucide-react";
import type { ExternalBook } from "../types";
import { api, message } from "../api";
import { Empty, Loading, Notice } from "../components/UI";
export function External({
  onChanged,
  onManual,
}: {
  onChanged: () => void;
  onManual: () => void;
}) {
  const [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [items, setItems] = useState<ExternalBook[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [searched, setSearched] = useState(false),
    [category, setCategory] = useState("General");
  const locked = useRef(false);
  async function lookup() {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError("");
    setSuccess("");
    setItems([]);
    setSearched(true);
    try {
      const { data } = await api.get<{ items: ExternalBook[] }>(
        "/books/external",
        { params: { query: draft } },
      );
      setItems(data.items);
      setQuery(draft);
    } catch (e) {
      setError(message(e));
    } finally {
      locked.current = false;
      setLoading(false);
    }
  }
  async function importBook(book: ExternalBook) {
    if (busy) return;
    setBusy(book.key);
    setError("");
    setSuccess("");
    try {
      await api.post("/books/import", { query, workKey: book.key, category });
      setSuccess(
        `“${book.title}” is now in your catalog. Add its physical copies from The collection.`,
      );
      setItems((list) => list.filter((b) => b.key !== book.key));
      onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A WORLD OF BOOKS, CONNECTED</span>
          <h1>
            Discover & import<span className="hello-dot">.</span>
          </h1>
          <p>
            Find book details through Open Library, then make them part of your
            collection.
          </p>
        </div>
        <a
          className="text-button"
          href="https://openlibrary.org"
          target="_blank"
          rel="noreferrer"
        >
          Open Library
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="integration-banner">
        <Globe size={27} strokeWidth={1.5} />
        <div>
          <strong>Your catalog stays yours.</strong>
          <p>
            Lookup fills in titles, authors and publication years. Borrowing and
            returns keep working if Open Library is unavailable.
          </p>
        </div>
      </div>
      <form
        className="external-search"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <div className="searchbox">
          <Search size={19} />
          <input
            aria-label="Search Open Library"
            required
            minLength={2}
            maxLength={100}
            placeholder="Try a title, author or subject…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="button primary" disabled={loading || !!busy}>
            {loading ? "Searching…" : "Search Open Library"}
          </button>
        </div>
        <label>
          Import into category
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={60}
            required
          />
        </label>
      </form>
      {error && (
        <Notice>
          {error}{" "}
          <button className="text-button" onClick={onManual}>
            Add a book manually instead
          </button>
        </Notice>
      )}
      {success && <Notice kind="success">{success}</Notice>}
      {loading ? (
        <Loading />
      ) : !items.length ? (
        <Empty
          title={
            searched
              ? "No more results to show"
              : "Every collection starts with curiosity"
          }
        >
          {searched
            ? "Try another title or add the book manually."
            : "Search Open Library to discover books for your campus."}
        </Empty>
      ) : (
        <div className="external-results">
          {items.map((book) => (
            <article key={book.key}>
              <div className="external-icon">
                <Globe size={22} />
              </div>
              <div>
                <h3>{book.title}</h3>
                <p>{book.author}</p>
                <small>
                  {book.publishYear || "Publication year unknown"} · Open
                  Library
                </small>
                <a
                  href={`https://openlibrary.org${book.key}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Review source ↗
                </a>
              </div>
              <button
                className="button"
                disabled={!!busy || !category.trim()}
                onClick={() => void importBook(book)}
              >
                <Plus size={16} />
                {busy === book.key ? "Importing…" : "Import title"}
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="attribution">
        Book metadata provided by{" "}
        <a
          href="https://openlibrary.org/developers/api"
          target="_blank"
          rel="noreferrer"
        >
          Open Library
        </a>
        . Results describe works; verify your physical edition when cataloging.
      </p>
    </>
  );
}
