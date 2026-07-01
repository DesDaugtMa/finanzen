using System.Text;
using Backend.Config;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Persistence;
using Backend.Middleware;
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

// --- API ---
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ============================================================

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
