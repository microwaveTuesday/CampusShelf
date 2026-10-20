using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace CampusShelf.Api.Documentation;

public sealed class EndpointContractFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
        var rules = metadata.OfType<IAuthorizeData>().ToList();
        bool isPublic = metadata.OfType<IAllowAnonymous>().Any() || rules.Count == 0;
        if (isPublic) operation.Security = [];
        else
        {
            var roles = rules.Where(a => !string.IsNullOrWhiteSpace(a.Roles)).Select(a => a.Roles);
            operation.Description = "Requires a current bearer token. " + string.Join("; ", roles.Select(r => "Allowed roles: " + r)) + ". Students can access only their own loans.";
            operation.Responses ??= new OpenApiResponses();
            operation.Responses.TryAdd("401", new OpenApiResponse { Description = "Missing, expired or revoked bearer token." });
            operation.Responses.TryAdd("403", new OpenApiResponse { Description = "The authenticated account does not have permission." });
        }
        var path = context.ApiDescription.RelativePath ?? "";
        string? success = context.ApiDescription.HttpMethod switch
        {
            "DELETE" => "204",
            "PUT" when path.StartsWith("api/books/") => "204",
            "POST" when path == "api/auth/logout" => "204",
            "POST" when path == "api/auth/register" || path == "api/books" || path == "api/books/import" || path.EndsWith("/copies") || path == "api/loans" => "201",
            _ => null
        };
        if (success is not null)
        {
            operation.Responses ??= new OpenApiResponses();
            operation.Responses.Remove("200");
            operation.Responses.TryAdd(success, new OpenApiResponse { Description = success == "201" ? "Created successfully." : "Completed; no response body." });
        }
        if (path == "api/books/external" || path == "api/books/import")
        {
            operation.Responses ??= new OpenApiResponses();
            operation.Responses.TryAdd("503", new OpenApiResponse { Description = "Open Library unavailable; manual catalog and core circulation remain available." });
        }
    }
}
