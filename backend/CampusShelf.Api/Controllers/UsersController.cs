using CampusShelf.Api.Contracts;
using CampusShelf.Api.Data;
using CampusShelf.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace CampusShelf.Api.Controllers;

[ApiController, Route("api/users"), Authorize(Roles = "Admin")]
public sealed class UsersController(LibraryDbContext db, CirculationService circulation) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        if (page < 1 || page > 10000 || search?.Length > 100) throw new ApiException(400, "Invalid search or page.");
        var query = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) { string term = search.Trim().ToLowerInvariant(); query = query.Where(u => u.Email.Contains(term) || u.Name.ToLower().Contains(term)); }
        return Ok(new { items = await query.OrderBy(u => u.Id).Skip((page - 1) * 20).Take(20).Select(u => new UserDto(u.Id, u.Name, u.Email, u.Role, u.IsActive)).ToListAsync(ct), total = await query.CountAsync(ct), page, pageSize = 20 });
    }
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, AccountRequest request, CancellationToken ct)
    {
        if (id == CirculationService.Actor(User)) throw new ApiException(409, "You cannot change your own access here.");
        await using var tx = await db.Database.BeginTransactionAsync(ct); await circulation.LockAsync(ct);
        var user = await db.Users.FindAsync([id], ct) ?? throw new ApiException(404, "Account not found.");
        if (await db.Loans.AnyAsync(l => l.BorrowerId == id && CirculationService.ActiveStates.Contains(l.Status), ct) && (request.Role != "Student" || !request.IsActive)) throw new ApiException(409, "Resolve this student's active requests and loans before changing access.");
        user.Name = request.Name.Trim(); user.Role = request.Role; user.IsActive = request.IsActive; user.TokenVersion++;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return Ok(AuthService.UserInfo(user));
    }
}
