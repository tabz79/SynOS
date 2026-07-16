using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace SynOS.Api.Operations
{
    public class OperationsDispatcher
    {
        private readonly IEnumerable<IOperationsCommand> _commands;
        private readonly ILogger<OperationsDispatcher> _logger;

        public OperationsDispatcher(IEnumerable<IOperationsCommand> commands, ILogger<OperationsDispatcher> logger)
        {
            _commands = commands;
            _logger = logger;
        }

        public async Task<bool> DispatchAsync(string[] args)
        {
            if (args == null || args.Length == 0)
                return false;

            // Find the command that matches the argument prefix (e.g. --prepare-db)
            var command = _commands.FirstOrDefault(c => args.Contains(c.CommandName));
            if (command != null)
            {
                _logger.LogInformation("Operations CLI: Dispatching command {CommandName}...", command.CommandName);
                try
                {
                    await command.ExecuteAsync(args);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Operations CLI: Command {CommandName} failed.", command.CommandName);
                    Environment.Exit(1);
                }
                return true;
            }

            return false;
        }
    }
}
