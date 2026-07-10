using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace SynOS.Updater
{
    class Program
    {
        static int Main(string[] args)
        {
            Console.WriteLine("SynOS.Updater starting...");

            string action = "";
            string targetDir = "";
            string stageDir = "";
            string backupDir = "";
            int processId = 0;
            string launchPath = "";

            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--action" && i + 1 < args.Length) action = args[++i];
                else if (args[i] == "--target-dir" && i + 1 < args.Length) targetDir = args[++i];
                else if (args[i] == "--stage-dir" && i + 1 < args.Length) stageDir = args[++i];
                else if (args[i] == "--backup-dir" && i + 1 < args.Length) backupDir = args[++i];
                else if (args[i] == "--process-id" && i + 1 < args.Length) int.TryParse(args[++i], out processId);
                else if (args[i] == "--launch-path" && i + 1 < args.Length) launchPath = args[++i];
            }

            Console.WriteLine($"Action: {action}");
            Console.WriteLine($"Target Dir: {targetDir}");
            Console.WriteLine($"Stage Dir: {stageDir}");
            Console.WriteLine($"Backup Dir: {backupDir}");
            Console.WriteLine($"Process ID to wait: {processId}");
            Console.WriteLine($"Launch Path: {launchPath}");

            if (string.IsNullOrEmpty(action) || string.IsNullOrEmpty(targetDir))
            {
                Console.WriteLine("Error: Missing required parameters.");
                return 1;
            }

            // 1. Wait for SynOS process to stop
            if (processId > 0)
            {
                try
                {
                    var proc = Process.GetProcessById(processId);
                    Console.WriteLine($"Waiting for parent process {processId} to exit...");
                    if (!proc.WaitForExit(20000)) // 20s
                    {
                        Console.WriteLine("Warning: Parent process did not exit within timeout. Killing it...");
                        proc.Kill();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Parent process check: {ex.Message}");
                }
            }

            // Allow extra time for locks to clear
            Thread.Sleep(2000);

            try
            {
                if (action.Equals("install", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrEmpty(stageDir) || string.IsNullOrEmpty(backupDir))
                    {
                        Console.WriteLine("Error: Stage and Backup paths are required for install action.");
                        return 2;
                    }

                    // Perform backup first
                    Console.WriteLine($"Backing up active binaries from {targetDir} to {backupDir}...");
                    Directory.CreateDirectory(backupDir);
                    CopyDirectory(targetDir, backupDir, true);

                    // Clean target folder binaries
                    Console.WriteLine("Clearing old assemblies in target directory...");
                    ClearBinariesOnly(targetDir);

                    // Swap files from stage to target
                    Console.WriteLine($"Swapping staged files from {stageDir} to {targetDir}...");
                    CopyDirectory(stageDir, targetDir, false); // Overwrite target directory

                    Console.WriteLine("Swap complete.");
                }
                else if (action.Equals("rollback", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrEmpty(backupDir))
                    {
                        Console.WriteLine("Error: Backup path is required for rollback action.");
                        return 3;
                    }

                    Console.WriteLine($"Rolling back binaries from {backupDir} to {targetDir}...");
                    ClearBinariesOnly(targetDir);
                    CopyDirectory(backupDir, targetDir, false);

                    Console.WriteLine("Rollback complete.");
                }
                else
                {
                    Console.WriteLine($"Error: Unknown action '{action}'");
                    return 4;
                }

                // Restart SynOS
                if (!string.IsNullOrEmpty(launchPath) && File.Exists(launchPath))
                {
                    Console.WriteLine($"Restarting SynOS via: {launchPath}...");
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = launchPath,
                        UseShellExecute = true,
                        WorkingDirectory = Path.GetDirectoryName(launchPath)
                    };
                    Process.Start(startInfo);
                }
                else
                {
                    Console.WriteLine("Warning: Launch path not specified or does not exist.");
                }

                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CRITICAL ERROR DURING UPDATE: {ex}");
                // If install failed, try auto-rollback
                if (action.Equals("install", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(backupDir))
                {
                    Console.WriteLine("Attempting emergency automatic rollback...");
                    try
                    {
                        ClearBinariesOnly(targetDir);
                        CopyDirectory(backupDir, targetDir, false);
                        Console.WriteLine("Emergency rollback applied.");

                        if (!string.IsNullOrEmpty(launchPath) && File.Exists(launchPath))
                        {
                            Process.Start(new ProcessStartInfo
                            {
                                FileName = launchPath,
                                UseShellExecute = true,
                                WorkingDirectory = Path.GetDirectoryName(launchPath)
                            });
                        }
                    }
                    catch (Exception rollEx)
                    {
                        Console.WriteLine($"CRITICAL: Emergency rollback failed! {rollEx}");
                    }
                }
                return 5;
            }
        }

        private static void CopyDirectory(string sourceDir, string destDir, bool excludeFolders)
        {
            Directory.CreateDirectory(destDir);

            foreach (var file in Directory.GetFiles(sourceDir))
            {
                // Never overwrite key user configuration or DB files on client
                var fileName = Path.GetFileName(file);
                if (fileName.Equals("appsettings.json", StringComparison.OrdinalIgnoreCase) ||
                    fileName.Equals("appsettings.Development.json", StringComparison.OrdinalIgnoreCase) ||
                    fileName.EndsWith(".mdf", StringComparison.OrdinalIgnoreCase) ||
                    fileName.EndsWith(".ldf", StringComparison.OrdinalIgnoreCase))
                {
                    if (File.Exists(Path.Combine(destDir, fileName))) continue;
                }

                File.Copy(file, Path.Combine(destDir, fileName), true);
            }

            if (!excludeFolders)
            {
                foreach (var directory in Directory.GetDirectories(sourceDir))
                {
                    var dirName = Path.GetFileName(directory);
                    // Skip updates, logs, backups, and temp download directories
                    if (dirName.Equals("updates", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("backup", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("temp_downloads", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("logs", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    CopyDirectory(directory, Path.Combine(destDir, dirName), false);
                }
            }
        }

        private static void ClearBinariesOnly(string directory)
        {
            if (!Directory.Exists(directory)) return;

            foreach (var file in Directory.GetFiles(directory))
            {
                var fileName = Path.GetFileName(file);
                // Do not delete database files, config files or text files
                if (fileName.Equals("appsettings.json", StringComparison.OrdinalIgnoreCase) ||
                    fileName.Equals("appsettings.Development.json", StringComparison.OrdinalIgnoreCase) ||
                    fileName.EndsWith(".mdf", StringComparison.OrdinalIgnoreCase) ||
                    fileName.EndsWith(".ldf", StringComparison.OrdinalIgnoreCase) ||
                    fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                try
                {
                    File.Delete(file);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Failed to delete {fileName}: {ex.Message}");
                }
            }

            foreach (var subDir in Directory.GetDirectories(directory))
            {
                var dirName = Path.GetFileName(subDir);
                if (dirName.Equals("updates", StringComparison.OrdinalIgnoreCase) ||
                    dirName.Equals("backup", StringComparison.OrdinalIgnoreCase) ||
                    dirName.Equals("temp_downloads", StringComparison.OrdinalIgnoreCase) ||
                    dirName.Equals("logs", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                try
                {
                    Directory.Delete(subDir, true);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Failed to delete directory {dirName}: {ex.Message}");
                }
            }
        }
    }
}
