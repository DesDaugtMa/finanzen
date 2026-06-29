using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Backend.Infrastructure.Persistence;

// Wird nur vom EF-Tooling verwendet (dotnet ef migrations add ...).
// Bevorzugte Nutzung: dotnet ef ... --startup-project ../Backend.API
// Dieser Factory dient als Fallback, wenn kein Startup-Projekt angegeben wird.
internal sealed class AppDbContextDesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("AppSettings__ConnectionStrings__Default")
            ?? "Host=localhost;Port=5432;Database=finanzen_dev;Username=postgres;Password=postgres";

        return new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options);
    }
}
