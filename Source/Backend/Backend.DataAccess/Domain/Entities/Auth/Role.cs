namespace Backend.Domain.Entities.Auth;

public class Role
{
    public int Id { get; set; }
    public required string Name { get; set; }

    public ICollection<User> Users { get; set; } = [];
}
