using Backend.Models.Changelog;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// Der Changelog der Anwendung — was sich in welcher Version für den Nutzer geändert hat.
/// Die Ressource ist für alle Angemeldeten gleich und hängt an keinem Konto.
/// </summary>
[ApiController]
[Route("api/changelog")]
[Authorize]
public sealed class ChangelogController(IChangelogService changelogService) : ControllerBase
{
    /// <summary>Alle veröffentlichten Versionen, neueste zuerst.</summary>
    [HttpGet]
    public async Task<ActionResult<ChangelogDto>> Get(CancellationToken ct)
        => Ok(await changelogService.GetAsync(ct));
}
