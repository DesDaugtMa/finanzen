using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Kategorien eines Kontos. Sie gelten monatsübergreifend.</summary>
[ApiController]
[Route("api/bankaccounts/{accountId:int}/categories")]
[Authorize]
public sealed class CategoriesController(
    ICategoryService categoryService,
    ICurrentUser currentUser) : FinanceControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(int accountId, CancellationToken ct)
        => Ok(await categoryService.ListAsync(UserId, accountId, ct));

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(int accountId, [FromBody] SaveCategoryRequest request, CancellationToken ct)
    {
        var created = await categoryService.CreateAsync(UserId, accountId, request, ct);
        return CreatedAtAction(nameof(GetAll), new { accountId }, created);
    }

    [HttpPut("{categoryId:int}")]
    public async Task<ActionResult<CategoryDto>> Update(int accountId, int categoryId, [FromBody] SaveCategoryRequest request, CancellationToken ct)
        => Ok(await categoryService.UpdateAsync(UserId, accountId, categoryId, request, ct));

    [HttpDelete("{categoryId:int}")]
    public async Task<IActionResult> Delete(int accountId, int categoryId, CancellationToken ct)
    {
        await categoryService.DeleteAsync(UserId, accountId, categoryId, ct);
        return NoContent();
    }

    /// <summary>Übernimmt die Kategorien eines anderen Kontos des Nutzers.</summary>
    [HttpPost("copy")]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> Copy(int accountId, [FromBody] CopyCategoriesRequest request, CancellationToken ct)
        => Ok(await categoryService.CopyFromAccountAsync(UserId, accountId, request.SourceAccountId, ct));
}
