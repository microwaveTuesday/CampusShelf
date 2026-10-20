namespace CampusShelf.Api.Domain;

public sealed class AppUser
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Student";
    public bool IsActive { get; set; } = true;
    public int TokenVersion { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Author { get; set; } = "";
    public string Category { get; set; } = "General";
    public int? PublishYear { get; set; }
    public string? OpenLibraryKey { get; set; }
    public int? CoverId { get; set; }
    public bool IsActive { get; set; } = true;
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<BookCopy> Copies { get; set; } = [];
}

public sealed class BookCopy
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
    public string AccessionNumber { get; set; } = "";
    public string Shelf { get; set; } = "";
    public List<Loan> Loans { get; set; } = [];
}

public sealed class Loan
{
    public int Id { get; set; }
    public int BookCopyId { get; set; }
    public BookCopy BookCopy { get; set; } = null!;
    public int BorrowerId { get; set; }
    public AppUser Borrower { get; set; } = null!;
    public string Status { get; set; } = "Requested";
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CheckedOutAt { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public string? DecisionNote { get; set; }
    public int? HandledById { get; set; }
    public AppUser? HandledBy { get; set; }
    public int Version { get; set; } = 1;
}
