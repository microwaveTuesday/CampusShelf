using CampusShelf.Api.Contracts;
using CampusShelf.Api.Services;
using CampusShelf.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace CampusShelf.Api.Controllers;

[ApiController, Route("api/loans"), Authorize]
public sealed class LoansController(LibraryDbContext db, CirculationService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (page < 1 || page > 10000) throw new ApiException(400, "Invalid page.");
        var query = service.Visible(User);
        if (status == "Overdue") query = query.Where(l => l.Status == "CheckedOut" && l.DueAt < DateTime.UtcNow);
        else if (!string.IsNullOrWhiteSpace(status)) query = query.Where(l => l.Status == status);
        int total = await query.CountAsync(ct);
        var rows = await query.Include(l => l.BookCopy).ThenInclude(c => c.Book).Include(l => l.Borrower).OrderByDescending(l => l.RequestedAt).ThenByDescending(l => l.Id).Skip((page - 1) * 20).Take(20).ToListAsync(ct);
        return Ok(new { items = rows.Select(CirculationService.Describe), total, page, pageSize = 20 });
    }
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Detail(int id, CancellationToken ct)
    {
        var loan = await service.Visible(User).Include(l => l.BookCopy).ThenInclude(c => c.Book).Include(l => l.Borrower).SingleOrDefaultAsync(l => l.Id == id, ct);
        return loan is null ? NotFound() : Ok(CirculationService.Describe(loan));
    }
    [HttpPost, Authorize(Roles = "Student")]
    public async Task<IActionResult> CreateRequest(BorrowRequest request, CancellationToken ct)
    {
        var loan = await service.RequestAsync(request.BookId, CirculationService.Actor(User), ct);
        return CreatedAtAction(nameof(Detail), new { id = loan.Id }, CirculationService.Describe(loan));
    }
    [HttpPost("{id:int}/actions")]
    public async Task<IActionResult> Transition(int id, DecisionRequest request, CancellationToken ct) => Ok(CirculationService.Describe(await service.TransitionAsync(id, request, User, ct)));
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var query = service.Visible(User);
        return Ok(new
        {
            Titles = await db.Books.CountAsync(b => b.IsActive, ct),
            AvailableCopies = await db.Copies.CountAsync(c => c.Book.IsActive && !c.Loans.Any(l => CirculationService.ActiveStates.Contains(l.Status)), ct),
            Pending = await query.CountAsync(l => l.Status == "Requested", ct),
            Ready = await query.CountAsync(l => l.Status == "Ready", ct),
            CheckedOut = await query.CountAsync(l => l.Status == "CheckedOut", ct),
            Overdue = await query.CountAsync(l => l.Status == "CheckedOut" && l.DueAt < DateTime.UtcNow, ct)
        });
    }
}
