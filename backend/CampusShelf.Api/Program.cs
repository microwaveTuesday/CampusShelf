using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using CampusShelf.Api.Data;
using CampusShelf.Api.Domain;
using CampusShelf.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Microsoft.OpenApi;
using CampusShelf.Api.Documentation;

var builder = WebApplication.CreateBuilder(args);
var key = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32) throw new InvalidOperationException("Set Jwt__Key to a private random secret of at least 32 bytes.");
var connection = builder.Configuration.GetConnectionString("Library") ?? throw new InvalidOperationException("Set ConnectionStrings__Library for PostgreSQL.");
builder.Services.AddDbContext<LibraryDbContext>(o => o.UseNpgsql(connection));
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddScoped<AuthService>(); builder.Services.AddScoped<CirculationService>(); builder.Services.AddMemoryCache();
var providerUrl = builder.Configuration["OpenLibrary:BaseUrl"] ?? "https://openlibrary.org/";
if (!builder.Environment.IsDevelopment() && providerUrl != "https://openlibrary.org/") throw new InvalidOperationException("Production uses the official Open Library provider.");
builder.Services.AddHttpClient<OpenLibraryClient>(http => { http.BaseAddress = new Uri(providerUrl); http.Timeout = TimeSpan.FromSeconds(6); http.DefaultRequestHeaders.UserAgent.ParseAdd("CampusShelf-Educational-Prototype/1.0"); });
builder.Services.AddControllers(); builder.Services.AddProblemDetails(); builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "CampusShelf API", Version = "v1", Description = "Campus library catalog, physical copies and borrowing. PostgreSQL persistence; Student, Librarian and Admin roles." });
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", Description = "Paste the accessToken returned by login. Never publish a live token." });
    o.AddSecurityRequirement(document => new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", document)] = [] });
    o.OperationFilter<EndpointContractFilter>();
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = "CampusShelf",
        ValidAudience = "CampusShelf",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        ClockSkew = TimeSpan.FromSeconds(10)
    };
    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var id = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier); var version = context.Principal?.FindFirstValue("ver");
            var db = context.HttpContext.RequestServices.GetRequiredService<LibraryDbContext>();
            if (!int.TryParse(id, out int uid) || !int.TryParse(version, out int ver) || !await db.Users.AnyAsync(u => u.Id == uid && u.IsActive && u.TokenVersion == ver && u.Role == context.Principal!.FindFirstValue(ClaimTypes.Role), context.HttpContext.RequestAborted)) context.Fail("Session expired.");
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o => { o.RejectionStatusCode = 429; o.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 15, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 })); });
var app = builder.Build();
if (args.Contains("--migrate") || args.Contains("--seed"))
{
    await using var scope = app.Services.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<LibraryDbContext>(); await db.Database.MigrateAsync();
    if (args.Contains("--seed")) await Seeder.SeedAsync(db, app.Configuration, scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>());
    return;
}
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    int status = exception switch
    {
        ApiException e => e.Status,
        DbUpdateConcurrencyException => 409,
        DbUpdateException { InnerException: PostgresException { SqlState: "23505" or "23503" } } => 409,
        DbUpdateException { InnerException: PostgresException { SqlState: "23514" } } => 400,
        _ => 500
    };
    string detail = exception is ApiException known ? known.Message : status == 409 ? "This change conflicts with an existing record. Refresh and try again." : status == 400 ? "The record violates a data constraint." : "Something went wrong. Try again later.";
    if (status == 500) app.Logger.LogError("Request failed ({ExceptionType}), trace {TraceId}", exception?.GetType().Name, context.TraceIdentifier);
    await Results.Problem(statusCode: status, title: status == 503 ? "External service unavailable" : "Request could not be completed", detail: detail, extensions: new Dictionary<string, object?> { ["traceId"] = context.TraceIdentifier }).ExecuteAsync(context);
}));
app.Use(async (context, next) => { context.Response.Headers.CacheControl = "no-store"; context.Response.Headers.XContentTypeOptions = "nosniff"; context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin"; await next(); });
app.UseStatusCodePages(async context => { var response = context.HttpContext.Response; await Results.Problem(statusCode: response.StatusCode, title: response.StatusCode switch { 401 => "Sign in to continue", 403 => "You do not have permission", 404 => "Resource not found", 429 => "Too many attempts. Try again in a minute.", _ => "Request failed" }).ExecuteAsync(context.HttpContext); });
app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.MapControllers();
app.MapGet("/api/health", async (LibraryDbContext db, CancellationToken ct) => await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ok", database = "PostgreSQL" }) : Results.Problem(statusCode: 503)).AllowAnonymous();
app.Run();
public partial class Program { }
