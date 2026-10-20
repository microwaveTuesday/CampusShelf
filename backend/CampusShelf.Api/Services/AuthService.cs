using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CampusShelf.Api.Contracts;
using CampusShelf.Api.Data;
using CampusShelf.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CampusShelf.Api.Services;

public sealed class AuthService(LibraryDbContext db, IPasswordHasher<AppUser> hasher, IConfiguration config)
{
    // A real hash is checked for unknown accounts too, reducing username timing differences.
    private static readonly string DummyHash = new PasswordHasher<AppUser>().HashPassword(new AppUser(), Guid.NewGuid().ToString());
    public static UserDto UserInfo(AppUser u) => new(u.Id, u.Name, u.Email, u.Role, u.IsActive);
    public async Task<SessionDto> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        string email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email, ct)) throw new ApiException(409, "An account with that email already exists.");
        var user = new AppUser { Name = request.Name.Trim(), Email = email, Role = "Student" };
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return Issue(user);
    }
    public async Task<SessionDto> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        string email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email, ct);
        var result = hasher.VerifyHashedPassword(user ?? new AppUser(), user?.PasswordHash ?? DummyHash, request.Password);
        if (user is null || !user.IsActive || result == PasswordVerificationResult.Failed) throw new ApiException(401, "Email or password is incorrect.");
        if (result == PasswordVerificationResult.SuccessRehashNeeded) { user.PasswordHash = hasher.HashPassword(user, request.Password); await db.SaveChangesAsync(ct); }
        return Issue(user);
    }
    private SessionDto Issue(AppUser user)
    {
        var expires = DateTime.UtcNow.AddMinutes(30);
        Claim[] claims = [new(ClaimTypes.NameIdentifier, user.Id.ToString()), new(ClaimTypes.Role, user.Role), new("ver", user.TokenVersion.ToString()), new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())];
        var token = new JwtSecurityToken("CampusShelf", "CampusShelf", claims, expires: expires,
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)), SecurityAlgorithms.HmacSha256));
        return new(new JwtSecurityTokenHandler().WriteToken(token), expires, UserInfo(user));
    }
}
