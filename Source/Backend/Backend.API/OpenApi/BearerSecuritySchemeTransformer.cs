using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Backend.OpenApi;

/// <summary>
/// Trägt ein JWT-Bearer-Security-Scheme in das OpenAPI-Dokument ein und macht es zur
/// globalen Anforderung. Dadurch zeigt die Swagger-UI den „Authorize“-Button an, über den
/// der Access-Token hinterlegt und bei allen Requests als <c>Authorization: Bearer …</c>
/// mitgesendet wird.
/// </summary>
internal sealed class BearerSecuritySchemeTransformer(
    IAuthenticationSchemeProvider authenticationSchemeProvider) : IOpenApiDocumentTransformer
{
    private const string SchemeId = "Bearer";

    public async Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var schemes = await authenticationSchemeProvider.GetAllSchemesAsync();
        if (schemes.All(s => s.Name != JwtBearerScheme))
            return;

        var securityScheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description =
                "JWT-Access-Token. Über POST /api/auth/login abrufen und hier nur den reinen " +
                "Token einfügen (ohne den Präfix \"Bearer\").",
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[SchemeId] = securityScheme;

        document.Security ??= [];
        document.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(SchemeId, document)] = [],
        });
    }

    // Muss zum Namen des in Program.cs registrierten JWT-Schemas passen.
    private const string JwtBearerScheme = "Bearer";
}
