using Backend.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Finance;

internal sealed class DebtConfiguration : IEntityTypeConfiguration<Debt>
{
    public void Configure(EntityTypeBuilder<Debt> builder)
    {
        builder.HasKey(d => d.Id);

        builder.Property(d => d.PersonName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(d => d.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(d => d.Note)
            .HasMaxLength(2000);

        // Die Übersicht liest immer alle Einträge eines Nutzers und gruppiert sie nach
        // Person — genau in dieser Reihenfolge liegt der Index.
        builder.HasIndex(d => new { d.UserId, d.PersonName })
            .HasDatabaseName("IX_Debts_User_PersonName");

        // Kein Unique-Constraint auf (Nutzer, Person, Titel): dieselbe Person kann
        // denselben Vorgang zweimal auslösen, und ein Duplikat ist hier kein Fehler.
        builder.HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
