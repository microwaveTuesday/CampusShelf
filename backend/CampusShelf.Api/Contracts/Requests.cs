using System.ComponentModel.DataAnnotations;

namespace CampusShelf.Api.Contracts;

public sealed record RegisterRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 10), RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$", ErrorMessage = "Use upper and lower case letters and a number.")] string Password);
public sealed record LoginRequest([Required, EmailAddress, StringLength(254)] string Email, [Required, StringLength(128)] string Password);
public sealed record BookRequest(
    [Required, StringLength(300, MinimumLength = 2)] string Title,
    [Required, StringLength(200, MinimumLength = 2)] string Author,
    [Required, StringLength(60)] string Category,
    [Range(1000, 2100)] int? PublishYear,
    bool IsActive = true,
    [Range(1, int.MaxValue)] int Version = 1);
public sealed record CopyRequest([Required, StringLength(40)] string AccessionNumber, [Required, StringLength(60)] string Shelf);
public sealed record BorrowRequest([Range(1, int.MaxValue)] int BookId);
public sealed record DecisionRequest([Required, RegularExpression("^(approve|reject|checkout|return|cancel)$")] string Action,
    [Range(1, int.MaxValue)] int Version, [StringLength(300)] string? Note);
public sealed record ImportRequest([Required, StringLength(100, MinimumLength = 2)] string Query,
    [Required, RegularExpression(@"^/works/OL\d+W$")] string WorkKey,
    [Required, StringLength(60)] string Category);
public sealed record AccountRequest([Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, RegularExpression("^(Student|Librarian|Admin)$")] string Role, bool IsActive);
public sealed record UserDto(int Id, string Name, string Email, string Role, bool IsActive);
public sealed record SessionDto(string AccessToken, DateTime ExpiresAt, UserDto User);
public sealed record ExternalBookDto(string Key, string Title, string Author, int? PublishYear, int? CoverId);
