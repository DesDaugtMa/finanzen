using Backend.Models.Auth;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class SessionsController(
    ISessionService sessionService,
    ICurrentUser currentUser) : ControllerBase
{
    private const string RefreshTokenHeader = "X-Refresh-Token";

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> GetMine(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        var current = Request.Headers.TryGetValue(RefreshTokenHeader, out var value) ? value.ToString() : null;
        return Ok(await sessionService.ListMineAsync(userId.Value, current, ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        var ok = await sessionService.RevokeMineAsync(userId.Value, id, ct);
        return ok ? NoContent() : NotFound(new { message = "Session nicht gefunden." });
    }

    [HttpPost("revoke-others")]
    public async Task<IActionResult> RevokeOthers([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        await sessionService.RevokeAllOthersAsync(userId.Value, request.RefreshToken, ct);
        return NoContent();
    }
}
