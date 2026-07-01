using Backend.Models.Auth;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public sealed class RegistrationTokensController(
    IRegistrationTokenService tokenService,
    ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RegistrationTokenDto>>> GetAll(CancellationToken ct)
        => Ok(await tokenService.ListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<RegistrationTokenDto>> Create([FromBody] CreateRegistrationTokenRequest request, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        var created = await tokenService.CreateAsync(request, userId.Value, ct);
        return CreatedAtAction(nameof(GetAll), new { }, created);
    }

    [HttpDelete("{token}")]
    public async Task<IActionResult> Deactivate(string token, CancellationToken ct)
    {
        var ok = await tokenService.DeactivateAsync(token, ct);
        return ok ? NoContent() : NotFound(new { message = "Token nicht gefunden." });
    }
}
