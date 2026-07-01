using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Backend.Infrastructure.Persistence;

// Wird nur vom EF-Tooling verwendet (dotnet ef migrations add ...).
// Liest die Konfiguration aus appsettings.json, Umgebungsvariablen und
// den User Secrets von Backend.API (UserSecretsId: c8b4a2d1-3e5f-4a7b-9c8d-1e2f3a4b5c6d).
internal sealed class AppDbContextDesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string ApiUserSecretsId = "c8b4a2d1-3e5f-4a7b-9c8d-1e2f3a4b5c6d";

    public AppDbContext CreateDbContext(string[] args)
    {
        var apiProjectDir = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Backend.API"));

        var configuration = new ConfigurationBuilder()
            .SetBasePath(apiProjectDir)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets(ApiUserSecretsId)
            .Build();

        var connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=finanzen_dev;Username=postgres;Password=postgres";

        return new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options);
    }
}
