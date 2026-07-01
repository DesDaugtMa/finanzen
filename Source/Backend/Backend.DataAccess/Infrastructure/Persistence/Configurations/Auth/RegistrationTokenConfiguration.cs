using Backend.Domain.Entities.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Auth;

internal sealed class RegistrationTokenConfiguration : IEntityTypeConfiguration<RegistrationToken>
{
    public void Configure(EntityTypeBuilder<RegistrationToken> builder)
    {
        builder.HasKey(t => t.Token);

        builder.Property(t => t.Token)
            .HasMaxLength(256);

        builder.Property(t => t.Description)
            .HasMaxLength(500);

        builder.HasOne(t => t.CreatedByUser)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.UsedByUser)
            .WithMany()
            .HasForeignKey(t => t.UsedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasData(new RegistrationToken
        {
            Token = "INITIAL_SETUP_TOKEN",
            IsActive = true,
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Description = "Initial admin setup token"
        });
    }
}
