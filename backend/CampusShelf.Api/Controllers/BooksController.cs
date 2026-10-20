using CampusShelf.Api.Contracts;
using CampusShelf.Api.Data;
using CampusShelf.Api.Domain;
using CampusShelf.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace CampusShelf.Api.Controllers;

[ApiController, Route("api/books"), Authorize]
public sealed class BooksController(LibraryDbContext db, CirculationService circulation, OpenLibraryClient external) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] string? category, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (page < 1 || page > 10000 || search?.Length > 100) throw new ApiException(400, "Invalid search or page.");
        var query = db.Books.AsNoTracking().Where(b => !User.IsInRole("Student") || b.IsActive);
        if (!string.IsNullOrWhiteSpace(search)) { string term = search.Trim().ToLowerInvariant(); query = query.Where(b => b.Title.ToLower().Contains(term) || b.Author.ToLower().Contains(term)); }
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(b => b.Category == category);
        int total = await query.CountAsync(ct);
        var items = await query.OrderBy(b => b.Title).ThenBy(b => b.Id).Skip((page - 1) * 12).Take(12).Select(b => new
        {
            b.Id,
            b.Title,
            b.Author,
            b.Category,
            b.PublishYear,
            b.OpenLibraryKey,
            b.CoverId,
            b.IsActive,
            b.Version,
            TotalCopies = b.Copies.Count,
            AvailableCopies = b.Copies.Count(c => !c.Loans.Any(l => CirculationService.ActiveStates.Contains(l.Status)))
        }).ToListAsync(ct);
        return Ok(new { items, total, page, pageSize = 12 });
    }
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Detail(int id, CancellationToken ct)
    {
        var book = await db.Books.AsNoTracking().Where(b => b.Id == id && (!User.IsInRole("Student") || b.IsActive)).Select(b => new
        {
            b.Id,
            b.Title,
            b.Author,
            b.Category,
            b.PublishYear,
            b.OpenLibraryKey,
            b.CoverId,
            b.IsActive,
            b.Version,
            Copies = b.Copies.OrderBy(c => c.AccessionNumber).Select(c => new { c.Id, c.AccessionNumber, c.Shelf, Available = !c.Loans.Any(l => CirculationService.ActiveStates.Contains(l.Status)), HasHistory = c.Loans.Any() }).ToList()
        }).SingleOrDefaultAsync(ct);
        return book is null ? NotFound() : Ok(book);
    }
    [HttpGet("categories")]
    public async Task<IActionResult> Categories(CancellationToken ct) => Ok(await db.Books.Where(b => b.IsActive).Select(b => b.Category).Distinct().Order().ToListAsync(ct));
    [HttpPost, Authorize(Roles = "Admin,Librarian")]
    public async Task<IActionResult> Create(BookRequest request, CancellationToken ct)
    {
        var book = new Book { Title = request.Title.Trim(), Author = request.Author.Trim(), Category = request.Category.Trim(), PublishYear = request.PublishYear, IsActive = request.IsActive };
        db.Books.Add(book); await db.SaveChangesAsync(ct); return CreatedAtAction(nameof(Detail), new { id = book.Id }, new { book.Id });
    }
    [HttpGet("external"), Authorize(Roles = "Admin,Librarian")]
    public async Task<IActionResult> SearchExternal([FromQuery] string query, CancellationToken ct) => Ok(new { provider = "Open Library", items = await external.SearchAsync(query, ct) });
    [HttpPost("import"), Authorize(Roles = "Admin,Librarian")]
    public async Task<IActionResult> Import(ImportRequest request, CancellationToken ct)
    {
        var result = (await external.SearchAsync(request.Query, ct)).FirstOrDefault(b => b.Key == request.WorkKey) ?? throw new ApiException(400, "Select a book returned by the current lookup.");
        if (await db.Books.AnyAsync(b => b.OpenLibraryKey == result.Key, ct)) throw new ApiException(409, "This Open Library title is already in your catalog.");
        var book = new Book { Title = result.Title, Author = result.Author, PublishYear = result.PublishYear, CoverId = result.CoverId, OpenLibraryKey = result.Key, Category = request.Category.Trim() };
        db.Books.Add(book); await db.SaveChangesAsync(ct); return CreatedAtAction(nameof(Detail), new { id = book.Id }, new { book.Id });
    }
    [HttpPut("{id:int}"), Authorize(Roles = "Admin,Librarian")]
    public async Task<IActionResult> Update(int id, BookRequest request, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct); await circulation.LockAsync(ct);
        var book = await db.Books.FindAsync([id], ct) ?? throw new ApiException(404, "Book not found.");
        if (request.Version != book.Version) throw new ApiException(409, "This book changed. Refresh before saving.");
        book.Title = request.Title.Trim(); book.Author = request.Author.Trim(); book.Category = request.Category.Trim(); book.PublishYear = request.PublishYear; book.IsActive = request.IsActive; book.Version++;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return NoContent();
    }
    [HttpDelete("{id:int}"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct); await circulation.LockAsync(ct);
        var book = await db.Books.Include(b => b.Copies).ThenInclude(c => c.Loans).SingleOrDefaultAsync(b => b.Id == id, ct) ?? throw new ApiException(404, "Book not found.");
        if (book.Copies.Any(c => c.Loans.Count > 0)) throw new ApiException(409, "This title has loan history. Archive it instead.");
        db.Copies.RemoveRange(book.Copies); db.Books.Remove(book); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return NoContent();
    }
    [HttpPost("{id:int}/copies"), Authorize(Roles = "Admin,Librarian")]
    public async Task<IActionResult> AddCopy(int id, CopyRequest request, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct); await circulation.LockAsync(ct);
        if (!await db.Books.AnyAsync(b => b.Id == id, ct)) throw new ApiException(404, "Book not found.");
        var copy = new BookCopy { BookId = id, AccessionNumber = request.AccessionNumber.Trim().ToUpperInvariant(), Shelf = request.Shelf.Trim() };
        db.Copies.Add(copy); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return CreatedAtAction(nameof(Detail), new { id }, new { copy.Id });
    }
    [HttpDelete("{id:int}/copies/{copyId:int}"), Authorize(Roles = "Admin,Librarian")]
    public async Task<IActionResult> DeleteCopy(int id, int copyId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct); await circulation.LockAsync(ct);
        var copy = await db.Copies.SingleOrDefaultAsync(c => c.BookId == id && c.Id == copyId, ct) ?? throw new ApiException(404, "Copy not found.");
        if (await db.Loans.AnyAsync(l => l.BookCopyId == copyId, ct)) throw new ApiException(409, "A copy with loan history cannot be deleted.");
        db.Copies.Remove(copy); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return NoContent();
    }
}
