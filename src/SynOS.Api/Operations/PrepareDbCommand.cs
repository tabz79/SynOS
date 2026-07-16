using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SynOS.Services;

namespace SynOS.Api.Operations
{
    public class PrepareDbCommand : IOperationsCommand
    {
        private readonly ProductionDatabasePreparer _preparer;
        private readonly ILogger<PrepareDbCommand> _logger;

        public string CommandName => "--prepare-db";
        public string Description => "Prepares a development database for production deployment by purging all transactional data.";

        public PrepareDbCommand(ProductionDatabasePreparer preparer, ILogger<PrepareDbCommand> logger)
        {
            _preparer = preparer;
            _logger = logger;
        }

        public async Task ExecuteAsync(string[] args)
        {
            _logger.LogInformation("Operations CLI: Production Database Preparer started.");

            // 1. Force check
            if (!args.Contains("--force"))
            {
                _logger.LogWarning("CRITICAL WARNING: The '--prepare-db' command purges all patient data and billing logs.");
                _logger.LogWarning("You must explicitly include the '--force' flag to run this command.");
                _logger.LogWarning("Usage: SynOS.Api.exe --prepare-db --force [--dry-run]");
                Environment.Exit(1);
            }

            bool isDryRun = args.Contains("--dry-run");
            try
            {
                await _preparer.PrepareDatabaseAsync(isDryRun);
                _logger.LogInformation("Operations CLI: Database preparation execution finished successfully.");
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Operations CLI ERROR: Database preparation failed.");
                Environment.Exit(1);
            }
        }
    }
}
