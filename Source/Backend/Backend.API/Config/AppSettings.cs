namespace Backend.Config;

public class AppSettings
{
    public AppConnectionStrings ConnectionStrings { get; set; } = new();
    public string[] AllowedOrigins { get; set; } = [];
}

public class AppConnectionStrings
{
    public string Default { get; set; } = string.Empty;
}
