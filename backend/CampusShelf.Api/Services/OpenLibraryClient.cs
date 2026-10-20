using System.Text.Json;
using CampusShelf.Api.Contracts;
using Microsoft.Extensions.Caching.Memory;

namespace CampusShelf.Api.Services;

public sealed class OpenLibraryClient(HttpClient http, IMemoryCache cache, ILogger<OpenLibraryClient> logger)
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static DateTime nextRequest = DateTime.MinValue;
    public async Task<IReadOnlyList<ExternalBookDto>> SearchAsync(string query, CancellationToken ct)
    {
        query = query.Trim();
        if (query.Length is < 2 or > 100) throw new ApiException(400, "Enter between 2 and 100 characters.");
        string cacheKey = "openlibrary:" + query.ToLowerInvariant();
        if (cache.TryGetValue(cacheKey, out IReadOnlyList<ExternalBookDto>? found)) return found!;
        await Gate.WaitAsync(ct);
        try
        {
            if (cache.TryGetValue(cacheKey, out found)) return found!;
            var delay = nextRequest - DateTime.UtcNow;
            if (delay > TimeSpan.Zero) await Task.Delay(delay, ct);
            nextRequest = DateTime.UtcNow.AddSeconds(1.1);
            using var response = await http.GetAsync("search.json?q=" + Uri.EscapeDataString(query) + "&fields=key,title,author_name,first_publish_year,cover_i&limit=8", ct);
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var results = new List<ExternalBookDto>();
            foreach (var row in json.RootElement.GetProperty("docs").EnumerateArray())
            {
                string key = row.GetProperty("key").GetString() ?? "";
                string title = row.GetProperty("title").GetString() ?? "";
                if (!System.Text.RegularExpressions.Regex.IsMatch(key, @"^/works/OL\d+W$") || title.Length is < 2 or > 300) continue;
                string author = row.TryGetProperty("author_name", out var authors) ? string.Join(", ", authors.EnumerateArray().Select(a => a.GetString())) : "Unknown author";
                if (author.Length > 200) author = author[..197] + "...";
                int? year = row.TryGetProperty("first_publish_year", out var y) && y.TryGetInt32(out int yr) && yr is >= 1000 and <= 2100 ? yr : null;
                int? cover = row.TryGetProperty("cover_i", out var c) && c.TryGetInt32(out int cv) && cv > 0 ? cv : null;
                results.Add(new(key, title, author, year, cover));
            }
            cache.Set<IReadOnlyList<ExternalBookDto>>(cacheKey, results, TimeSpan.FromMinutes(10));
            return results;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException)
        {
            if (ct.IsCancellationRequested) throw;
            logger.LogWarning("Open Library lookup unavailable ({ExceptionType})", ex.GetType().Name);
            throw new ApiException(503, "Open Library is temporarily unavailable. Your catalog and borrowing still work. Try again later or add the book manually.");
        }
        finally { Gate.Release(); }
    }
}
