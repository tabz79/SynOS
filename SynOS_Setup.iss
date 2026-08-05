; SynOS_Setup.iss
; Inno Setup Script to package SynOS single-process Windows Service installation.
; Conforms to Release Candidate 4 Specifications.

#ifndef InstallerType
  #define InstallerType "Online"
#endif

[Setup]
AppName=SynOS
AppVersion=1.5.2
AppPublisher=TBZ Labs
DefaultDirName=C:\SynOS
DefaultGroupName=SynOS
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=SynOS_Setup_v206_toolbar_handle_tool_change_fix
Compression=lzma
SolidCompression=yes
UninstallDisplayIcon={app}\SynOS.ico
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
SetupIconFile=installer-assets\SynOS.ico
WizardImageFile=installer-assets\WizardImage.png
WizardSmallImageFile=installer-assets\WizardSmallImage.png
VersionInfoCompany=TBZ Labs
VersionInfoCopyright=© TBZ Labs
VersionInfoDescription=Diagnostics Lab Operating System
VersionInfoProductName=SynOS
VersionInfoProductVersion=1.5.2
VersionInfoVersion=1.5.2.0

LicenseFile=scripts\eula.txt

CloseApplications=force
RestartApplications=no

[Messages]
SetupAppTitle=SynOS Setup
WelcomeLabel1=Welcome to SynOS
WelcomeLabel2=Diagnostics Lab Operating System%n%nDeveloped by TBZ Labs

[Dirs]
; Standard ProgramData locations (RC2 & RC3: CrashDumps standardized)
Name: "C:\ProgramData\TBZ Labs\SynOS"
Name: "C:\ProgramData\TBZ Labs\SynOS\Logs"
Name: "C:\ProgramData\TBZ Labs\SynOS\Backups"
Name: "C:\ProgramData\TBZ Labs\SynOS\Config"
Name: "C:\ProgramData\TBZ Labs\SynOS\Temp"
Name: "C:\ProgramData\TBZ Labs\SynOS\CrashDumps"

[InstallDelete]
Type: files; Name: "{app}\wwwroot\assets\index-*.js"
Type: files; Name: "{app}\wwwroot\assets\index-*.css"

[Files]
Source: "src\SynOS.Api\bin\Release\net8.0\win-x64\publish\appsettings.json"; DestDir: "{app}"; Flags: onlyifdoesntexist; Permissions: everyone-modify
Source: "src\SynOS.Api\bin\Release\net8.0\win-x64\publish\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion restartreplace; Excludes: "appsettings.json, Logs\*"
Source: "src\SynOS.ServerManager\bin\Release\net8.0-windows\win-x64\publish\*"; DestDir: "{app}\ServerManager"; Flags: recursesubdirs createallsubdirs ignoreversion restartreplace
Source: "installer-assets\SynOS.ico"; DestDir: "{app}"; Flags: ignoreversion

; Copy verification, prerequisite, configuration, export/import and decommission scripts
Source: "scripts\verify-installation.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\install-prereqs.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\decommission.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\installer-config.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\configure-settings.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\export-config.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\import-config.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\eula.txt"; DestDir: "{app}\scripts"; Flags: ignoreversion

; Bundled offline installer database package (Phase 1: Online/Offline build partition)
#if InstallerType == "Offline"
Source: "prerequisites\SQLEXPR_x64_ENU.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall; Check: not IsExistingSqlSelected
#endif

[Icons]
Name: "{userdesktop}\SynOS"; Filename: "http://localhost:59999/login"; IconFilename: "{app}\SynOS.ico"; IconIndex: 0
Name: "{commondesktop}\SynOS"; Filename: "http://localhost:59999/login"; IconFilename: "{app}\SynOS.ico"; IconIndex: 0
Name: "{userdesktop}\SynOS Server Manager"; Filename: "{app}\ServerManager\SynOS.ServerManager.exe"; IconFilename: "{app}\SynOS.ico"; IconIndex: 0
; Start Menu Shortcuts
Name: "{group}\SynOS"; Filename: "http://localhost:59999/login"; IconFilename: "{app}\SynOS.ico"; IconIndex: 0
Name: "{group}\SynOS Server Manager"; Filename: "{app}\ServerManager\SynOS.ServerManager.exe"; IconFilename: "{app}\SynOS.ico"; IconIndex: 0
Name: "{group}\Uninstall SynOS"; Filename: "{uninstallexe}"; IconFilename: "{app}\SynOS.ico"; IconIndex: 0

[Run]
Filename: "net.exe"; Parameters: "start TBZSynOSService"; Flags: runhidden
Filename: "{app}\SynOS.Api.exe"; Parameters: "--setup"; Description: "Configure and Launch SynOS Setup"; Flags: postinstall nowait runhidden; Check: NeedsFirstRunSetup
Filename: "http://localhost:59999/login"; Description: "Launch SynOS in Web Browser"; Flags: postinstall shellexec skipifsilent; Check: not NeedsFirstRunSetup
Filename: "{app}\ServerManager\SynOS.ServerManager.exe"; Description: "Launch SynOS Server Manager (Operations Console)"; Flags: postinstall nowait skipifsilent

[UninstallRun]
; Run decommission script before removing application files
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\decommission.ps1"" -RemoveDb {code:GetRemoveDb} -RemoveReports {code:GetRemoveReports} -RemovePacs {code:GetRemovePacs} -RemoveBackups {code:GetRemoveBackups} -AppDir ""{app}"" -LogFile ""C:\ProgramData\TBZ Labs\SynOS\Logs\decommission.log"" -InstanceName ""{code:GetSelectedInstance}"""; Flags: runhidden; RunOnceId: "DecommissionService"

[Code]
var
  InstallTypePage: TWizardPage;
  rbNewInstall, rbUpgrade, rbRepair: TRadioButton;
  InstallTypeVal: Integer; // 0 = New, 1 = Upgrade, 2 = Repair
  
  ImportConfigPage: TWizardPage;
  chkImportConfig: TNewCheckBox;
  txtBackupPath: TEdit;
  btnBrowseBackup: TNewButton;
  ImportConfigVal: Boolean;
  BackupPathVal: String;
  
  DbSetupPage: TWizardPage;
  lblInstances, lblNoInstanceWarning, lblDbSetupDesc: TLabel;
  UseExistingRadio, InstallExpressRadio: TRadioButton;
  cbInstances: TNewComboBox;
  SelectedInstanceName: String;

  SqlPrereqPage: TWizardPage;
  lblSqlPrereqTitle, lblSqlPrereqDesc, lblSqlStatus: TLabel;
  btnDownloadSql, btnCheckSql: TNewButton;
  
  DbConfigPage: TWizardPage;
  txtDbName, txtUser, txtPass: TEdit;
  cbAuthType: TNewComboBox;
  lblUser, lblPass: TLabel;
  
  PacsFolderPage: TInputDirWizardPage;
  
  UninstallForm: TForm;
  DbCheck, ReportsCheck, PacsCheck, BackupsCheck: TNewCheckBox;
  RemoveDbVal, RemoveReportsVal, RemovePacsVal, RemoveBackupsVal: Boolean;
  InstallSuccess: Boolean;
  InstallErrorMsg: String;

function NeedsFirstRunSetup: Boolean;
begin
  Result := not FileExists('C:\ProgramData\TBZ Labs\SynOS\Config\setup_state.json');
end;

// Helper getters for uninstall options
function GetRemoveDb(Param: String): String;
begin
  if RemoveDbVal then Result := '$true' else Result := '$false';
end;

function GetRemoveReports(Param: String): String;
begin
  if RemoveReportsVal then Result := '$true' else Result := '$false';
end;

function GetRemovePacs(Param: String): String;
begin
  if RemovePacsVal then Result := '$true' else Result := '$false';
end;

function GetRemoveBackups(Param: String): String;
begin
  if RemoveBackupsVal then Result := '$true' else Result := '$false';
end;

function GetSelectedInstance(Param: String): String;
begin
  Result := SelectedInstanceName;
end;

function IsExistingSqlSelected: Boolean;
begin
  Result := UseExistingRadio.Checked;
end;

procedure LogUninstallSelection(Sender: TObject);
begin
  RemoveDbVal := DbCheck.Checked;
  RemoveReportsVal := ReportsCheck.Checked;
  RemovePacsVal := PacsCheck.Checked;
  RemoveBackupsVal := BackupsCheck.Checked;
end;

// Populate local SQL instances from registry
procedure PopulateSqlInstances;
var
  Names: TArrayOfString;
  I: Integer;
begin
  cbInstances.Items.Clear;
  if RegGetValueNames(HKLM, 'SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL', Names) then
  begin
    for I := 0 to GetArrayLength(Names) - 1 do
    begin
      if Pos('localdb', Lowercase(Names[I])) = 0 then
      begin
        cbInstances.Items.Add(Names[I]);
      end;
    end;
  end;
  
  if cbInstances.Items.Count > 0 then
  begin
    cbInstances.ItemIndex := 0;
  end
  else
  begin
    cbInstances.ItemIndex := -1;
  end;
end;

procedure DbSetupOptionChange(Sender: TObject);
begin
  if UseExistingRadio.Checked then
  begin
    if cbInstances.Items.Count > 0 then
    begin
      cbInstances.Visible := True;
      lblInstances.Visible := True;
      lblNoInstanceWarning.Visible := False;
    end
    else
    begin
      cbInstances.Visible := False;
      lblInstances.Visible := False;
      lblNoInstanceWarning.Visible := True;
    end;
    lblDbSetupDesc.Visible := True;
  end
  else
  begin
    cbInstances.Visible := False;
    lblInstances.Visible := False;
    lblNoInstanceWarning.Visible := False;
    lblDbSetupDesc.Visible := False;
  end;
end;

procedure AuthTypeChange(Sender: TObject);
begin
  txtUser.Enabled := cbAuthType.ItemIndex = 1;
  txtPass.Enabled := cbAuthType.ItemIndex = 1;
  lblUser.Enabled := cbAuthType.ItemIndex = 1;
  lblPass.Enabled := cbAuthType.ItemIndex = 1;
end;

procedure ImportConfigCheckboxChange(Sender: TObject);
begin
  txtBackupPath.Enabled := chkImportConfig.Checked;
  btnBrowseBackup.Enabled := chkImportConfig.Checked;
end;

procedure BrowseBackupClick(Sender: TObject);
var
  FileName: String;
begin
  if GetOpenFileName('Select Configuration Backup Zip', FileName, '', 'Zip Files (*.zip)|*.zip|All Files (*.*)|*.*', 'zip') then
  begin
    txtBackupPath.Text := FileName;
  end;
end;

// RC3: Installation Type selector page
procedure CreateInstallTypePage;
var
  lblTitle, lblDesc: TLabel;
begin
  InstallTypePage := CreateCustomPage(wpWelcome, 'Installation Type', 'Select the deployment mode for SynOS.');

  lblTitle := TLabel.Create(InstallTypePage);
  lblTitle.Parent := InstallTypePage.Surface;
  lblTitle.Font.Style := [fsBold];
  lblTitle.Caption := 'Choose Setup Operation:';
  lblTitle.Top := ScaleY(10);
  lblTitle.Left := ScaleX(10);

  rbNewInstall := TRadioButton.Create(InstallTypePage);
  rbNewInstall.Parent := InstallTypePage.Surface;
  rbNewInstall.Caption := 'New Installation (Deploy system assets and configure database)';
  rbNewInstall.Checked := True;
  rbNewInstall.Top := lblTitle.Top + ScaleY(25);
  rbNewInstall.Left := ScaleX(20);
  rbNewInstall.Width := InstallTypePage.SurfaceWidth - ScaleX(30);

  rbUpgrade := TRadioButton.Create(InstallTypePage);
  rbUpgrade.Parent := InstallTypePage.Surface;
  rbUpgrade.Caption := 'Upgrade Existing Installation (Replace files and update service)';
  rbUpgrade.Checked := False;
  rbUpgrade.Top := rbNewInstall.Top + ScaleY(25);
  rbUpgrade.Left := ScaleX(20);
  rbUpgrade.Width := InstallTypePage.SurfaceWidth - ScaleX(30);

  rbRepair := TRadioButton.Create(InstallTypePage);
  rbRepair.Parent := InstallTypePage.Surface;
  rbRepair.Caption := 'Repair Installation (Restore binaries, firewall, and service settings)';
  rbRepair.Checked := False;
  rbRepair.Top := rbUpgrade.Top + ScaleY(25);
  rbRepair.Left := ScaleX(20);
  rbRepair.Width := InstallTypePage.SurfaceWidth - ScaleX(30);

  lblDesc := TLabel.Create(InstallTypePage);
  lblDesc.Parent := InstallTypePage.Surface;
  lblDesc.WordWrap := True;
  lblDesc.Width := InstallTypePage.SurfaceWidth - ScaleX(30);
  lblDesc.Top := rbRepair.Top + ScaleY(35);
  lblDesc.Left := ScaleX(20);
  lblDesc.Caption := 'Note: Upgrading or repairing preserves existing databases and diagnostic files safely.';
end;

// RC4: Configuration Import selection page
procedure CreateImportConfigPage;
var
  lblTitle, lblDesc: TLabel;
begin
  ImportConfigPage := CreateCustomPage(InstallTypePage.ID, 'Configuration Import', 'Import configurations from a previously exported backup file.');

  lblTitle := TLabel.Create(ImportConfigPage);
  lblTitle.Parent := ImportConfigPage.Surface;
  lblTitle.Font.Style := [fsBold];
  lblTitle.Caption := 'Import Configurations:';
  lblTitle.Top := ScaleY(10);
  lblTitle.Left := ScaleX(10);

  chkImportConfig := TNewCheckBox.Create(ImportConfigPage);
  chkImportConfig.Parent := ImportConfigPage.Surface;
  chkImportConfig.Caption := 'Import configuration backup file (SynOS_Config_Backup.zip)';
  chkImportConfig.Checked := False;
  chkImportConfig.Top := lblTitle.Top + ScaleY(25);
  chkImportConfig.Left := ScaleX(20);
  chkImportConfig.Width := ImportConfigPage.SurfaceWidth - ScaleX(30);
  chkImportConfig.OnClick := @ImportConfigCheckboxChange;

  txtBackupPath := TEdit.Create(ImportConfigPage);
  txtBackupPath.Parent := ImportConfigPage.Surface;
  txtBackupPath.Top := chkImportConfig.Top + ScaleY(25);
  txtBackupPath.Left := ScaleX(20);
  txtBackupPath.Width := ImportConfigPage.SurfaceWidth - ScaleX(120);
  txtBackupPath.Enabled := False;

  btnBrowseBackup := TNewButton.Create(ImportConfigPage);
  btnBrowseBackup.Parent := ImportConfigPage.Surface;
  btnBrowseBackup.Caption := 'Browse...';
  btnBrowseBackup.Top := txtBackupPath.Top - ScaleY(1);
  btnBrowseBackup.Left := txtBackupPath.Left + txtBackupPath.Width + ScaleX(10);
  btnBrowseBackup.Width := ScaleX(75);
  btnBrowseBackup.Enabled := False;
  btnBrowseBackup.OnClick := @BrowseBackupClick;

  lblDesc := TLabel.Create(ImportConfigPage);
  lblDesc.Parent := ImportConfigPage.Surface;
  lblDesc.WordWrap := True;
  lblDesc.Width := ImportConfigPage.SurfaceWidth - ScaleX(30);
  lblDesc.Top := txtBackupPath.Top + ScaleY(35);
  lblDesc.Left := ScaleX(20);
  lblDesc.Caption := 'If checked, the installer will automatically apply connection strings, local SQLite settings databases, templates, and PACS folder paths from the selected backup file, skipping manual wizards.';
end;

// Custom Database Setup selection page
procedure CreateDbSetupPage;
var
  lblTitle: TLabel;
begin
  DbSetupPage := CreateCustomPage(ImportConfigPage.ID, 'Database Setup', 'Choose how you want to configure your database server.');

  lblTitle := TLabel.Create(DbSetupPage);
  lblTitle.Parent := DbSetupPage.Surface;
  lblTitle.Font.Style := [fsBold];
  lblTitle.Caption := 'Select Database Option:';
  lblTitle.Top := ScaleY(10);
  lblTitle.Left := ScaleX(10);

  InstallExpressRadio := TRadioButton.Create(DbSetupPage);
  InstallExpressRadio.Parent := DbSetupPage.Surface;
  InstallExpressRadio.Caption := 'Install SQL Server Express automatically (Recommended)';
  InstallExpressRadio.Checked := True;
  InstallExpressRadio.Top := lblTitle.Top + ScaleY(25);
  InstallExpressRadio.Left := ScaleX(20);
  InstallExpressRadio.Width := DbSetupPage.SurfaceWidth - ScaleX(30);
  InstallExpressRadio.OnClick := @DbSetupOptionChange;

  UseExistingRadio := TRadioButton.Create(DbSetupPage);
  UseExistingRadio.Parent := DbSetupPage.Surface;
  UseExistingRadio.Caption := 'Use an existing SQL Server instance on this machine';
  UseExistingRadio.Checked := False;
  UseExistingRadio.Top := InstallExpressRadio.Top + ScaleY(25);
  UseExistingRadio.Left := ScaleX(20);
  UseExistingRadio.Width := DbSetupPage.SurfaceWidth - ScaleX(30);
  UseExistingRadio.OnClick := @DbSetupOptionChange;

  lblInstances := TLabel.Create(DbSetupPage);
  lblInstances.Parent := DbSetupPage.Surface;
  lblInstances.Caption := 'Detected Local SQL Instances:';
  lblInstances.Top := UseExistingRadio.Top + ScaleY(25);
  lblInstances.Left := ScaleX(40);
  lblInstances.Visible := False;

  cbInstances := TNewComboBox.Create(DbSetupPage);
  cbInstances.Parent := DbSetupPage.Surface;
  cbInstances.Top := lblInstances.Top + ScaleY(18);
  cbInstances.Left := ScaleX(40);
  cbInstances.Width := ScaleX(200);
  cbInstances.Style := csDropDownList;
  cbInstances.Visible := False;

  lblNoInstanceWarning := TLabel.Create(DbSetupPage);
  lblNoInstanceWarning.Parent := DbSetupPage.Surface;
  lblNoInstanceWarning.Caption := 'Warning: No valid SQL Server instances were detected on this machine. LocalDB cannot be used for background Windows Services. Please select the automatic SQL Server Express installation option.';
  lblNoInstanceWarning.Font.Color := clRed;
  lblNoInstanceWarning.WordWrap := True;
  lblNoInstanceWarning.Width := DbSetupPage.SurfaceWidth - ScaleX(50);
  lblNoInstanceWarning.Top := cbInstances.Top;
  lblNoInstanceWarning.Left := ScaleX(40);
  lblNoInstanceWarning.Visible := False;

  PopulateSqlInstances;

  lblDbSetupDesc := TLabel.Create(DbSetupPage);
  lblDbSetupDesc.Parent := DbSetupPage.Surface;
  lblDbSetupDesc.WordWrap := True;
  lblDbSetupDesc.Width := DbSetupPage.SurfaceWidth - ScaleX(30);
  lblDbSetupDesc.Top := cbInstances.Top + ScaleY(35);
  lblDbSetupDesc.Left := ScaleX(20);
  lblDbSetupDesc.Caption := 'If you use an existing instance, the installer skips local installation, and you will configure custom authentication parameters on the next page.';
  lblDbSetupDesc.Visible := False;
end;

function IsSqlInstanceInstalled(InstanceName: String): Boolean;
var
  Names: TArrayOfString;
  I: Integer;
begin
  Result := False;
  if RegGetValueNames(HKLM, 'SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL', Names) then
  begin
    for I := 0 to GetArrayLength(Names) - 1 do
    begin
      if CompareText(Names[I], InstanceName) = 0 then
      begin
        Result := True;
        exit;
      end;
    end;
  end;
end;

procedure DownloadSqlBtnClick(Sender: TObject);
var
  ErrorCode: Integer;
begin
  ShellExec('open', 'https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SQLEXPR_x64_ENU.exe', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

procedure UpdateSqlPrereqStatus;
begin
  if IsSqlInstanceInstalled('SYNOS') then
  begin
    lblSqlStatus.Caption := 'Status: SQL Server instance ''SYNOS'' DETECTED successfully!';
    lblSqlStatus.Font.Color := clGreen;
  end
  else
  begin
    lblSqlStatus.Caption := 'Status: SQL Server instance ''SYNOS'' NOT detected.';
    lblSqlStatus.Font.Color := clRed;
  end;
end;

procedure CheckSqlBtnClick(Sender: TObject);
begin
  UpdateSqlPrereqStatus;
end;

procedure CreateSqlPrereqPage;
begin
  SqlPrereqPage := CreateCustomPage(DbSetupPage.ID, 'SQL Server Prerequisite', 'Install SQL Server 2022 Express on your system.');

  lblSqlPrereqTitle := TLabel.Create(SqlPrereqPage);
  lblSqlPrereqTitle.Parent := SqlPrereqPage.Surface;
  lblSqlPrereqTitle.Font.Style := [fsBold];
  lblSqlPrereqTitle.Caption := 'SQL Server 2022 Express Instance Required';
  lblSqlPrereqTitle.Top := ScaleY(10);
  lblSqlPrereqTitle.Left := ScaleX(10);

  lblSqlPrereqDesc := TLabel.Create(SqlPrereqPage);
  lblSqlPrereqDesc.Parent := SqlPrereqPage.Surface;
  lblSqlPrereqDesc.WordWrap := True;
  lblSqlPrereqDesc.Width := SqlPrereqPage.SurfaceWidth - ScaleX(20);
  lblSqlPrereqDesc.Top := lblSqlPrereqTitle.Top + ScaleY(25);
  lblSqlPrereqDesc.Left := ScaleX(10);
  lblSqlPrereqDesc.Caption := 'A dedicated SQL Server 2022 Express database instance named ''SYNOS'' is required.' + #13#10#13#10 +
                              '1. Click the button below to download the official Microsoft installer.' + #13#10 +
                              '2. Run the downloaded file, select "Custom" installation, and specify the instance name as SYNOS.' + #13#10 +
                              '3. Keep the default Windows Authentication configuration.' + #13#10#13#10 +
                              'Once the SQL Server installation is complete, click "Verify Status" to proceed.';

  btnDownloadSql := TNewButton.Create(SqlPrereqPage);
  btnDownloadSql.Parent := SqlPrereqPage.Surface;
  btnDownloadSql.Caption := 'Download SQL Server 2022 Express';
  btnDownloadSql.Top := lblSqlPrereqDesc.Top + ScaleY(100);
  btnDownloadSql.Left := ScaleX(10);
  btnDownloadSql.Width := ScaleX(230);
  btnDownloadSql.Height := ScaleY(25);
  btnDownloadSql.OnClick := @DownloadSqlBtnClick;

  lblSqlStatus := TLabel.Create(SqlPrereqPage);
  lblSqlStatus.Parent := SqlPrereqPage.Surface;
  lblSqlStatus.Font.Style := [fsBold];
  lblSqlStatus.Top := btnDownloadSql.Top + ScaleY(40);
  lblSqlStatus.Left := ScaleX(10);
  lblSqlStatus.Width := SqlPrereqPage.SurfaceWidth - ScaleX(20);
  
  btnCheckSql := TNewButton.Create(SqlPrereqPage);
  btnCheckSql.Parent := SqlPrereqPage.Surface;
  btnCheckSql.Caption := 'Verify Status';
  btnCheckSql.Top := lblSqlStatus.Top + ScaleY(25);
  btnCheckSql.Left := ScaleX(10);
  btnCheckSql.Width := ScaleX(100);
  btnCheckSql.Height := ScaleY(25);
  btnCheckSql.OnClick := @CheckSqlBtnClick;

  // Initial check
  UpdateSqlPrereqStatus;
end;

// RC3: SQL Authentication & DB Naming Page
procedure CreateDbConfigPage;
var
  lblTitle, lblDb, lblAuth: TLabel;
begin
  DbConfigPage := CreateCustomPage(SqlPrereqPage.ID, 'Database Configuration', 'Configure connection credentials for your SQL Server instance.');

  lblTitle := TLabel.Create(DbConfigPage);
  lblTitle.Parent := DbConfigPage.Surface;
  lblTitle.Font.Style := [fsBold];
  lblTitle.Caption := 'Database Credentials:';
  lblTitle.Top := ScaleY(10);
  lblTitle.Left := ScaleX(10);

  lblDb := TLabel.Create(DbConfigPage);
  lblDb.Parent := DbConfigPage.Surface;
  lblDb.Caption := 'Database Name:';
  lblDb.Top := lblTitle.Top + ScaleY(25);
  lblDb.Left := ScaleX(20);

  txtDbName := TEdit.Create(DbConfigPage);
  txtDbName.Parent := DbConfigPage.Surface;
  txtDbName.Text := 'SynOSDb';
  txtDbName.Top := lblDb.Top + ScaleY(18);
  txtDbName.Left := ScaleX(20);
  txtDbName.Width := ScaleX(180);

  lblAuth := TLabel.Create(DbConfigPage);
  lblAuth.Parent := DbConfigPage.Surface;
  lblAuth.Caption := 'Authentication Mode:';
  lblAuth.Top := txtDbName.Top + ScaleY(30);
  lblAuth.Left := ScaleX(20);

  cbAuthType := TNewComboBox.Create(DbConfigPage);
  cbAuthType.Parent := DbConfigPage.Surface;
  cbAuthType.Style := csDropDownList;
  cbAuthType.Items.Add('Windows Authentication (Trusted Connection)');
  cbAuthType.Items.Add('SQL Server Authentication');
  cbAuthType.ItemIndex := 0;
  cbAuthType.Top := lblAuth.Top + ScaleY(18);
  cbAuthType.Left := ScaleX(20);
  cbAuthType.Width := ScaleX(250);
  cbAuthType.OnChange := @AuthTypeChange;

  lblUser := TLabel.Create(DbConfigPage);
  lblUser.Parent := DbConfigPage.Surface;
  lblUser.Caption := 'SQL Username:';
  lblUser.Top := cbAuthType.Top + ScaleY(30);
  lblUser.Left := ScaleX(20);
  lblUser.Enabled := False;

  txtUser := TEdit.Create(DbConfigPage);
  txtUser.Parent := DbConfigPage.Surface;
  txtUser.Text := 'sa';
  txtUser.Top := lblUser.Top + ScaleY(18);
  txtUser.Left := ScaleX(20);
  txtUser.Width := ScaleX(150);
  txtUser.Enabled := False;

  lblPass := TLabel.Create(DbConfigPage);
  lblPass.Parent := DbConfigPage.Surface;
  lblPass.Caption := 'SQL Password:';
  lblPass.Top := txtUser.Top + ScaleY(30);
  lblPass.Left := ScaleX(20);
  lblPass.Enabled := False;

  txtPass := TEdit.Create(DbConfigPage);
  txtPass.Parent := DbConfigPage.Surface;
  txtPass.PasswordChar := '*';
  txtPass.Top := lblPass.Top + ScaleY(18);
  txtPass.Left := ScaleX(20);
  txtPass.Width := ScaleX(150);
  txtPass.Enabled := False;
end;

// RC3: PACS Folder Selection Page
procedure CreatePacsFolderPage;
begin
  PacsFolderPage := CreateInputDirPage(DbConfigPage.ID, 'PACS Storage Location', 'Select the directory where PACS imaging data will be stored.', 'Select folder and click Next.', False, '');
  PacsFolderPage.Add('PACS Folder Path:');
  PacsFolderPage.Values[0] := 'C:\SynOS_Files\PACS';
end;

// Phase 7: Upgrade Path Detection (No silent overwrites)
function IsServiceInstalled(ServiceName: string): Boolean;
var
  ExitCode: Integer;
begin
  Result := Exec('sc.exe', 'query ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ExitCode) and (ExitCode = 0);
end;

function IsServiceRunning(ServiceName: string): Boolean;
var
  ExitCode: Integer;
begin
  Result := Exec('powershell.exe', '-Command "if ((Get-Service ' + ServiceName + ' -ErrorAction SilentlyContinue).Status -eq ''Running'') { exit 0 } else { exit 1 }"', '', SW_HIDE, ewWaitUntilTerminated, ExitCode) and (ExitCode = 0);
end;

function InitializeSetup: Boolean;
var
  UpgradeResult: Integer;
begin
  InstallSuccess := True;
  InstallErrorMsg := '';
  Result := True;
  if IsServiceInstalled('TBZSynOSService') then
  begin
    UpgradeResult := MsgBox('An existing installation of SynOS was detected.' + #13#10 + #13#10 +
      'Do you want to perform an upgrade to Version ' + ExpandConstant('{#SetupSetting("AppVersion")}') + '? (Your database and uploads will be preserved).',
      mbConfirmation, MB_YESNO);
    if UpgradeResult <> IDYES then
    begin
      Result := False;
    end;
  end;
end;

procedure InitializeWizard;
begin
  CreateInstallTypePage;
  CreateImportConfigPage;
  CreateDbSetupPage;
  CreateSqlPrereqPage;
  CreateDbConfigPage;
  CreatePacsFolderPage;
end;

// RC3 & RC4: Conditional Wizard Flow mapping
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  
  // If Upgrade or Repair installation type is selected, skip directory/database configurations
  if (InstallTypeVal = 1) or (InstallTypeVal = 2) then
  begin
    if (PageID = wpLicense) or (PageID = wpSelectDir) or (PageID = ImportConfigPage.ID) or (PageID = DbSetupPage.ID) or (PageID = SqlPrereqPage.ID) or (PageID = DbConfigPage.ID) or (PageID = PacsFolderPage.ID) then
      Result := True;
  end;

  // RC4: Skip database setups if configuration import is selected
  if (InstallTypeVal = 0) and ImportConfigVal then
  begin
    if (PageID = DbSetupPage.ID) or (PageID = SqlPrereqPage.ID) or (PageID = DbConfigPage.ID) or (PageID = PacsFolderPage.ID) then
      Result := True;
  end;

  // Skip custom SQL configuration inputs if local SQL Server Express is installed automatically
  if (InstallTypeVal = 0) and (not ImportConfigVal) and (PageID = DbConfigPage.ID) and (not UseExistingRadio.Checked) then
  begin
    Result := True;
  end;

  // Skip SQL Prerequisite page if using existing SQL instance or if SYNOS instance is already installed
  if PageID = SqlPrereqPage.ID then
  begin
    if UseExistingRadio.Checked or IsSqlInstanceInstalled('SYNOS') then
      Result := True;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  if CurPageID = InstallTypePage.ID then
  begin
    if rbNewInstall.Checked then InstallTypeVal := 0
    else if rbUpgrade.Checked then InstallTypeVal := 1
    else InstallTypeVal := 2;
  end;

  if CurPageID = ImportConfigPage.ID then
  begin
    ImportConfigVal := chkImportConfig.Checked;
    BackupPathVal := txtBackupPath.Text;
  end;

  if CurPageID = DbSetupPage.ID then
  begin
    if UseExistingRadio.Checked then
    begin
      if cbInstances.Items.Count = 0 then
      begin
        MsgBox('No valid SQL Server instances were detected on this machine. Please select the automatic option to install SQL Server Express.', mbError, MB_OK);
        Result := False;
        exit;
      end;
      SelectedInstanceName := cbInstances.Items[cbInstances.ItemIndex];
    end;
  end;

  if CurPageID = SqlPrereqPage.ID then
  begin
    if not IsSqlInstanceInstalled('SYNOS') then
    begin
      MsgBox('The SQL Server instance ''SYNOS'' was not detected on this machine.' + #13#10 +
             'Please download and install SQL Server 2022 Express, naming the instance ''SYNOS'', and verify the status before clicking Next.', mbError, MB_OK);
      Result := False;
      exit;
    end;
  end;
  Result := True;
end;

// Helper to run PowerShell scripts silently
procedure RunPowerShellScript(ScriptPath: String; Params: String; var ExitCode: Integer);
var
  Cmd: String;
begin
  Cmd := '-ExecutionPolicy Bypass -File "' + ScriptPath + '" ' + Params;
  Exec('powershell.exe', Cmd, '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
end;

// Phase 2 & 3: Post-Install Verification & Rollback logic
procedure CurStepChanged(CurStep: TSetupStep);
var
  ExitCode: Integer;
  AppPath: String;
  VerifyScript, DecomScript, ConfigScript, ImportScript: String;
  DecomParams, ConfigParams, ImportParams: String;
  DbAuthType, DbUser, DbPass: String;
begin
  if CurStep = ssInstall then
  begin
    // Stop the running service and kill active processes to release DLL locks before replacing files
    Exec('net.exe', 'stop TBZSynOSService', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
    Exec('sc.exe', 'stop TBZSynOSService', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
    Exec('taskkill.exe', '/F /IM SynOS.Api.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
    Exec('taskkill.exe', '/F /IM SynOS.Updater.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
    Sleep(2000);
  end;

  if CurStep = ssPostInstall then
  begin
    AppPath := ExpandConstant('{app}');
    VerifyScript := AppPath + '\scripts\verify-installation.ps1';
    DecomScript := AppPath + '\scripts\decommission.ps1';
    ConfigScript := AppPath + '\scripts\configure-settings.ps1';
    ImportScript := AppPath + '\scripts\import-config.ps1';

    InstallSuccess := True;

    // 1. Run configuration import (RC4: Configuration Import engine)
    if (InstallTypeVal = 0) and ImportConfigVal then
    begin
      WizardForm.StatusLabel.Caption := 'Restoring system configurations from backup file...';
      ImportParams := '-BackupZipPath "' + BackupPathVal + '" -AppDir "' + AppPath + '"';
      RunPowerShellScript(ImportScript, ImportParams, ExitCode);
      if ExitCode <> 0 then
      begin
        InstallSuccess := False;
        InstallErrorMsg := 'Failed to restore configurations from the backup file.';
        exit;
      end;
    end;

    // 2. Run database connection configuration setup (Only if New Install and NOT importing config)
    if (InstallTypeVal = 0) and (not ImportConfigVal) then
    begin
      WizardForm.StatusLabel.Caption := 'Configuring appsettings.json connection profiles...';
      if UseExistingRadio.Checked then
      begin
        if cbAuthType.ItemIndex = 1 then DbAuthType := 'SQL' else DbAuthType := 'Windows';
        DbUser := txtUser.Text;
        DbPass := txtPass.Text;
        ConfigParams := '-AppDir "' + AppPath + '" -DbName "' + txtDbName.Text + '" -InstanceName "' + SelectedInstanceName + '" -AuthType "' + DbAuthType + '" -Username "' + DbUser + '" -Password "' + DbPass + '" -PacsDir "' + PacsFolderPage.Values[0] + '"';
      end
      else
      begin
        ConfigParams := '-AppDir "' + AppPath + '" -DbName "SynOSDb" -InstanceName "SYNOS" -AuthType "Windows" -PacsDir "' + PacsFolderPage.Values[0] + '"';
      end;

      RunPowerShellScript(ConfigScript, ConfigParams, ExitCode);
      if ExitCode <> 0 then
      begin
        InstallSuccess := False;
        InstallErrorMsg := 'Failed to configure database connection profiles in appsettings.json.';
        exit;
      end;
    end;

    // 3. Register Windows Service with SQL Dependency & Recovery Policy
    if (InstallTypeVal = 0) or (InstallTypeVal = 2) then
    begin
      WizardForm.StatusLabel.Caption := 'Registering TBZ Labs - SynOS service...';
      Exec('sc.exe', 'create TBZSynOSService start= auto binPath= "' + AppPath + '\SynOS.Api.exe" DisplayName= "TBZ Labs - SynOS" depend= MSSQL$SYNOS', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
      if (ExitCode <> 0) and (ExitCode <> 1073) then
      begin
        InstallSuccess := False;
        InstallErrorMsg := 'Failed to register the Windows Service (TBZSynOSService).';
        exit;
      end;

      // Configure Windows Service Recovery (Auto-restart on 1st, 2nd, and subsequent crashes after 60s)
      Exec('sc.exe', 'failure TBZSynOSService reset= 86400 actions= restart/60000/restart/60000/restart/60000', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
    end;

    // 4. Run Firewall Setup, Service Startup & Health check verification
    WizardForm.StatusLabel.Caption := 'Configuring firewall and verifying health...';
    RunPowerShellScript(VerifyScript, '-AppDir "' + AppPath + '" -LogFile "C:\ProgramData\TBZ Labs\SynOS\Logs\install.log"', ExitCode);
    if ExitCode <> 0 then
    begin
      // HEALTH VERIFICATION FAILED! Trigger rollback
      WizardForm.StatusLabel.Caption := 'Verification failed. Rolling back installation changes...';
      
      // Stop and delete service
      Exec('sc.exe', 'stop TBZSynOSService', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
      Exec('sc.exe', 'delete TBZSynOSService', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
      
      // Run decommission to clean up other components (e.g. firewall rule)
      DecomParams := '-RemoveDb $false -RemoveReports $false -RemovePacs $false -RemoveBackups $false -AppDir "' + AppPath + '" -LogFile "C:\ProgramData\TBZ Labs\SynOS\Logs\install.log" -InstanceName "' + SelectedInstanceName + '"';
      RunPowerShellScript(DecomScript, DecomParams, ExitCode);
      
      InstallSuccess := False;
      InstallErrorMsg := 'System health check verification failed (SynOS service failed to respond on port 59999).';
      exit;
    end;
  end;
end;

// Finish Page Summary (RC3 Version/Build summary specifications)
procedure CurPageChanged(CurPageID: Integer);
var
  ServiceStatus: String;
begin
  if CurPageID = wpFinished then
  begin
    if InstallSuccess then
    begin
      if IsServiceRunning('TBZSynOSService') then
        ServiceStatus := 'Running'
      else
        ServiceStatus := 'Stopped';

      WizardForm.FinishedLabel.Caption :=
        'SynOS has been successfully installed.' + #13#10 + #13#10 +
        'Developed by TBZ Labs.';
    end
    else
    begin
      WizardForm.FinishedLabel.Caption :=
        '✗ Installation Failed' + #13#10 + #13#10 +
        'SynOS could not be installed successfully.' + #13#10 + #13#10 +
        'Reason: ' + InstallErrorMsg + #13#10 + #13#10 +
        'Please check C:\ProgramData\TBZ Labs\SynOS\Logs\install.log for details.';
      if WizardForm.RunList <> nil then
        WizardForm.RunList.Visible := False;
    end;
  end;
end;

// Custom Uninstall Dialog page for data preservation
function InitializeUninstall: Boolean;
var
  lblTitle, lblDesc: TLabel;
  btnOK: TNewButton;
begin
  RemoveDbVal := False;
  RemoveReportsVal := False;
  RemovePacsVal := False;
  RemoveBackupsVal := False;

  UninstallForm := TForm.Create(nil);
  UninstallForm.ClientWidth := ScaleX(400);
  UninstallForm.ClientHeight := ScaleY(280);
  UninstallForm.Caption := 'Decommission SynOS Data';
  UninstallForm.Position := poScreenCenter;

  lblTitle := TLabel.Create(UninstallForm);
  lblTitle.Parent := UninstallForm;
  lblTitle.Top := ScaleY(15);
  lblTitle.Left := ScaleX(15);
  lblTitle.Width := UninstallForm.ClientWidth - ScaleX(30);
  lblTitle.Font.Style := [fsBold];
  lblTitle.Font.Size := 10;
  lblTitle.Caption := 'Select components to remove';

  lblDesc := TLabel.Create(UninstallForm);
  lblDesc.Parent := UninstallForm;
  lblDesc.Top := lblTitle.Top + lblTitle.Height + ScaleY(8);
  lblDesc.Left := ScaleX(15);
  lblDesc.Width := UninstallForm.ClientWidth - ScaleX(30);
  lblDesc.Caption := 'By default, your database and uploaded user data are preserved.';

  DbCheck := TNewCheckBox.Create(UninstallForm);
  DbCheck.Parent := UninstallForm;
  DbCheck.Top := lblDesc.Top + lblDesc.Height + ScaleY(20);
  DbCheck.Left := ScaleX(20);
  DbCheck.Width := UninstallForm.ClientWidth - ScaleX(40);
  DbCheck.Caption := 'Remove local SQL Server Database (SynOSDb)';
  DbCheck.Checked := False;

  ReportsCheck := TNewCheckBox.Create(UninstallForm);
  ReportsCheck.Parent := UninstallForm;
  ReportsCheck.Top := DbCheck.Top + DbCheck.Height + ScaleY(12);
  ReportsCheck.Left := ScaleX(20);
  ReportsCheck.Width := UninstallForm.ClientWidth - ScaleX(40);
  ReportsCheck.Caption := 'Remove PDF diagnostic reports folder (C:\SynOS_Files)';
  ReportsCheck.Checked := False;

  PacsCheck := TNewCheckBox.Create(UninstallForm);
  PacsCheck.Parent := UninstallForm;
  PacsCheck.Top := ReportsCheck.Top + ReportsCheck.Height + ScaleY(12);
  PacsCheck.Left := ScaleX(20);
  PacsCheck.Width := UninstallForm.ClientWidth - ScaleX(40);
  PacsCheck.Caption := 'Remove PACS studies storage folder (C:\SynOS_Files\PACS)';
  PacsCheck.Checked := False;

  BackupsCheck := TNewCheckBox.Create(UninstallForm);
  BackupsCheck.Parent := UninstallForm;
  BackupsCheck.Top := PacsCheck.Top + PacsCheck.Height + ScaleY(12);
  BackupsCheck.Left := ScaleX(20);
  BackupsCheck.Width := UninstallForm.ClientWidth - ScaleX(40);
  BackupsCheck.Caption := 'Remove update backup directory';
  BackupsCheck.Checked := False;

  btnOK := TNewButton.Create(UninstallForm);
  btnOK.Parent := UninstallForm;
  btnOK.Width := ScaleX(85);
  btnOK.Height := ScaleY(25);
  btnOK.Top := UninstallForm.ClientHeight - btnOK.Height - ScaleY(15);
  btnOK.Left := UninstallForm.ClientWidth - btnOK.Width - ScaleX(15);
  btnOK.Caption := 'Proceed';
  btnOK.ModalResult := mrOk;
  btnOK.OnClick := @LogUninstallSelection;

  UninstallForm.ActiveControl := btnOK;
  UninstallForm.FormStyle := fsStayOnTop;
  UninstallForm.ShowModal;

  Result := True;
end;
