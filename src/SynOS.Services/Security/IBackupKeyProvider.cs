namespace SynOS.Services
{
    public interface IBackupKeyProvider
    {
        string GetEncryptionKey();
        string GetKeyId();
        bool IsKeyConfigured();
    }
}
