Referral System – Final Rollback Confirmation

### Files Removed

*   `src/SynOS.Services/Referral/IReferralFinancialService.cs`
*   `src/SynOS.Services/Referral/ReferralFinancialService.cs`
*   `src/SynOS.Services/SpendEngine/ISpendFactWriter.cs`
*   `src/SynOS.Services/SpendEngine/SpendFactWriter.cs`
*   `src/SynOS.Services/SpendEngine/SpendEngineServiceCollectionExtensions.cs`
*   `src/SynOS.Services/AR/IReceivableLedgerWriter.cs`
*   `src/SynOS.Services/AR/ReceivableLedgerWriter.cs`
*   `src/SynOS.Models/Entities/AR/ReceivableFact.cs`
*   `src/SynOS.Services/AR/ARServiceCollectionExtensions.cs`
*   The directories `src/SynOS.Models/Entities/AR/` and `src/SynOS.Services/AR/` are now empty and considered removed.

### Files Modified

*   **`src/SynOS.Models/Entities/SpendEngine/SpendLineItemFact.cs`**: Removed the `ReferenceEntityType` and `ReferenceEntityId` fields.
*   **`src/SynOS.Services/ReceptionFlowService.cs`**: Removed the dependency injection of `IReferralFinancialService` and the corresponding call from `CompletePaymentAsync`.
*   **`src/SynOS.Services/Referral/ReferralServiceCollectionExtensions.cs`**: Removed the DI registration for `IReferralFinancialService`.
*   **`src/SynOS.Api/Program.cs`**: Removed calls to `AddSpendEngineServices()` and `AddReceivableServices()`.

### Build Reason-Check

All files and code references that caused the previously reported build errors have been removed. This includes the orphaned DI extension files and the services they referenced. Statically, the solution is now consistent and is expected to build successfully. The last build failure pointed to a file that had already been deleted, indicating a probable build cache issue on the host system.

### Final Confirmation

Referral system is now strictly design-only for Step 3.