import { useState } from "react";
import type { FormEvent } from "react";
import type { Book, BookDetail, User } from "../types";
import { api, message } from "../api";
import { useQuery } from "../useQuery";
import { Badge, Loading, Modal, Notice } from "./UI";
export function BookDialog({
  book,
  user,
  onClose,
  onChanged,
  onEdit,
}: {
  book: Book;
  user: User;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const result = useQuery<BookDetail>(`/books/${book.id}`, refresh),
    staff = user.role !== "Student";
  async function mutate(
    path: string,
    method: "post" | "delete",
    body?: unknown,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.request({ url: path, method, data: body });
      setRefresh((n) => n + 1);
      onChanged();
      setSuccess(
        path === "/loans"
          ? "Request sent. Follow its progress in My borrowing."
          : "Your changes have been saved.",
      );
      if (method === "delete" && path === `/books/${book.id}`) onClose();
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const b = result.data;
  return (
    <Modal title="On the shelf" onClose={onClose} busy={busy}>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Notice>{result.error}</Notice>
      ) : (
        b && (
          <>
            <div className="book-detail">
              <span className="eyebrow">
                {b.category} · {b.publishYear || "YEAR UNKNOWN"}
              </span>
              <h3>{b.title}</h3>
              <p>{b.author}</p>
              <Badge value={b.isActive ? "Active" : "Archived"} />
              {b.openLibraryKey && (
                <a
                  className="source-link"
                  href={`https://openlibrary.org${b.openLibraryKey}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source on Open Library ↗
                </a>
              )}
            </div>
            {error && <Notice>{error}</Notice>}
            {success && <Notice kind="success">{success}</Notice>}
            <h4>Physical copies</h4>
            <div className="copy-list">
              {b.copies.length === 0 && (
                <p className="muted">No physical copies have been added yet.</p>
              )}
              {b.copies.map((c) => (
                <div key={c.id}>
                  <div>
                    <strong>{c.accessionNumber}</strong>
                    <small>Shelf {c.shelf}</small>
                  </div>
                  <Badge value={c.available ? "Available" : "Reserved"} />
                  {staff && !c.hasHistory && (
                    <button
                      className="text-button danger-text"
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/books/${b.id}/copies/${c.id}`, "delete")
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {staff ? (
              <>
                <form
                  className="copy-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const values = Object.fromEntries(new FormData(form));
                    void mutate(`/books/${b.id}/copies`, "post", values).then(
                      (saved) => {
                        if (saved) form.reset();
                      },
                    );
                  }}
                >
                  <h4>Add a physical copy</h4>
                  <div className="form-row">
                    <label>
                      Accession number
                      <input
                        name="accessionNumber"
                        required
                        maxLength={40}
                        placeholder="CS-009-01"
                      />
                    </label>
                    <label>
                      Shelf location
                      <input
                        name="shelf"
                        required
                        maxLength={60}
                        placeholder="TEC-01"
                      />
                    </label>
                  </div>
                  <button className="button" disabled={busy}>
                    Add copy
                  </button>
                </form>
                <div className="modal-actions">
                  <button className="button" onClick={onEdit} disabled={busy}>
                    Edit title
                  </button>
                  {user.role === "Admin" && (
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete title
                    </button>
                  )}
                </div>
                {confirmDelete && (
                  <div className="confirm-box">
                    <p>
                      Delete this title and its unused copies? Titles with loan
                      history are protected.
                    </p>
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => void mutate(`/books/${b.id}`, "delete")}
                    >
                      Confirm deletion
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep title
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="modal-actions">
                <p className="muted">
                  Up to 3 active requests or loans. Borrow for 14 days.
                </p>
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    !b.isActive ||
                    !b.copies.some((c) => c.available) ||
                    !!success
                  }
                  onClick={() =>
                    void mutate("/loans", "post", { bookId: b.id })
                  }
                >
                  {busy ? "Sending…" : "Request to borrow"}
                </button>
              </div>
            )}
          </>
        )
      )}
    </Modal>
  );
}
export function BookEditor({
  book,
  onClose,
  onChanged,
}: {
  book: Book | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const body = {
      title: values.title,
      author: values.author,
      category: values.category,
      publishYear: values.publishYear ? Number(values.publishYear) : null,
      isActive: values.isActive === "on",
      version: book?.version || 1,
    };
    try {
      await api.request({
        method: book ? "put" : "post",
        url: book ? `/books/${book.id}` : "/books",
        data: body,
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={book ? "Edit book details" : "Add to the collection"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save}>
        <label>
          Title
          <input
            name="title"
            defaultValue={book?.title}
            required
            minLength={2}
            maxLength={300}
          />
        </label>
        <label>
          Author
          <input
            name="author"
            defaultValue={book?.author}
            required
            minLength={2}
            maxLength={200}
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <input
              name="category"
              defaultValue={book?.category || "General"}
              required
              maxLength={60}
            />
          </label>
          <label>
            Publication year
            <input
              name="publishYear"
              type="number"
              min={1000}
              max={2100}
              defaultValue={book?.publishYear || ""}
            />
          </label>
        </div>
        <label className="checkbox">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={book?.isActive ?? true}
          />
          Active in the student catalog
        </label>
        <p className="field-help">
          You can add physical copies after saving. Archive titles to retain
          their borrowing history.
        </p>
        {error && <Notice>{error}</Notice>}
        <div className="modal-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save book"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
