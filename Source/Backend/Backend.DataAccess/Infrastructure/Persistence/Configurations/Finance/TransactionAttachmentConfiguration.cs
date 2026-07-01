using Backend.Domain.Entities.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Finance;

internal sealed class TransactionAttachmentConfiguration : IEntityTypeConfiguration<TransactionAttachment>
{
    public void Configure(EntityTypeBuilder<TransactionAttachment> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(a => a.ContentType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.StoragePath)
            .IsRequired()
            .HasMaxLength(1000);

        builder.HasOne(a => a.Transaction)
            .WithMany(t => t.Attachments)
            .HasForeignKey(a => a.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
