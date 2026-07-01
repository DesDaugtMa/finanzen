using Backend.Models.Auth;

namespace Backend.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<LoginResponse?> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<LoginResponse?> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default);
    Task<bool> ValidateRegistrationTokenAsync(string token, CancellationToken ct = default);
    Task<LoginResponse?> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task RevokeSessionAsync(string refreshToken, CancellationToken ct = default);
    Task<UserInfoResponse?> GetUserInfoAsync(int userId, CancellationToken ct = default);
}
