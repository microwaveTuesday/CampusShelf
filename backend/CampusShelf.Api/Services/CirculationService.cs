using System.Security.Claims;
using CampusShelf.Api.Contracts;
using CampusShelf.Api.Data;
using CampusShelf.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CampusShelf.Api.Services;

public sealed class CirculationService(LibraryDbContext db)
{
    public static readonly string[] ActiveStates = ["Requested", "Ready", "CheckedOut"];
    public static int Actor(ClaimsPrincipal user) => int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
    // One transaction-scoped lock coordinates eligibility, copy availability and catalog mutations.
    // Appropriate for a small single-campus system; the DB index is a second invariant guard.
    public Task LockAsync(CancellationToken ct) => db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(749221)", ct);
    public IQueryable<Loan> Visible(ClaimsPrincipal actor) => db.Loans.AsNoTracking()
        .Where(l => !actor.IsInRole("Student") || l.BorrowerId == Actor(actor));
    public static object Describe(Loan l) => new
    {
        l.Id,
        l.BookCopy.BookId,
        BookTitle = l.BookCopy.Book.Title,
        Author = l.BookCopy.Book.Author,
        l.BookCopy.AccessionNumber,
        l.BookCopy.Shelf,
        l.BorrowerId,
        BorrowerName = l.Borrower.Name,
        l.Status,
        l.RequestedAt,
        l.CheckedOutAt,
        l.DueAt,
        l.ReturnedAt,
        l.DecisionNote,
        l.Version,
        IsOverdue = l.Status == "CheckedOut" && l.DueAt < DateTime.UtcNow
    };
    public async Task<Loan> RequestAsync(int bookId, int borrowerId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await LockAsync(ct);
        if (!await db.Users.AnyAsync(u => u.Id == borrowerId && u.IsActive && u.Role == "Student", ct)) throw new ApiException(403, "An active student account is required.");
        var active = db.Loans.Where(l => l.BorrowerId == borrowerId && ActiveStates.Contains(l.Status));
        if (await active.AnyAsync(l => l.Status == "CheckedOut" && l.DueAt < DateTime.UtcNow, ct)) throw new ApiException(409, "Return your overdue book before requesting another.");
        if (await active.CountAsync(ct) >= 3) throw new ApiException(409, "You can have up to three active requests or loans.");
        if (await active.AnyAsync(l => l.BookCopy.BookId == bookId, ct)) throw new ApiException(409, "You already have an active request or loan for this title.");
        var book = await db.Books.FindAsync([bookId], ct);
        if (book is null || !book.IsActive) throw new ApiException(404, "This title is unavailable.");
        var copy = await db.Copies.Include(c => c.Book).OrderBy(c => c.Id)
            .FirstOrDefaultAsync(c => c.BookId == bookId && !c.Loans.Any(l => ActiveStates.Contains(l.Status)), ct);
        if (copy is null) throw new ApiException(409, "All copies are currently reserved or on loan.");
        var loan = new Loan { BookCopy = copy, BorrowerId = borrowerId };
        db.Loans.Add(loan);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        await db.Entry(loan).Reference(l => l.Borrower).LoadAsync(ct);
        return loan;
    }
    public async Task<Loan> TransitionAsync(int id, DecisionRequest request, ClaimsPrincipal actor, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await LockAsync(ct);
        var loan = await db.Loans.Include(l => l.BookCopy).ThenInclude(c => c.Book).Include(l => l.Borrower).SingleOrDefaultAsync(l => l.Id == id, ct);
        if (loan is null || actor.IsInRole("Student") && loan.BorrowerId != Actor(actor)) throw new ApiException(404, "Loan not found.");
        if (actor.IsInRole("Student") && request.Action != "cancel") throw new ApiException(403, "Only library staff can perform this action.");
        if (request.Version != loan.Version) throw new ApiException(409, "This loan changed. Refresh before trying again.");
        string? next = (request.Action, loan.Status) switch
        {
            ("approve", "Requested") => "Ready",
            ("reject", "Requested") => "Rejected",
            ("checkout", "Ready") => "CheckedOut",
            ("return", "CheckedOut") => "Returned",
            ("cancel", "Requested" or "Ready") => "Cancelled",
            _ => null
        };
        if (next is null) throw new ApiException(409, "This action is not allowed for the current loan status.");
        if (request.Action == "reject" && string.IsNullOrWhiteSpace(request.Note)) throw new ApiException(400, "Give a reason for rejecting the request.");
        if (next == "CheckedOut")
        {
            if (!loan.Borrower.IsActive) throw new ApiException(409, "This borrower account is inactive.");
            if (await db.Loans.AnyAsync(l => l.BorrowerId == loan.BorrowerId && l.Status == "CheckedOut" && l.DueAt < DateTime.UtcNow, ct)) throw new ApiException(409, "The borrower has an overdue book.");
            loan.CheckedOutAt = DateTime.UtcNow; loan.DueAt = loan.CheckedOutAt.Value.AddDays(14);
        }
        if (next == "Returned") loan.ReturnedAt = DateTime.UtcNow;
        loan.Status = next; loan.Version++; loan.DecisionNote = request.Note?.Trim(); loan.HandledById = Actor(actor);
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
        return loan;
    }
}
