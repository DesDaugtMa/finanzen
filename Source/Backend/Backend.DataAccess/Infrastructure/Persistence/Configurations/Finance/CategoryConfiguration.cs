using Backend.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Finance;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Color)
            .HasMaxLength(7);

        builder.Property(c => c.Icon)
            .HasMaxLength(100);

        // Der Name ist nur innerhalb eines Kontos eindeutig; gelöschte Kategorien
        // blockieren den Namen nicht, damit er erneut vergeben werden kann.
        builder.HasIndex(c => new { c.AccountId, c.Name })
            .IsUnique()
            .HasDatabaseName("IX_Categories_AccountId_Name")
            .HasFilter("\"DeletedAt\" IS NULL");

        builder.HasOne(c => c.Account)
            .WithMany(a => a.Categories)
            .HasForeignKey(c => c.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(c => c.DeletedAt == null);
    }
}
