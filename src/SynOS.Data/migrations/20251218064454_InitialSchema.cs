using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AccessionCounters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Day = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Prefix = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastNumber = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessionCounters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.BranchId);
                });

            migrationBuilder.CreateTable(
                name: "CriticalRules",
                columns: table => new
                {
                    RuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CriticalLow = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    CriticalHigh = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    EscalationMinutes = table.Column<int>(type: "int", nullable: false),
                    RequireAcknowledgment = table.Column<bool>(type: "bit", nullable: false),
                    NotificationChannels = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalRules", x => x.RuleId);
                });

            migrationBuilder.CreateTable(
                name: "DeltaCheckConfigs",
                columns: table => new
                {
                    ConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ThresholdPercent = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeltaCheckConfigs", x => x.ConfigId);
                });

            migrationBuilder.CreateTable(
                name: "DeptScopePolicies",
                columns: table => new
                {
                    PolicyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    Dept = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CanSearchAll = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeptScopePolicies", x => x.PolicyId);
                });

            migrationBuilder.CreateTable(
                name: "IMS_Consumables",
                columns: table => new
                {
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsCritical = table.Column<bool>(type: "bit", nullable: false),
                    IsReusable = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LegacyTubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_Consumables", x => x.ConsumableId);
                });

            migrationBuilder.CreateTable(
                name: "IMS_Suppliers",
                columns: table => new
                {
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ContactInfo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_Suppliers", x => x.SupplierId);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TubeMasters",
                columns: table => new
                {
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeMasters", x => x.TubeId);
                });

            migrationBuilder.CreateTable(
                name: "LabAnalyzers",
                columns: table => new
                {
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrgId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Manufacturer = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ConnectionType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzers", x => x.AnalyzerId);
                });

            migrationBuilder.CreateTable(
                name: "NotificationQueues",
                columns: table => new
                {
                    QueueId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TargetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Recipient = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    NextRetryAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationQueues", x => x.QueueId);
                });

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MRN = table.Column<string>(type: "nvarchar(6)", maxLength: 6, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CurrentPhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsSoftDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.PatientId);
                });

            migrationBuilder.CreateTable(
                name: "Referrers",
                columns: table => new
                {
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    BankAccount = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IFSC = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrers", x => x.ReferrerId);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "TestDefinitions",
                columns: table => new
                {
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    DefaultTubeType = table.Column<int>(type: "int", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestDefinitions", x => x.TestCode);
                });

            migrationBuilder.CreateTable(
                name: "Tests",
                columns: table => new
                {
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TestName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DefaultTubeType = table.Column<int>(type: "int", nullable: true),
                    BasePrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TAT_Hours = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tests", x => x.TestId);
                });

            migrationBuilder.CreateTable(
                name: "TokenCounters",
                columns: table => new
                {
                    CounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Day = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SeriesLetter = table.Column<string>(type: "nvarchar(1)", maxLength: 1, nullable: false),
                    LastNumber = table.Column<int>(type: "int", nullable: false),
                    MaxPerSeries = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TokenCounters", x => x.CounterId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FailedLoginAttempts = table.Column<int>(type: "int", nullable: false),
                    LockoutEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SignatureImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SignatureUpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "IMS_ConsumableLots",
                columns: table => new
                {
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExpiryDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CostPerUnit = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LegacyTubeLotId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_ConsumableLots", x => x.LotId);
                    table.ForeignKey(
                        name: "FK_IMS_ConsumableLots_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_ConsumableLots_IMS_Consumables_ConsumableId",
                        column: x => x.ConsumableId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_PurchaseOrders",
                columns: table => new
                {
                    POId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_PurchaseOrders", x => x.POId);
                    table.ForeignKey(
                        name: "FK_IMS_PurchaseOrders_IMS_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "IMS_Suppliers",
                        principalColumn: "SupplierId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LabAnalyzerResultInbox",
                columns: table => new
                {
                    InboxId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RawMessage = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientIdentifier = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AnalyzerTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ResultValue = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Units = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Flags = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MeasuredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ReceivedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReviewedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzerResultInbox", x => x.InboxId);
                    table.ForeignKey(
                        name: "FK_LabAnalyzerResultInbox_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "AnalyzerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LabAnalyzerTestMappings",
                columns: table => new
                {
                    MappingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyzerTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SynosTestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UnitsOverride = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RefLowOverride = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    RefHighOverride = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabAnalyzerTestMappings", x => x.MappingId);
                    table.ForeignKey(
                        name: "FK_LabAnalyzerTestMappings_LabAnalyzers_AnalyzerId",
                        column: x => x.AnalyzerId,
                        principalTable: "LabAnalyzers",
                        principalColumn: "AnalyzerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    AppointmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScheduledFor = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReminderSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.AppointmentId);
                    table.ForeignKey(
                        name: "FK_Appointments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientAliases",
                columns: table => new
                {
                    AliasId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientAliases", x => x.AliasId);
                    table.ForeignKey(
                        name: "FK_PatientAliases_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientPhoneHistories",
                columns: table => new
                {
                    PhoneHistoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientPhoneHistories", x => x.PhoneHistoryId);
                    table.ForeignKey(
                        name: "FK_PatientPhoneHistories_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientReferrerLinks",
                columns: table => new
                {
                    ReferrerLinkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerSystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReferrerPatientId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ExternalLabCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExternalPatientId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientReferrerLinks", x => x.ReferrerLinkId);
                    table.ForeignKey(
                        name: "FK_PatientReferrerLinks_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VisitDayGroups",
                columns: table => new
                {
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Day = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PrimaryVisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VisitCount = table.Column<int>(type: "int", nullable: false),
                    CombinedBilling = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitDayGroups", x => x.GroupId);
                    table.ForeignKey(
                        name: "FK_VisitDayGroups_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CriticalContacts",
                columns: table => new
                {
                    ContactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ContactName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalContacts", x => x.ContactId);
                    table.ForeignKey(
                        name: "FK_CriticalContacts_Referrers_ReferrerId",
                        column: x => x.ReferrerId,
                        principalTable: "Referrers",
                        principalColumn: "ReferrerId");
                });

            migrationBuilder.CreateTable(
                name: "Visits",
                columns: table => new
                {
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Token = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    TokenDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Visits", x => x.VisitId);
                    table.ForeignKey(
                        name: "FK_Visits_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Visits_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Visits_Referrers_ReferrerId",
                        column: x => x.ReferrerId,
                        principalTable: "Referrers",
                        principalColumn: "ReferrerId");
                });

            migrationBuilder.CreateTable(
                name: "IMS_TestConsumableMaps",
                columns: table => new
                {
                    MapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuantityPerTest = table.Column<int>(type: "int", nullable: false),
                    UsageType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TestConsumableMaps", x => x.MapId);
                    table.ForeignKey(
                        name: "FK_IMS_TestConsumableMaps_IMS_Consumables_ConsumableId",
                        column: x => x.ConsumableId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TestConsumableMaps_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TestTubeMaps",
                columns: table => new
                {
                    MapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuantityPerSample = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TestTubeMaps", x => x.MapId);
                    table.ForeignKey(
                        name: "FK_IMS_TestTubeMaps_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_TestTubeMaps_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Parameters",
                columns: table => new
                {
                    ParameterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DataType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parameters", x => x.ParameterId);
                    table.ForeignKey(
                        name: "FK_Parameters_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PriceConfigs",
                columns: table => new
                {
                    PriceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    ReferrerRatePercent = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceConfigs", x => x.PriceId);
                    table.ForeignKey(
                        name: "FK_PriceConfigs_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ResourceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.AuditId);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "AutosaveBuffers",
                columns: table => new
                {
                    BufferId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DraftJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SavedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutosaveBuffers", x => x.BufferId);
                    table.ForeignKey(
                        name: "FK_AutosaveBuffers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EditLocks",
                columns: table => new
                {
                    LockId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LockedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LockedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EditLocks", x => x.LockId);
                    table.ForeignKey(
                        name: "FK_EditLocks_Users_LockedByUserId",
                        column: x => x.LockedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Token = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Expires = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Created = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByIp = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Revoked = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RevokedByIp = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReplacedByToken = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReportTemplates",
                columns: table => new
                {
                    TemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    TemplateJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportTemplates", x => x.TemplateId);
                    table.ForeignKey(
                        name: "FK_ReportTemplates_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMS_POItems",
                columns: table => new
                {
                    POItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    POId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderedQuantity = table.Column<int>(type: "int", nullable: false),
                    ReceivedQuantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TaxRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_POItems", x => x.POItemId);
                    table.ForeignKey(
                        name: "FK_IMS_POItems_IMS_PurchaseOrders_POId",
                        column: x => x.POId,
                        principalTable: "IMS_PurchaseOrders",
                        principalColumn: "POId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IMS_POItems_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GrossAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    NetAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Total = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.InvoiceId);
                    table.ForeignKey(
                        name: "FK_Invoices_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.OrderId);
                    table.ForeignKey(
                        name: "FK_Orders_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "TestId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Orders_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Department = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PdfUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SignedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CurrentVersion = table.Column<int>(type: "int", nullable: false),
                    Delivered = table.Column<bool>(type: "bit", nullable: false),
                    DeliveredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_Reports_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reports_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reports_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VisitCancellations",
                columns: table => new
                {
                    CancelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CancelledByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitCancellations", x => x.CancelId);
                    table.ForeignKey(
                        name: "FK_VisitCancellations_Users_CancelledByUserId",
                        column: x => x.CancelledByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VisitCancellations_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReferenceRanges",
                columns: table => new
                {
                    ReferenceRangeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AgeGroup = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AgeMin = table.Column<int>(type: "int", nullable: true),
                    AgeMax = table.Column<int>(type: "int", nullable: true),
                    Sex = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    RefLow = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    RefHigh = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    CriticalLow = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    CriticalHigh = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    TextRange = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceRanges", x => x.ReferenceRangeId);
                    table.ForeignKey(
                        name: "FK_ReferenceRanges_Parameters_ParameterId",
                        column: x => x.ParameterId,
                        principalTable: "Parameters",
                        principalColumn: "ParameterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMS_TubeLots",
                columns: table => new
                {
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LotNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExpiryDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CurrentQuantity = table.Column<int>(type: "int", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    POItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CostPerUnit = table.Column<decimal>(type: "decimal(10,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_TubeLots", x => x.LotId);
                    table.ForeignKey(
                        name: "FK_IMS_TubeLots_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TubeLots_IMS_POItems_POItemId",
                        column: x => x.POItemId,
                        principalTable: "IMS_POItems",
                        principalColumn: "POItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_TubeLots_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CreditNotes",
                columns: table => new
                {
                    CreditNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditNotes", x => x.CreditNoteId);
                    table.ForeignKey(
                        name: "FK_CreditNotes_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "InvoiceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PartialPayments",
                columns: table => new
                {
                    PartialId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Method = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartialPayments", x => x.PartialId);
                    table.ForeignKey(
                        name: "FK_PartialPayments_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "InvoiceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    PaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Method = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReceiptNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReceivedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.PaymentId);
                    table.ForeignKey(
                        name: "FK_Payments_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "InvoiceId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payments_Users_ReceivedByUserId",
                        column: x => x.ReceivedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyStudies",
                columns: table => new
                {
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitTestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AccessionNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsSoftDeleted = table.Column<bool>(type: "bit", nullable: false),
                    AssignedTo = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExternalSystemName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ExternalAccessionNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ExternalStudyInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ExternalViewerUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyStudies", x => x.RadiologyStudyId);
                    table.ForeignKey(
                        name: "FK_RadiologyStudies_Orders_VisitTestId",
                        column: x => x.VisitTestId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RadiologyStudies_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RadiologyStudies_Users_AssignedTo",
                        column: x => x.AssignedTo,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RadiologyStudies_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RadiologyStudies_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Results",
                columns: table => new
                {
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ReferenceRange = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Flag = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    TechComments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EnteredByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnteredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    VerifiedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SupersededByResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Results", x => x.ResultId);
                    table.ForeignKey(
                        name: "FK_Results_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Users_EnteredByUserId",
                        column: x => x.EnteredByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Results_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Results_Users_VerifiedByUserId",
                        column: x => x.VerifiedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Samples",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CollectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsRejected = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Samples", x => x.SampleId);
                    table.ForeignKey(
                        name: "FK_Samples_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Samples_Users_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "DeliveryLogs",
                columns: table => new
                {
                    LogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveryMethod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecipientPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RecipientEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DeliveredBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TrackingInfo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryLogs", x => x.LogId);
                    table.ForeignKey(
                        name: "FK_DeliveryLogs_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeliveryLogs_Users_DeliveredBy",
                        column: x => x.DeliveredBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DownloadLinks",
                columns: table => new
                {
                    LinkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DownloadedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DownloadCount = table.Column<int>(type: "int", nullable: false),
                    MaxDownloads = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DownloadLinks", x => x.LinkId);
                    table.ForeignKey(
                        name: "FK_DownloadLinks_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DownloadLinks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PathologyReports",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PathologistComments = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Interpretation = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Recommendations = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathologyReports", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_PathologyReports_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PathologyReports_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReportAttachments",
                columns: table => new
                {
                    AttachmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportAttachments", x => x.AttachmentId);
                    table.ForeignKey(
                        name: "FK_ReportAttachments_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReportSignatures",
                columns: table => new
                {
                    ReportSignatureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SignatureImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SignatureHash = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ReportVersion = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSignatures", x => x.ReportSignatureId);
                    table.ForeignKey(
                        name: "FK_ReportSignatures_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReportSignatures_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReportVersions",
                columns: table => new
                {
                    ReportVersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VersionNumber = table.Column<int>(type: "int", nullable: false),
                    PdfPath = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SignedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SignedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportVersions", x => x.ReportVersionId);
                    table.ForeignKey(
                        name: "FK_ReportVersions_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReportVersions_Users_SignedByUserId",
                        column: x => x.SignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMS_StockMovements",
                columns: table => new
                {
                    MovementId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TubeLotId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ConsumableId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ConsumableLotId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    MovementType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReferenceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ReasonCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MovedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMS_StockMovements", x => x.MovementId);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_IMS_ConsumableLots_ConsumableLotId",
                        column: x => x.ConsumableLotId,
                        principalTable: "IMS_ConsumableLots",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_IMS_Consumables_ConsumableId",
                        column: x => x.ConsumableId,
                        principalTable: "IMS_Consumables",
                        principalColumn: "ConsumableId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_IMS_TubeLots_TubeLotId",
                        column: x => x.TubeLotId,
                        principalTable: "IMS_TubeLots",
                        principalColumn: "LotId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_IMS_TubeMasters_TubeId",
                        column: x => x.TubeId,
                        principalTable: "IMS_TubeMasters",
                        principalColumn: "TubeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMS_StockMovements_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PacsSeries",
                columns: table => new
                {
                    SeriesId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrgId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StudyInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SeriesInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeriesNumber = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacsSeries", x => x.SeriesId);
                    table.ForeignKey(
                        name: "FK_PacsSeries_RadiologyStudies_RadiologyStudyId",
                        column: x => x.RadiologyStudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PacsSeries_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyImages",
                columns: table => new
                {
                    ImageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ViewLabel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SeriesNumber = table.Column<int>(type: "int", nullable: true),
                    SequenceNumber = table.Column<int>(type: "int", nullable: true),
                    UploadedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UploadedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyImages", x => x.ImageId);
                    table.ForeignKey(
                        name: "FK_RadiologyImages_RadiologyStudies_RadiologyStudyId",
                        column: x => x.RadiologyStudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RadiologyImages_Users_UploadedBy",
                        column: x => x.UploadedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RadiologyReports",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Findings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Impression = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdditionalNotes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RadiologyReports", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_RadiologyReports_RadiologyStudies_RadiologyStudyId",
                        column: x => x.RadiologyStudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RadiologyReports_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "ReportId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CriticalAlerts",
                columns: table => new
                {
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParameterCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CriticalThreshold = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferrerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TriggeredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    NotifiedTo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    NotifiedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AcknowledgedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AcknowledgedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AckMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AckNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EscalatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalAlerts", x => x.AlertId);
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "PatientId");
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Referrers_ReferrerId",
                        column: x => x.ReferrerId,
                        principalTable: "Referrers",
                        principalColumn: "ReferrerId");
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId");
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Users_AcknowledgedByUserId",
                        column: x => x.AcknowledgedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_CriticalAlerts_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "VisitId");
                });

            migrationBuilder.CreateTable(
                name: "DeltaCheckEvents",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousValue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrentValue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeltaPercentage = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeltaCheckEvents", x => x.EventId);
                    table.ForeignKey(
                        name: "FK_DeltaCheckEvents_Results_PreviousResultId",
                        column: x => x.PreviousResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId");
                    table.ForeignKey(
                        name: "FK_DeltaCheckEvents_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeltaCheckEvents_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ResultChangeAudits",
                columns: table => new
                {
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OldValue = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NewValue = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChangedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResultChangeAudits", x => x.AuditId);
                    table.ForeignKey(
                        name: "FK_ResultChangeAudits_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResultChangeAudits_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ResultFlags",
                columns: table => new
                {
                    FlagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FlagType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResultFlags", x => x.FlagId);
                    table.ForeignKey(
                        name: "FK_ResultFlags_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResultLinks",
                columns: table => new
                {
                    LinkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Relation = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LinkedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResultLinks", x => x.LinkId);
                    table.ForeignKey(
                        name: "FK_ResultLinks_Results_FromResultId",
                        column: x => x.FromResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResultLinks_Results_ToResultId",
                        column: x => x.ToResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId");
                });

            migrationBuilder.CreateTable(
                name: "SampleRejections",
                columns: table => new
                {
                    RejectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RequiresRecollection = table.Column<bool>(type: "bit", nullable: false),
                    NewSampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RejectedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SampleRejections", x => x.RejectionId);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_NewSampleId",
                        column: x => x.NewSampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId");
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Users_RejectedByUserId",
                        column: x => x.RejectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryAttempts",
                columns: table => new
                {
                    AttemptId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Attempt = table.Column<int>(type: "int", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResponseData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryAttempts", x => x.AttemptId);
                    table.ForeignKey(
                        name: "FK_DeliveryAttempts_DeliveryLogs_LogId",
                        column: x => x.LogId,
                        principalTable: "DeliveryLogs",
                        principalColumn: "LogId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PacsInstances",
                columns: table => new
                {
                    InstanceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SeriesId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RadiologyStudyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrgId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StudyInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SeriesInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SopInstanceUid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    InstanceNumber = table.Column<int>(type: "int", nullable: true),
                    FrameCount = table.Column<int>(type: "int", nullable: true),
                    FilePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacsInstances", x => x.InstanceId);
                    table.ForeignKey(
                        name: "FK_PacsInstances_PacsSeries_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "PacsSeries",
                        principalColumn: "SeriesId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PacsInstances_RadiologyStudies_RadiologyStudyId",
                        column: x => x.RadiologyStudyId,
                        principalTable: "RadiologyStudies",
                        principalColumn: "RadiologyStudyId");
                    table.ForeignKey(
                        name: "FK_PacsInstances_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CriticalAudits",
                columns: table => new
                {
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ActedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ActedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CriticalAudits", x => x.AuditId);
                    table.ForeignKey(
                        name: "FK_CriticalAudits_CriticalAlerts_AlertId",
                        column: x => x.AlertId,
                        principalTable: "CriticalAlerts",
                        principalColumn: "AlertId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CriticalAudits_Users_ActedByUserId",
                        column: x => x.ActedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientId",
                table: "Appointments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ScheduledFor_Department",
                table: "Appointments",
                columns: new[] { "ScheduledFor", "Department" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorUserId",
                table: "AuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AutosaveBuffers_UserId_EntityType_EntityId",
                table: "AutosaveBuffers",
                columns: new[] { "UserId", "EntityType", "EntityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_Name",
                table: "Branches",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_InvoiceId",
                table: "CreditNotes",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_AcknowledgedByUserId",
                table: "CriticalAlerts",
                column: "AcknowledgedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_PatientId",
                table: "CriticalAlerts",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_ReferrerId",
                table: "CriticalAlerts",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_ResultId",
                table: "CriticalAlerts",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_Status",
                table: "CriticalAlerts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAlerts_VisitId",
                table: "CriticalAlerts",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAudits_ActedByUserId",
                table: "CriticalAudits",
                column: "ActedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalAudits_AlertId",
                table: "CriticalAudits",
                column: "AlertId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalContacts_ReferrerId",
                table: "CriticalContacts",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_CriticalRules_ParameterCode",
                table: "CriticalRules",
                column: "ParameterCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryAttempts_LogId",
                table: "DeliveryAttempts",
                column: "LogId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryLogs_DeliveredAt",
                table: "DeliveryLogs",
                column: "DeliveredAt");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryLogs_DeliveredBy",
                table: "DeliveryLogs",
                column: "DeliveredBy");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryLogs_ReportId",
                table: "DeliveryLogs",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckConfigs_ParameterCode",
                table: "DeltaCheckConfigs",
                column: "ParameterCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckEvents_PreviousResultId",
                table: "DeltaCheckEvents",
                column: "PreviousResultId");

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckEvents_ResultId",
                table: "DeltaCheckEvents",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_DeltaCheckEvents_ReviewedByUserId",
                table: "DeltaCheckEvents",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DeptScopePolicies_RoleId_Dept",
                table: "DeptScopePolicies",
                columns: new[] { "RoleId", "Dept" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DownloadLinks_CreatedBy",
                table: "DownloadLinks",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_DownloadLinks_ReportId",
                table: "DownloadLinks",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_DownloadLinks_Token",
                table: "DownloadLinks",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_EntityType_EntityId",
                table: "EditLocks",
                columns: new[] { "EntityType", "EntityId" },
                unique: true,
                filter: "[Status] = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_ExpiresAt",
                table: "EditLocks",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_LockedByUserId",
                table: "EditLocks",
                column: "LockedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_ConsumableLots_BranchId",
                table: "IMS_ConsumableLots",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_ConsumableLots_ConsumableId",
                table: "IMS_ConsumableLots",
                column: "ConsumableId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_ConsumableLots_LegacyTubeLotId",
                table: "IMS_ConsumableLots",
                column: "LegacyTubeLotId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_Consumables_Code",
                table: "IMS_Consumables",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_Consumables_LegacyTubeId",
                table: "IMS_Consumables",
                column: "LegacyTubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_POItems_POId",
                table: "IMS_POItems",
                column: "POId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_POItems_TubeId",
                table: "IMS_POItems",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_PurchaseOrders_SupplierId",
                table: "IMS_PurchaseOrders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_ConsumableId",
                table: "IMS_StockMovements",
                column: "ConsumableId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_ConsumableLotId",
                table: "IMS_StockMovements",
                column: "ConsumableLotId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_RecordedByUserId",
                table: "IMS_StockMovements",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_ReferenceId",
                table: "IMS_StockMovements",
                column: "ReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_TubeId",
                table: "IMS_StockMovements",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_StockMovements_TubeLotId",
                table: "IMS_StockMovements",
                column: "TubeLotId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_Suppliers_Name",
                table: "IMS_Suppliers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TestConsumableMaps_ConsumableId",
                table: "IMS_TestConsumableMaps",
                column: "ConsumableId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TestConsumableMaps_TestId_ConsumableId_UsageType",
                table: "IMS_TestConsumableMaps",
                columns: new[] { "TestId", "ConsumableId", "UsageType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TestTubeMaps_TestId_TubeId",
                table: "IMS_TestTubeMaps",
                columns: new[] { "TestId", "TubeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TestTubeMaps_TubeId",
                table: "IMS_TestTubeMaps",
                column: "TubeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeLots_BranchId",
                table: "IMS_TubeLots",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeLots_POItemId",
                table: "IMS_TubeLots",
                column: "POItemId");

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeLots_TubeId_BranchId_LotNumber",
                table: "IMS_TubeLots",
                columns: new[] { "TubeId", "BranchId", "LotNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMS_TubeMasters_Code",
                table: "IMS_TubeMasters",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_Status",
                table: "Invoices",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_VisitId",
                table: "Invoices",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_AnalyzerId",
                table: "LabAnalyzerResultInbox",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_OrderId",
                table: "LabAnalyzerResultInbox",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_PatientIdentifier",
                table: "LabAnalyzerResultInbox",
                column: "PatientIdentifier");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_ReceivedAt",
                table: "LabAnalyzerResultInbox",
                column: "ReceivedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_Status",
                table: "LabAnalyzerResultInbox",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerResultInbox_VisitId",
                table: "LabAnalyzerResultInbox",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzers_BranchId",
                table: "LabAnalyzers",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzers_OrgId",
                table: "LabAnalyzers",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerId",
                table: "LabAnalyzerTestMappings",
                column: "AnalyzerId");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerId_AnalyzerTestCode",
                table: "LabAnalyzerTestMappings",
                columns: new[] { "AnalyzerId", "AnalyzerTestCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_AnalyzerTestCode",
                table: "LabAnalyzerTestMappings",
                column: "AnalyzerTestCode");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_IsEnabled",
                table: "LabAnalyzerTestMappings",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_LabAnalyzerTestMappings_SynosTestCode",
                table: "LabAnalyzerTestMappings",
                column: "SynosTestCode");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationQueues_NextRetryAt",
                table: "NotificationQueues",
                column: "NextRetryAt");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationQueues_Status",
                table: "NotificationQueues",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_TestCode",
                table: "Orders",
                column: "TestCode");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_TestId",
                table: "Orders",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_VisitId",
                table: "Orders",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_CreatedBy",
                table: "PacsInstances",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_RadiologyStudyId",
                table: "PacsInstances",
                column: "RadiologyStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_PacsInstances_SeriesId_SopInstanceUid",
                table: "PacsInstances",
                columns: new[] { "SeriesId", "SopInstanceUid" });

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_CreatedBy",
                table: "PacsSeries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PacsSeries_RadiologyStudyId_StudyInstanceUid_SeriesInstanceUid",
                table: "PacsSeries",
                columns: new[] { "RadiologyStudyId", "StudyInstanceUid", "SeriesInstanceUid" });

            migrationBuilder.CreateIndex(
                name: "IX_Parameters_TestId_ParameterCode",
                table: "Parameters",
                columns: new[] { "TestId", "ParameterCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartialPayments_InvoiceId",
                table: "PartialPayments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_PathologyReports_OrderId",
                table: "PathologyReports",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientAliases_PatientId",
                table: "PatientAliases",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientPhoneHistories_PatientId",
                table: "PatientPhoneHistories",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientPhoneHistories_PhoneNumber",
                table: "PatientPhoneHistories",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_PatientReferrerLinks_ExternalLabCode_ExternalPatientId",
                table: "PatientReferrerLinks",
                columns: new[] { "ExternalLabCode", "ExternalPatientId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientReferrerLinks_PatientId",
                table: "PatientReferrerLinks",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_CurrentPhoneNumber",
                table: "Patients",
                column: "CurrentPhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_MRN",
                table: "Patients",
                column: "MRN",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InvoiceId",
                table: "Payments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ReceiptNo",
                table: "Payments",
                column: "ReceiptNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ReceivedByUserId",
                table: "Payments",
                column: "ReceivedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceConfigs_TestId",
                table: "PriceConfigs",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyImages_RadiologyStudyId",
                table: "RadiologyImages",
                column: "RadiologyStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyImages_UploadedBy",
                table: "RadiologyImages",
                column: "UploadedBy");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyReports_RadiologyStudyId",
                table: "RadiologyReports",
                column: "RadiologyStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_AssignedTo",
                table: "RadiologyStudies",
                column: "AssignedTo");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_CreatedBy",
                table: "RadiologyStudies",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_PatientId",
                table: "RadiologyStudies",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_VisitId",
                table: "RadiologyStudies",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_RadiologyStudies_VisitTestId",
                table: "RadiologyStudies",
                column: "VisitTestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceRanges_ParameterId_AgeGroup_Sex",
                table: "ReferenceRanges",
                columns: new[] { "ParameterId", "AgeGroup", "Sex" });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportAttachments_ReportId",
                table: "ReportAttachments",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_PatientId",
                table: "Reports",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_SignedByUserId",
                table: "Reports",
                column: "SignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_SourceType_SourceId",
                table: "Reports",
                columns: new[] { "SourceType", "SourceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reports_VisitId",
                table: "Reports",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportSignatures_ReportId",
                table: "ReportSignatures",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportSignatures_SignedByUserId",
                table: "ReportSignatures",
                column: "SignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_CreatedBy",
                table: "ReportTemplates",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_IsDefault",
                table: "ReportTemplates",
                column: "IsDefault",
                filter: "[IsDefault] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_IsDeleted",
                table: "ReportTemplates",
                column: "IsDeleted",
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_IsPublished",
                table: "ReportTemplates",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_Modality",
                table: "ReportTemplates",
                column: "Modality");

            migrationBuilder.CreateIndex(
                name: "IX_ReportTemplates_Name",
                table: "ReportTemplates",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportVersions_ReportId_VersionNumber",
                table: "ReportVersions",
                columns: new[] { "ReportId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportVersions_SignedByUserId",
                table: "ReportVersions",
                column: "SignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultChangeAudits_ChangedByUserId",
                table: "ResultChangeAudits",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultChangeAudits_ResultId",
                table: "ResultChangeAudits",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultChangeAudits_ResultId_ChangedAt",
                table: "ResultChangeAudits",
                columns: new[] { "ResultId", "ChangedAt" },
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_ResultFlags_ResultId",
                table: "ResultFlags",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultLinks_FromResultId",
                table: "ResultLinks",
                column: "FromResultId");

            migrationBuilder.CreateIndex(
                name: "IX_ResultLinks_ToResultId",
                table: "ResultLinks",
                column: "ToResultId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_EnteredByUserId",
                table: "Results",
                column: "EnteredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_OrderId_ParameterCode",
                table: "Results",
                columns: new[] { "OrderId", "ParameterCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Results_SignedByUserId",
                table: "Results",
                column: "SignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_VerifiedByUserId",
                table: "Results",
                column: "VerifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_NewSampleId",
                table: "SampleRejections",
                column: "NewSampleId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_RejectedByUserId",
                table: "SampleRejections",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_SampleId",
                table: "SampleRejections",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_Barcode",
                table: "Samples",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Samples_CollectedByUserId",
                table: "Samples",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_OrderId",
                table: "Samples",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_TestDefinitions_TestCode",
                table: "TestDefinitions",
                column: "TestCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tests_TestCode",
                table: "Tests",
                column: "TestCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TokenCounters_Day_Department",
                table: "TokenCounters",
                columns: new[] { "Day", "Department" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VisitCancellations_CancelledByUserId",
                table: "VisitCancellations",
                column: "CancelledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitCancellations_VisitId",
                table: "VisitCancellations",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitDayGroups_PatientId_Day",
                table: "VisitDayGroups",
                columns: new[] { "PatientId", "Day" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Visits_BranchId",
                table: "Visits",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_PatientId",
                table: "Visits",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_ReferrerId",
                table: "Visits",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_TokenDate_Department",
                table: "Visits",
                columns: new[] { "TokenDate", "Department" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccessionCounters");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "AutosaveBuffers");

            migrationBuilder.DropTable(
                name: "CreditNotes");

            migrationBuilder.DropTable(
                name: "CriticalAudits");

            migrationBuilder.DropTable(
                name: "CriticalContacts");

            migrationBuilder.DropTable(
                name: "CriticalRules");

            migrationBuilder.DropTable(
                name: "DeliveryAttempts");

            migrationBuilder.DropTable(
                name: "DeltaCheckConfigs");

            migrationBuilder.DropTable(
                name: "DeltaCheckEvents");

            migrationBuilder.DropTable(
                name: "DeptScopePolicies");

            migrationBuilder.DropTable(
                name: "DownloadLinks");

            migrationBuilder.DropTable(
                name: "EditLocks");

            migrationBuilder.DropTable(
                name: "IMS_StockMovements");

            migrationBuilder.DropTable(
                name: "IMS_TestConsumableMaps");

            migrationBuilder.DropTable(
                name: "IMS_TestTubeMaps");

            migrationBuilder.DropTable(
                name: "LabAnalyzerResultInbox");

            migrationBuilder.DropTable(
                name: "LabAnalyzerTestMappings");

            migrationBuilder.DropTable(
                name: "NotificationQueues");

            migrationBuilder.DropTable(
                name: "PacsInstances");

            migrationBuilder.DropTable(
                name: "PartialPayments");

            migrationBuilder.DropTable(
                name: "PathologyReports");

            migrationBuilder.DropTable(
                name: "PatientAliases");

            migrationBuilder.DropTable(
                name: "PatientPhoneHistories");

            migrationBuilder.DropTable(
                name: "PatientReferrerLinks");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "PriceConfigs");

            migrationBuilder.DropTable(
                name: "RadiologyImages");

            migrationBuilder.DropTable(
                name: "RadiologyReports");

            migrationBuilder.DropTable(
                name: "ReferenceRanges");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "ReportAttachments");

            migrationBuilder.DropTable(
                name: "ReportSignatures");

            migrationBuilder.DropTable(
                name: "ReportTemplates");

            migrationBuilder.DropTable(
                name: "ReportVersions");

            migrationBuilder.DropTable(
                name: "ResultChangeAudits");

            migrationBuilder.DropTable(
                name: "ResultFlags");

            migrationBuilder.DropTable(
                name: "ResultLinks");

            migrationBuilder.DropTable(
                name: "SampleRejections");

            migrationBuilder.DropTable(
                name: "TestDefinitions");

            migrationBuilder.DropTable(
                name: "TokenCounters");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "VisitCancellations");

            migrationBuilder.DropTable(
                name: "VisitDayGroups");

            migrationBuilder.DropTable(
                name: "CriticalAlerts");

            migrationBuilder.DropTable(
                name: "DeliveryLogs");

            migrationBuilder.DropTable(
                name: "IMS_ConsumableLots");

            migrationBuilder.DropTable(
                name: "IMS_TubeLots");

            migrationBuilder.DropTable(
                name: "LabAnalyzers");

            migrationBuilder.DropTable(
                name: "PacsSeries");

            migrationBuilder.DropTable(
                name: "Invoices");

            migrationBuilder.DropTable(
                name: "Parameters");

            migrationBuilder.DropTable(
                name: "Samples");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Results");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "IMS_Consumables");

            migrationBuilder.DropTable(
                name: "IMS_POItems");

            migrationBuilder.DropTable(
                name: "RadiologyStudies");

            migrationBuilder.DropTable(
                name: "IMS_PurchaseOrders");

            migrationBuilder.DropTable(
                name: "IMS_TubeMasters");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "IMS_Suppliers");

            migrationBuilder.DropTable(
                name: "Tests");

            migrationBuilder.DropTable(
                name: "Visits");

            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.DropTable(
                name: "Referrers");
        }
    }
}
