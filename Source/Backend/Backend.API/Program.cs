using Backend.Config;
using Backend.Infrastructure.Persistence;
using Backend.Middleware;
using Microsoft.EntityFrameworkCore;

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

// --- CORS ---
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(appSettings.AllowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

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
app.UseAuthorization();
app.MapControllers();

app.Run();
