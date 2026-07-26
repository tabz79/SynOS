namespace SynOS.Api.Services
{
    public static class SystemSetupState
    {
        public static bool IsConfigured { get; set; }

        public const int SetupPort = 59999;
        public const int ServicePort = 59999;
    }
}
