using CampusShelf.Api.Contracts;
using CampusShelf.Api.Data;
using CampusShelf.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
namespace CampusShelf.Api.Controllers;

[ApiController, Route("api/auth")]
public sealed class AuthController(AuthService auth, LibraryDbContext db) : ControllerBase
{
    [HttpPost("register"), AllowAnonymous, EnableRateLimiting("auth")]
    public async Task<ActionResult<SessionDto>> Register(RegisterRequest request, CancellationToken ct) => StatusCode(201, await auth.RegisterAsync(request, ct));
    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("auth")]
    public async Task<ActionResult<SessionDto>> Login(LoginRequest request, CancellationToken ct) => Ok(await auth.LoginAsync(request, ct));
    [HttpGet("me"), Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct) => AuthService.UserInfo(await db.Users.SingleAsync(u => u.Id == CirculationService.Actor(User), ct));
    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        int id = CirculationService.Actor(User);
        await db.Users.Where(u => u.Id == id).ExecuteUpdateAsync(s => s.SetProperty(u => u.TokenVersion, u => u.TokenVersion + 1), ct);
        return NoContent();
    }
}
