import { ArrowUpRight, BookOpen } from "lucide-react";
import type { Book } from "../types";
export function BookCard({
  book,
  onOpen,
}: {
  book: Book;
  onOpen: (b: Book) => void;
}) {
  const colors = ["moss", "terracotta", "indigo", "sand", "plum", "blue"];
  return (
    <button
      className="book-card"
      onClick={() => onOpen(book)}
      aria-label={`View ${book.title}`}
    >
      <div className={`book-cover ${colors[book.id % colors.length]}`}>
        <div className="cover-rule" />
        <span className="cover-category">{book.category}</span>
        <strong>{book.title}</strong>
        <span className="cover-author">{book.author}</span>
        <BookOpen size={27} strokeWidth={1} className="cover-icon" />
        <div className="cover-line" />
      </div>
      <div className="book-info">
        <div className="book-meta">
          <span>{book.category}</span>
          <ArrowUpRight size={17} />
        </div>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <div className="availability">
          <i className={book.availableCopies ? "green" : "gray"} />
          {!book.isActive
            ? "Archived"
            : book.availableCopies
              ? `${book.availableCopies} of ${book.totalCopies} copies available`
              : "No copies available"}
        </div>
      </div>
    </button>
  );
}
