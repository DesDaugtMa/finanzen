using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Monatsbudgets der Kategorien eines Kontos. Jeder Endpunkt gilt für genau einen Monat.</summary>
[ApiController]
[Route("api/bankaccounts/{accountId:int}/budgets")]
[Authorize]
public sealed class BudgetsController(
    IBudgetService budgetService,
    ICurrentUser currentUser) : FinanceControllerBase(currentUser)
{
    /// <param name="month">Monat im Format <c>yyyy-MM</c>, z. B. <c>2026-07</c>.</param>
    [HttpGet]
    public async Task<ActionResult<BudgetMonthDto>> GetMonth(int accountId, [FromQuery] string month, CancellationToken ct)
        => Ok(await budgetService.GetMonthAsync(UserId, accountId, ParseMonth(month), ct));

    /// <summary>Setzt das Budget einer Kategorie; ein leerer Betrag entfernt es wieder.</summary>
    [HttpPut("{categoryId:int}")]
    public async Task<ActionResult<BudgetMonthDto>> Set(
        int accountId, int categoryId, [FromQuery] string month, [FromBody] SetBudgetRequest request, CancellationToken ct)
        => Ok(await budgetService.SetAsync(UserId, accountId, categoryId, ParseMonth(month), request, ct));

    /// <summary>Übernimmt die Budgets des Vormonats für alle Kategorien ohne eigenes Budget.</summary>
    [HttpPost("apply-suggestions")]
    public async Task<ActionResult<BudgetMonthDto>> ApplySuggestions(int accountId, [FromQuery] string month, CancellationToken ct)
        => Ok(await budgetService.ApplySuggestionsAsync(UserId, accountId, ParseMonth(month), ct));
}
