using System;

namespace SynOS.Services
{
    public class RestoreStateCoordinator : IRestoreStateCoordinator
    {
        private volatile bool _isRestoreInProgress;

        public bool IsRestoreInProgress => _isRestoreInProgress;

        public void BeginRestore()
        {
            _isRestoreInProgress = true;
        }

        public void EndRestore()
        {
            _isRestoreInProgress = false;
        }
    }
}
