using Backend.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Finance;

internal sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Amount)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(t => t.Currency)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(t => t.Type)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(t => t.Note)
            .HasMaxLength(2000);

        // Bestandsbuchungen sind allesamt längst abgebucht — der Standardwert macht die
        // Migration für sie zu einem reinen Spaltenzuwachs ohne Datenkorrektur.
        builder.Property(t => t.IsPending)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasOne(t => t.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // Wird eine Fixkosten-Position gelöscht, bleiben ihre Buchungen erhalten und
        // gelten danach wieder als variable Ausgaben.
        builder.HasOne(t => t.FixedCost)
            .WithMany(f => f.Transactions)
            .HasForeignKey(t => t.FixedCostId)
            .OnDelete(DeleteBehavior.SetNull);

        // Wird ein Schuldeintrag gelöscht, bleiben seine Buchungen erhalten — sie sind
        // echte Geldbewegungen und verlieren nur die Zuordnung.
        builder.HasOne(t => t.Debt)
            .WithMany(d => d.Transactions)
            .HasForeignKey(t => t.DebtId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.LinkedTransaction)
            .WithMany()
            .HasForeignKey(t => t.LinkedTransactionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(t => t.AccountId)
            .HasDatabaseName("IX_Transactions_AccountId");

        builder.HasIndex(t => t.AccountingMonth)
            .HasDatabaseName("IX_Transactions_AccountingMonth");

        builder.HasIndex(t => t.FixedCostId)
            .HasDatabaseName("IX_Transactions_FixedCostId");

        builder.HasIndex(t => t.DebtId)
            .HasDatabaseName("IX_Transactions_DebtId");

        // Offene Buchungen sind die Ausnahme; ein Teilindex trägt nur diese wenigen Zeilen
        // und beantwortet trotzdem jede Frage nach dem Kontostand „laut Bank“.
        builder.HasIndex(t => new { t.AccountId, t.IsPending })
            .HasDatabaseName("IX_Transactions_AccountId_IsPending")
            .HasFilter("\"IsPending\"");

        builder.HasQueryFilter(t => t.DeletedAt == null);
    }
}
