import { useState } from "react";
import type { User, Loan, Page } from "../types";
import { api, message } from "../api";
import { useQuery } from "../useQuery";
import { Badge, Empty, Loading, Modal, Notice, Pager } from "../components/UI";
import { date } from "../format";
export function Loans({
  user,
  refresh,
  onChanged,
}: {
  user: User;
  refresh: number;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [action, setAction] = useState<{ loan: Loan; action: string } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const result = useQuery<Page<Loan>>(
    `/loans?status=${status}&page=${page}`,
    refresh,
  );
  const student = user.role === "Student";
  async function perform(form: HTMLFormElement) {
    if (!action || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/loans/${action.loan.id}/actions`, {
        action: action.action,
        version: action.loan.version,
        note: new FormData(form).get("note") || null,
      });
      setAction(null);
      onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EVERY BOOK HAS A JOURNEY</span>
          <h1>
            {student ? "My borrowing" : "The circulation desk"}
            <span className="hello-dot">.</span>
          </h1>
          <p>
            {student
              ? "Follow your requests, pickups and returns in one place."
              : "Review requests, check out copies and welcome them back."}
          </p>
        </div>
        <div className="policy-tag">Up to 3 books · 14 days per loan</div>
      </div>
      <div className="status-tabs" role="group" aria-label="Filter loans">
        {[
          "",
          "Requested",
          "Ready",
          "CheckedOut",
          "Overdue",
          "Returned",
          "Rejected",
          "Cancelled",
        ].map((s) => (
          <button
            key={s}
            className={status === s ? "active" : ""}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s === "" ? "All activity" : s === "CheckedOut" ? "Checked out" : s}
          </button>
        ))}
      </div>
      <section className="panel">
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <Notice>{result.error}</Notice>
        ) : !result.data?.items.length ? (
          <Empty title="Nothing on this shelf yet">
            Your borrowing activity will appear here.
          </Empty>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Book & copy</th>
                    {!student && <th>Borrower</th>}
                    <th>Status</th>
                    <th>Requested / due</th>
                    <th>Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((loan) => (
                    <tr key={loan.id}>
                      <td>
                        <strong>{loan.bookTitle}</strong>
                        <small>
                          {loan.accessionNumber} · {loan.shelf}
                        </small>
                        {loan.decisionNote && (
                          <small className="decision-note">
                            {loan.decisionNote}
                          </small>
                        )}
                      </td>
                      {!student && <td>{loan.borrowerName}</td>}
                      <td>
                        <Badge
                          value={loan.isOverdue ? "Overdue" : loan.status}
                        />
                      </td>
                      <td>
                        {date(loan.requestedAt)}
                        <small>Due {date(loan.dueAt)}</small>
                      </td>
                      <td>
                        <div className="row-actions">
                          {!student && loan.status === "Requested" && (
                            <>
                              <button
                                className="button small primary"
                                onClick={() => {
                                  setAction({ loan, action: "approve" });
                                  setError("");
                                }}
                              >
                                Approve
                              </button>
                              <button
                                className="button small"
                                onClick={() => {
                                  setAction({ loan, action: "reject" });
                                  setError("");
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {!student && loan.status === "Ready" && (
                            <button
                              className="button small primary"
                              onClick={() => {
                                setAction({ loan, action: "checkout" });
                                setError("");
                              }}
                            >
                              Check out
                            </button>
                          )}
                          {!student && loan.status === "CheckedOut" && (
                            <button
                              className="button small primary"
                              onClick={() => {
                                setAction({ loan, action: "return" });
                                setError("");
                              }}
                            >
                              Record return
                            </button>
                          )}
                          {["Requested", "Ready"].includes(loan.status) && (
                            <button
                              className="text-button"
                              onClick={() => {
                                setAction({ loan, action: "cancel" });
                                setError("");
                              }}
                            >
                              Cancel
                            </button>
                          )}
                          {student && loan.status === "Ready" && (
                            <small>Collect at library desk</small>
                          )}
                          {student && loan.status === "CheckedOut" && (
                            <small>Return at library desk</small>
                          )}
                          {["Returned", "Rejected", "Cancelled"].includes(
                            loan.status,
                          ) && <span className="muted">Complete</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              total={result.data.total}
              size={20}
              onChange={setPage}
            />
          </>
        )}
      </section>
      {action && (
        <Modal
          title={`${({ approve: "Approve request", reject: "Reject request", checkout: "Check out book", return: "Record return", cancel: "Cancel request" } as Record<string, string>)[action.action]}`}
          busy={busy}
          onClose={() => setAction(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void perform(e.currentTarget);
            }}
          >
            <p>
              <strong>{action.loan.bookTitle}</strong>
              <br />
              <span className="muted">
                {action.loan.borrowerName} · {action.loan.accessionNumber}
              </span>
            </p>
            <p className="muted">
              {action.action === "checkout"
                ? "Confirm the student has collected this copy. It will be due in 14 days."
                : action.action === "return"
                  ? "Confirm the physical copy has been returned. It will become available again."
                  : action.action === "approve"
                    ? "Reserve this copy for collection at the library desk."
                    : "This copy will become available for other students."}
            </p>
            <label>
              {action.action === "reject"
                ? "Reason for rejection"
                : "Note (optional)"}
              <textarea
                name="note"
                maxLength={300}
                required={action.action === "reject"}
                rows={3}
              />
            </label>
            {error && <Notice>{error}</Notice>}
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Keep as is
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
