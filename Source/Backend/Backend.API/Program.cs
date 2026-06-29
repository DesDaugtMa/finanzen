using Backend.Api.ExceptionHandlers;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Konfigurationshierarchie (automatisch durch ASP.NET Core):
//   1. appsettings.json
//   2. appsettings.{Environment}.json
//   3. Umgebungsvariablen  (z. B. ConnectionStrings__DefaultConnection)
//   4. Kommandozeilenargumente
// Jede Stufe überschreibt die vorherige — kein zusätzlicher Code nötig.

// --- Logging ---
if (builder.Environment.IsProduction())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole();
}

// --- Fehlerbehandlung ---
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();

// --- Datenbank ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' ist nicht konfiguriert. " +
        "Entwicklung: appsettings.Development.json oder 'dotnet user-secrets set ...' " +
        "Produktion: Umgebungsvariable ConnectionStrings__DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);

    if (builder.Environment.IsDevelopment())
        options.EnableDetailedErrors().EnableSensitiveDataLogging();
});

// --- CORS ---
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

// --- API ---
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ============================================================

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseExceptionHandler();
app.UseCors();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
