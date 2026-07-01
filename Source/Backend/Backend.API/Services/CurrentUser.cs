using System.Security.Claims;
using Backend.Services.Interfaces;

namespace Backend.Services;

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public int? UserId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? httpContextAccessor.HttpContext?.User.FindFirstValue("sub");

            return int.TryParse(value, out var id) ? id : null;
        }
    }
}
