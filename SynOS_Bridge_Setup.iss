; SynOS_Bridge_Setup.iss
; Inno Setup Script for SynOS Remote Bridge Edge Gateway
; Packages self-contained single-file binary, wwwroot, Firewall rules, and Windows Service

[Setup]
AppName=SynOS Remote Bridge
AppVersion=1.0.0
AppPublisher=TBZ Labs
AppPublisherURL=https://tbzlabs.in
AppSupportURL=https://tbzlabs.in
AppUpdatesURL=https://tbzlabs.in
DefaultDirName={autopf}\TBZ Labs\SynOS Remote Bridge
DefaultGroupName=SynOS Remote Bridge
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=SynOS_Bridge_Setup_v1
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
VersionInfoDescription=SynOS Remote Bridge DICOM Edge Gateway
VersionInfoProductName=SynOS Remote Bridge
VersionInfoProductVersion=1.0.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "service"; Description: "Install SynOS Remote Bridge as an automatic Windows Service (Recommended for Hospital LANs)"; Flags: checkedonce
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Main application binaries and configuration
Source: "publish\SynOS-RemoteBridge-Win\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "installer-assets\SynOS.ico"; DestDir: "{app}"; DestName: "SynOS.ico"; Flags: ignoreversion

[Icons]
Name: "{group}\SynOS Remote Bridge Dashboard"; Filename: "http://localhost:5140"; IconFilename: "{app}\SynOS.ico"
Name: "{group}\SynOS Remote Bridge (Console Mode)"; Filename: "{app}\SynOS-RemoteBridge.exe"; IconFilename: "{app}\SynOS.ico"
Name: "{group}\{cm:UninstallProgram,SynOS Remote Bridge}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\SynOS Remote Bridge"; Filename: "http://localhost:5140"; IconFilename: "{app}\SynOS.ico"; Tasks: desktopicon

[Run]
; 1. Add Windows Firewall Rules for DICOM C-STORE and Web UI
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SynOS Remote Bridge DICOM (104)"" dir=in action=allow protocol=TCP localport=104"; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SynOS Remote Bridge DICOM (8899)"" dir=in action=allow protocol=TCP localport=8899"; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SynOS Remote Bridge DICOM (10411)"" dir=in action=allow protocol=TCP localport=10411"; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SynOS Remote Bridge Web UI (5140)"" dir=in action=allow protocol=TCP localport=5140"; Flags: runhidden

; 2. Register & Start Windows Service if selected
Filename: "{sys}\sc.exe"; Parameters: "create SynOSRemoteBridge binPath= ""\""{app}\SynOS-RemoteBridge.exe\"""" start= auto DisplayName= ""SynOS Remote Bridge Edge Gateway"""; Tasks: service; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "failure SynOSRemoteBridge reset= 86400 actions= restart/5000/restart/5000/restart/5000"; Tasks: service; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "start SynOSRemoteBridge"; Tasks: service; Flags: runhidden

; 3. Launch Dashboard after installation
Filename: "http://localhost:5140"; Description: "Open SynOS Remote Bridge Dashboard"; Flags: postinstall shellexec nowait

[UninstallRun]
; Stop and remove Windows Service
Filename: "{sys}\sc.exe"; Parameters: "stop SynOSRemoteBridge"; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "delete SynOSRemoteBridge"; Flags: runhidden

; Clean up Windows Firewall Rules
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""SynOS Remote Bridge DICOM (104)"""; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""SynOS Remote Bridge DICOM (8899)"""; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""SynOS Remote Bridge DICOM (10411)"""; Flags: runhidden
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""SynOS Remote Bridge Web UI (5140)"""; Flags: runhidden
