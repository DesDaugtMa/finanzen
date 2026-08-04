using System.Text;
using System.Text.Json.Serialization;
using Backend.Config;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Persistence;
using Backend.Middleware;
using Backend.OpenApi;
using Backend.Services;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Logging ---
if (builder.Environment.IsProduction())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole();
}

// --- Konfiguration ---
var appSettings = builder.Configuration.GetSection("AppSettings").Get<AppSettings>() ?? new();
builder.Services.AddSingleton(appSettings);

// --- Datenbank ---
if (string.IsNullOrEmpty(appSettings.ConnectionStrings.Default))
    throw new InvalidOperationException(
        "Connection string ist nicht konfiguriert. " +
        "Entwicklung: appsettings.Development.json oder 'dotnet user-secrets set ...' " +
        "Produktion: Umgebungsvariable AppSettings__ConnectionStrings__Default");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(appSettings.ConnectionStrings.Default);

    if (builder.Environment.IsDevelopment())
        options.EnableDetailedErrors().EnableSensitiveDataLogging();
});

// --- Authentifizierung / JWT ---
if (string.IsNullOrEmpty(appSettings.Jwt.Secret))
    throw new InvalidOperationException(
        "JWT-Secret ist nicht konfiguriert. Setze 'AppSettings:Jwt:Secret' via user-secrets (Dev) " +
        "oder Umgebungsvariable AppSettings__Jwt__Secret (Prod).");

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appSettings.Jwt.Secret));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = appSettings.Jwt.Issuer,
        ValidAudience = appSettings.Jwt.Audience,
        IssuerSigningKey = signingKey,
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});

builder.Services.AddAuthorization();

// --- CORS ---
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(appSettings.AllowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

// --- DI: Auth-/Account-Dienste ---
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IRegistrationTokenService, RegistrationTokenService>();
builder.Services.AddScoped<ISessionService, SessionService>();

// --- DI: Finanz-Dienste ---
builder.Services.AddScoped<IAccountAccess, AccountAccess>();
builder.Services.AddScoped<IBankAccountService, BankAccountService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IBudgetService, BudgetService>();
builder.Services.AddScoped<IFixedCostService, FixedCostService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IMonthSummaryService, MonthSummaryService>();

// --- API ---
builder.Services.AddControllers()
    // Enums als Klartext ("Income" statt 1) — die API bleibt lesbar und das Frontend
    // arbeitet mit sprechenden String-Union-Typen statt magischer Zahlen.
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddOpenApi(options =>
{
    // Fügt das JWT-Bearer-Scheme ins Dokument ein → „Authorize“-Button in der Swagger-UI.
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

// ============================================================

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // OpenAPI-Dokument unter /openapi/v1.json …
    app.MapOpenApi();

    // … und darauf aufsetzend die Swagger-UI unter /swagger.
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Finanzen API v1");
        options.DocumentTitle = "Finanzen API – Swagger";
        // Token bleibt über Seiten-Reloads hinweg im Browser gespeichert.
        options.EnablePersistAuthorization();
    });
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
