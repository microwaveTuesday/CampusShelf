import { useState } from "react";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import type { User, Book, Page } from "../types";
import { useQuery } from "../useQuery";
import { BookCard } from "../components/BookCard";
import { Empty, Loading, Notice, Pager } from "../components/UI";
export function Catalog({
  user,
  refresh,
  onBook,
  onCreate,
}: {
  user: User;
  refresh: number;
  onBook: (b: Book) => void;
  onCreate: () => void;
}) {
  const [draft, setDraft] = useState(""),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1);
  const result = useQuery<Page<Book>>(
    `/books?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&page=${page}`,
    refresh,
  );
  const categories = useQuery<string[]>("/books/categories", refresh);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT PERSPECTIVE</span>
          <h1>
            The collection<span className="hello-dot">.</span>
          </h1>
          <p>Good books for curious minds. Make yourself at home.</p>
        </div>
        {user.role !== "Student" && (
          <button className="button primary" onClick={onCreate}>
            <Plus size={17} />
            Add a book
          </button>
        )}
      </div>
      <div className="catalog-toolbar">
        <form
          className="searchbox"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft);
            setPage(1);
          }}
        >
          <Search size={19} />
          <input
            aria-label="Search catalog"
            placeholder="Search by title or author…"
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="button small" type="submit">
            Search
          </button>
        </form>
        <div className="filter">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Notice>{result.error}</Notice>
      ) : !result.data?.items.length ? (
        <Empty title="No books found">
          Try a different title, author or category.
        </Empty>
      ) : (
        <>
          <div className="results-heading">
            <span>{result.data.total} titles to explore</span>
            <span>Arranged A–Z</span>
          </div>
          <div className="book-grid">
            {result.data.items.map((book) => (
              <BookCard key={book.id} book={book} onOpen={onBook} />
            ))}
          </div>
          <Pager
            page={page}
            total={result.data.total}
            size={12}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}
