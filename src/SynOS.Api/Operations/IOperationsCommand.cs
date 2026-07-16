using System.Threading.Tasks;

namespace SynOS.Api.Operations
{
    public interface IOperationsCommand
    {
        string CommandName { get; }
        string Description { get; }
        Task ExecuteAsync(string[] args);
    }
}
