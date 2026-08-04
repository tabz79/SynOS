using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.ServiceProcess;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using System.Windows.Threading;

namespace SynOS.ServerManager
{
    public partial class MainWindow : Window
    {
        private const string ServiceName = "TBZSynOSService";
        private const string HealthUrl = "http://localhost:59999/health";
        private const string LoginUrl = "http://localhost:59999/login";
        private const string ConnectionString = "Server=.\\SYNOS;Database=SynOSDb-1;Trusted_Connection=True;TrustServerCertificate=True;Connect Timeout=3;";
        private const string LogDirectory = @"C:\ProgramData\TBZ Labs\SynOS\Logs";

        private readonly DispatcherTimer _healthTimer;
        private readonly HttpClient _httpClient;

        public MainWindow()
        {
            InitializeComponent();

            try
            {
                var iconStream = Application.GetResourceStream(new Uri("pack://application:,,,/SynOS.ico", UriKind.RelativeOrAbsolute));
                if (iconStream?.Stream != null)
                {
                    Icon = System.Windows.Media.Imaging.BitmapFrame.Create(iconStream.Stream);
                }
            }
            catch
            {
                // Non-fatal if icon resource stream fails
            }

            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };

            _healthTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(5)
            };
            _healthTimer.Tick += async (s, e) => await RefreshHealthStateAsync();
            _healthTimer.Start();

            Loaded += async (s, e) =>
            {
                await RefreshHealthStateAsync();
                RefreshLogStream();
            };
        }

        private async Task RefreshHealthStateAsync()
        {
            // 1. Check Windows Service
            bool serviceRunning = CheckServiceStatus(out string serviceStateText);

            // 2. Check Database Engine
            bool dbConnected = await CheckDatabaseStatusAsync();

            // 3. Check Web API Endpoint
            var (apiHealthy, apiText) = await CheckApiHealthAsync();

            // Update UI Badges
            UpdateBadge(ServiceStatusBorder, ServiceStatusText, serviceRunning, serviceStateText);
            UpdateBadge(DbStatusBorder, DbStatusText, dbConnected, dbConnected ? "CONNECTED" : "DISCONNECTED");
            UpdateBadge(ApiStatusBorder, ApiStatusText, apiHealthy, apiText);

            // Overall System Status Banner
            if (serviceRunning && dbConnected && apiHealthy)
            {
                OverallStatusBorder.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#065F46"));
                OverallStatusDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34D399"));
                OverallStatusText.Text = "SYSTEM ONLINE";
            }
            else if (serviceRunning)
            {
                OverallStatusBorder.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9A3412"));
                OverallStatusDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FB923C"));
                OverallStatusText.Text = "ATTENTION REQUIRED";
            }
            else
            {
                OverallStatusBorder.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#991B1B"));
                OverallStatusDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F87171"));
                OverallStatusText.Text = "SERVER OFFLINE";
            }
        }

        private bool CheckServiceStatus(out string stateText)
        {
            try
            {
                using var sc = new ServiceController(ServiceName);
                stateText = sc.Status.ToString().ToUpper();
                return sc.Status == ServiceControllerStatus.Running;
            }
            catch (Exception ex)
            {
                stateText = "NOT INSTALLED / UNKNOWN";
                Debug.WriteLine($"Service status check failed: {ex.Message}");
                return false;
            }
        }

        private async Task<bool> CheckDatabaseStatusAsync()
        {
            return await Task.Run(() =>
            {
                try
                {
                    using var conn = new Microsoft.Data.SqlClient.SqlConnection(ConnectionString);
                    conn.Open();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT 1";
                    var val = cmd.ExecuteScalar();
                    return val != null && Convert.ToInt32(val) == 1;
                }
                catch
                {
                    return false;
                }
            });
        }

        private async Task<(bool IsHealthy, string StatusText)> CheckApiHealthAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync(HealthUrl);
                if (response.IsSuccessStatusCode)
                {
                    return (true, "HEALTHY (200 OK)");
                }
                return (false, $"HTTP {(int)response.StatusCode}");
            }
            catch
            {
                return (false, "OFFLINE");
            }
        }

        private void UpdateBadge(System.Windows.Controls.Border border, System.Windows.Controls.TextBlock textBlock, bool isOk, string text)
        {
            textBlock.Text = text;
            if (isOk)
            {
                border.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#065F46"));
                textBlock.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34D399"));
            }
            else
            {
                border.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#991B1B"));
                textBlock.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F87171"));
            }
        }

        private async void BtnStart_Click(object sender, RoutedEventArgs e)
        {
            RunServiceCommand("start");
            await Task.Delay(2000);
            await RefreshHealthStateAsync();
        }

        private async void BtnStop_Click(object sender, RoutedEventArgs e)
        {
            RunServiceCommand("stop");
            await Task.Delay(2000);
            await RefreshHealthStateAsync();
        }

        private async void BtnRestart_Click(object sender, RoutedEventArgs e)
        {
            RunServiceCommand("stop");
            await Task.Delay(2000);
            RunServiceCommand("start");
            await Task.Delay(2000);
            await RefreshHealthStateAsync();
        }

        private void BtnOpenBrowser_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo(LoginUrl) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to open browser: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void BtnRefreshLogs_Click(object sender, RoutedEventArgs e)
        {
            RefreshLogStream();
        }

        private void RefreshLogStream()
        {
            try
            {
                if (!Directory.Exists(LogDirectory))
                {
                    TxtLogs.Text = "Log directory does not exist: " + LogDirectory;
                    return;
                }

                var latestFile = new DirectoryInfo(LogDirectory)
                    .GetFiles("synos-api-*.txt")
                    .OrderByDescending(f => f.LastWriteTime)
                    .FirstOrDefault();

                if (latestFile == null)
                {
                    TxtLogs.Text = "No log files found in " + LogDirectory;
                    return;
                }

                using var stream = new FileStream(latestFile.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(stream);
                string content = reader.ReadToEnd();

                var lines = content.Split('\n');
                var lastLines = lines.Skip(Math.Max(0, lines.Length - 100));
                TxtLogs.Text = string.Join("\n", lastLines);
                TxtLogs.ScrollToEnd();
            }
            catch (Exception ex)
            {
                TxtLogs.Text = $"Error reading log file: {ex.Message}";
            }
        }

        private void RunServiceCommand(string verb)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c net {verb} {ServiceName}",
                    Verb = "runas",
                    UseShellExecute = true,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to {verb} service: {ex.Message}", "Elevation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
    }
}
