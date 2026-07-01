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

        builder.HasOne(t => t.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.LinkedTransaction)
            .WithMany()
            .HasForeignKey(t => t.LinkedTransactionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(t => t.AccountId)
            .HasDatabaseName("IX_Transactions_AccountId");

        builder.HasIndex(t => t.AccountingMonth)
            .HasDatabaseName("IX_Transactions_AccountingMonth");

        builder.HasQueryFilter(t => t.DeletedAt == null);
    }
}
