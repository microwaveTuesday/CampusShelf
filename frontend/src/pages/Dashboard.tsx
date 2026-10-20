import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Clock3,
  AlertCircle,
} from "lucide-react";
import type { User, Summary, Page, Loan, Book } from "../types";
import { useQuery } from "../useQuery";
import { Badge, Loading, Notice, Empty } from "../components/UI";
import { date } from "../format";
import { useState } from "react";
import { BookCard } from "../components/BookCard";
export function Dashboard({
  user,
  navigate,
  onBook,
  refresh,
}: {
  user: User;
  navigate: (p: string) => void;
  onBook: (b: Book) => void;
  refresh: number;
}) {
  const [today] = useState(() => new Date().toISOString());
  const stats = useQuery<Summary>("/loans/summary", refresh),
    loans = useQuery<Page<Loan>>("/loans", refresh),
    books = useQuery<Page<Book>>("/books", refresh);
  if (stats.loading) return <Loading />;
  if (stats.error) return <Notice>{stats.error}</Notice>;
  const s = stats.data!,
    student = user.role === "Student";
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR LIBRARY, A LITTLE CLOSER</span>
          <h1>
            Hello, {user.name.split(" ")[0]}
            <span className="hello-dot">.</span>
          </h1>
          <p>Here’s what’s happening on your shelves today.</p>
        </div>
        <span className="today">{date(today)}</span>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">MAKE TIME FOR A GOOD BOOK</span>
          <h2>
            Your next great read
            <br />
            is waiting for you.
          </h2>
          <p>Explore the collection and find your next perspective.</p>
          <button className="button light" onClick={() => navigate("catalog")}>
            Explore the catalog
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="book-art" aria-hidden="true">
          <div className="art-circle" />
          <div className="standing-book one">
            THE JOY
            <br />
            OF DISCOVERY<span>CAMPUS COLLECTION</span>
          </div>
          <div className="standing-book two">
            A WORLD
            <br />
            OF IDEAS<span>TURN THE PAGE</span>
          </div>
          <div className="horizontal-book" />
        </div>
      </section>
      <div className="stats">
        {[
          {
            label: student ? "Books on loan" : "Checked out",
            value: s.checkedOut,
            icon: BookOpen,
            note: "14-day borrowing period",
            color: "moss",
          },
          {
            label: "Awaiting approval",
            value: s.pending,
            icon: Clock3,
            note: student ? "Your borrowing requests" : "Requests to review",
            color: "sand",
          },
          {
            label: "Ready for pickup",
            value: s.ready,
            icon: Bookmark,
            note: "Collect at the library desk",
            color: "blue",
          },
          {
            label: "Overdue books",
            value: s.overdue,
            icon: AlertCircle,
            note: "Return to keep borrowing",
            color: "terracotta",
          },
        ].map((x) => (
          <div className="stat" key={x.label}>
            <div>
              <span>{x.label}</span>
              <strong>{x.value}</strong>
              <small>{x.note}</small>
            </div>
            <div className={`stat-icon ${x.color}`}>
              <x.icon size={21} />
            </div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>
              {student ? "Your recent activity" : "Recent borrowing activity"}
            </h2>
            <p>A little overview of your library journey.</p>
          </div>
          <button className="text-button" onClick={() => navigate("loans")}>
            View all
            <ArrowRight size={15} />
          </button>
        </div>
        {loans.error ? (
          <Notice>{loans.error}</Notice>
        ) : !loans.data?.items.length ? (
          <Empty title="Your next chapter starts here">
            Browse the catalog to request your first book.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  {!student && <th>Borrower</th>}
                  <th>Status</th>
                  <th>Due date</th>
                </tr>
              </thead>
              <tbody>
                {loans.data.items.slice(0, 4).map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.bookTitle}</strong>
                      <small>{l.accessionNumber}</small>
                    </td>
                    {!student && <td>{l.borrowerName}</td>}
                    <td>
                      <Badge value={l.isOverdue ? "Overdue" : l.status} />
                    </td>
                    <td>{date(l.dueAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              THERE’S ALWAYS SOMETHING TO DISCOVER
            </span>
            <h2>From our shelves</h2>
          </div>
          <button className="text-button" onClick={() => navigate("catalog")}>
            Browse all {s.titles} titles
            <ArrowRight size={15} />
          </button>
        </div>
        {books.error ? (
          <Notice>{books.error}</Notice>
        ) : (
          <div className="book-grid">
            {books.data?.items.slice(0, 4).map((book) => (
              <BookCard key={book.id} book={book} onOpen={onBook} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
