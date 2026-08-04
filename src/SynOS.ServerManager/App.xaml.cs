using System.Windows;

namespace SynOS.ServerManager
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            DispatcherUnhandledException += (s, args) =>
            {
                MessageBox.Show($"An unhandled error occurred:\n\n{args.Exception.Message}", "SynOS Server Manager Error", MessageBoxButton.OK, MessageBoxImage.Error);
                args.Handled = true;
            };
        }
    }
}
