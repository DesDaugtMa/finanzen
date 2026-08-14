using Backend.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Finance;

internal sealed class FixedCostConfiguration : IEntityTypeConfiguration<FixedCost>
{
    public void Configure(EntityTypeBuilder<FixedCost> builder)
    {
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.Amount)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(f => f.Note)
            .HasMaxLength(2000);

        // Der Name ist je Konto und Monat eindeutig. Darauf setzt die Übernahme aus
        // einem anderen Monat auf: namensgleiche Posten werden übersprungen, statt
        // den Monat mit Dubletten zu füllen.
        builder.HasIndex(f => new { f.AccountId, f.Month, f.Name })
            .IsUnique()
            .HasDatabaseName("IX_FixedCosts_Account_Month_Name");

        builder.HasIndex(f => new { f.AccountId, f.Month })
            .HasDatabaseName("IX_FixedCosts_Account_Month");

        builder.HasOne(f => f.Account)
            .WithMany(a => a.FixedCosts)
            .HasForeignKey(f => f.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(f => f.Category)
            .WithMany(c => c.FixedCosts)
            .HasForeignKey(f => f.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
