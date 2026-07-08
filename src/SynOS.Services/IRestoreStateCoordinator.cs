using System;

namespace SynOS.Services
{
    public interface IRestoreStateCoordinator
    {
        bool IsRestoreInProgress { get; }
        void BeginRestore();
        void EndRestore();
    }
}
