using CampusShelf.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace CampusShelf.Api.Data;

public static class Seeder
{
    public static async Task SeedAsync(LibraryDbContext db, IConfiguration configuration, IPasswordHasher<AppUser> hasher)
    {
        string password = configuration["Seed:Password"] ?? throw new InvalidOperationException("Set Seed__Password to a private password before seeding.");
        if (password.Length is < 10 or > 128 || !password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit)) throw new InvalidOperationException("Seed password must have 10-128 characters, upper/lower case and a digit.");
        await using var tx = await db.Database.BeginTransactionAsync(); await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(749221)");
        foreach (var (name, email, role) in new[] { ("Alex Rivera", "admin@campusshelf.test", "Admin"), ("Sam Reyes", "librarian@campusshelf.test", "Librarian"), ("Jamie Cruz", "student@campusshelf.test", "Student") })
        {
            if (await db.Users.AnyAsync(u => u.Email == email)) continue;
            var user = new AppUser { Name = name, Email = email, Role = role }; user.PasswordHash = hasher.HashPassword(user, password); db.Users.Add(user);
        }
        if (!await db.Books.AnyAsync())
        {
            var books = new[] {
                ("Clean Code", "Robert C. Martin", "Technology", 2008), ("The Pragmatic Programmer", "Andrew Hunt & David Thomas", "Technology", 1999),
                ("Noli Me Tangere", "Jose Rizal", "Literature", 1887), ("The Little Prince", "Antoine de Saint-Exupery", "Literature", 1943),
                ("Atomic Habits", "James Clear", "Personal growth", 2018), ("A Brief History of Time", "Stephen Hawking", "Science", 1988),
                ("The Design of Everyday Things", "Don Norman", "Design", 1988), ("Introduction to Algorithms", "Thomas H. Cormen et al.", "Technology", 1990)
            };
            int index = 0;
            foreach (var (title, author, category, year) in books)
            {
                index++; db.Books.Add(new Book
                {
                    Title = title,
                    Author = author,
                    Category = category,
                    PublishYear = year,
                    Copies = Enumerable.Range(1, 2).Select(n => new BookCopy { AccessionNumber = $"CS-{index:000}-{n:00}", Shelf = $"{category[..3].ToUpperInvariant()}-{index:00}" }).ToList()
                });
            }
        }
        await db.SaveChangesAsync(); await tx.CommitAsync();
    }
}
