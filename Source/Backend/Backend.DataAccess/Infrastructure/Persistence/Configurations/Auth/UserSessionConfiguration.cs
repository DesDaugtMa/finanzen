using Backend.Domain.Entities.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations.Auth;

internal sealed class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.SessionKey)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(s => s.UserAgent)
            .HasMaxLength(512);

        builder.Property(s => s.IpAddress)
            .HasMaxLength(45);

        builder.HasIndex(s => s.SessionKey)
            .IsUnique()
            .HasDatabaseName("IX_UserSessions_SessionKey");

        builder.HasOne(s => s.User)
            .WithMany(u => u.Sessions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
