using CampusShelf.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CampusShelf.Api.Data;

public sealed class LibraryDbContext(DbContextOptions<LibraryDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookCopy> Copies => Set<BookCopy>();
    public DbSet<Loan> Loans => Set<Loan>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<AppUser>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Role).HasMaxLength(20);
            e.ToTable(t => t.HasCheckConstraint("CK_User_Role", "\"Role\" IN ('Student','Librarian','Admin')"));
        });
        model.Entity<Book>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(300);
            e.Property(x => x.Author).HasMaxLength(200);
            e.Property(x => x.Category).HasMaxLength(60);
            e.Property(x => x.OpenLibraryKey).HasMaxLength(80);
            e.HasIndex(x => x.OpenLibraryKey).IsUnique();
            e.Property(x => x.Version).IsConcurrencyToken();
            e.ToTable(t => t.HasCheckConstraint("CK_Book_Year", "\"PublishYear\" IS NULL OR \"PublishYear\" BETWEEN 1000 AND 2100"));
        });
        model.Entity<BookCopy>(e =>
        {
            e.Property(x => x.AccessionNumber).HasMaxLength(40);
            e.Property(x => x.Shelf).HasMaxLength(60);
            e.HasIndex(x => x.AccessionNumber).IsUnique();
            e.HasOne(x => x.Book).WithMany(x => x.Copies).HasForeignKey(x => x.BookId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<Loan>(e =>
        {
            e.Property(x => x.Status).HasMaxLength(20);
            e.Property(x => x.DecisionNote).HasMaxLength(300);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne(x => x.BookCopy).WithMany(x => x.Loans).HasForeignKey(x => x.BookCopyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Borrower).WithMany().HasForeignKey(x => x.BorrowerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.HandledBy).WithMany().HasForeignKey(x => x.HandledById).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.BookCopyId).IsUnique().HasFilter("\"Status\" IN ('Requested','Ready','CheckedOut')");
            e.HasIndex(x => new { x.BorrowerId, x.Status });
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Loan_Status", "\"Status\" IN ('Requested','Ready','CheckedOut','Returned','Rejected','Cancelled')");
                t.HasCheckConstraint("CK_Loan_Dates", "\"DueAt\" IS NULL OR \"DueAt\" > \"CheckedOutAt\"");
            });
        });
    }
}
