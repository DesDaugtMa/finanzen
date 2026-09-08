using Backend.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Finance;

internal sealed class DebtEntryConfiguration : IEntityTypeConfiguration<DebtEntry>
{
    public void Configure(EntityTypeBuilder<DebtEntry> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Amount)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(e => e.EntryDate)
            .IsRequired();

        builder.Property(e => e.Note)
            .HasMaxLength(2000);

        // Die Karte eines Eintrags liest immer alle Positionen und zeigt sie absteigend
        // nach Datum — genau in dieser Reihenfolge liegt der Index.
        builder.HasIndex(e => new { e.DebtId, e.EntryDate })
            .HasDatabaseName("IX_DebtEntries_Debt_EntryDate");

        // Anders als eine Buchung ist eine manuelle Position kein eigenständiger Beleg:
        // ohne ihren Schuldeintrag hat sie keine Bedeutung und verschwindet mit ihm.
        builder.HasOne(e => e.Debt)
            .WithMany(d => d.Entries)
            .HasForeignKey(e => e.DebtId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
