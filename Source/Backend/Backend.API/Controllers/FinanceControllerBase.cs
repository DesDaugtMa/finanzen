using Backend.Exceptions;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// Gemeinsame Basis der kontogebundenen Finanz-Controller: löst den angemeldeten
/// Nutzer auf und übersetzt den Monatsparameter, damit beides nicht in jeder
/// Action wiederholt wird.
/// </summary>
public abstract class FinanceControllerBase(ICurrentUser currentUser) : ControllerBase
{
    protected int UserId => currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Wandelt den Monatsparameter <c>yyyy-MM</c> um; ungültige Werte werden zu 422.</summary>
    protected static AccountingMonth ParseMonth(string? month) => AccountingMonth.Parse(month);
}
