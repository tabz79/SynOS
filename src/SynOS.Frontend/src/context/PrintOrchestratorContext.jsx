import React, { createContext, useContext, useEffect, useRef } from 'react';
import { BranchOperationsSignalRService } from '../lib/signalr';
import { useAuth } from './AuthContext';
import { generateThermalInvoiceHtml, generateThermalSlipHtml } from '../utils/thermalPrinter';

const PrintOrchestratorContext = createContext();

export const usePrintOrchestrator = () => useContext(PrintOrchestratorContext);

export const PrintOrchestratorProvider = ({ children }) => {
    const { user } = useAuth();

    // In-memory ledger to protect against duplicate SignalR reconnections 
    // emitting the same printed receipt.
    const printLedger = useRef(new Set());

    useEffect(() => {
        if (!user || !user.branchId) return;

        // Terminal identifier should be persistent per machine.
        // In Electron, we can get this via IPC, but for web fallback we use localStorage
        let terminalId = localStorage.getItem('synos_terminal_id');
        if (!terminalId) {
            terminalId = `web-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('synos_terminal_id', terminalId);
        }

        let isMounted = true;

        const connectToBranchHub = async () => {
            try {
                // Request Terminal Registration for Thermal80mm capability
                await BranchOperationsSignalRService.startConnection(
                    user.branchId,
                    terminalId,
                    ["Thermal80mm"]
                );

                if (!isMounted) return;

                // Subscribe to Print Thermal Receipt Commands from Backend
                BranchOperationsSignalRService.onPrintThermalReceipt(async (eventPayload) => {
                    if (printLedger.current.has(eventPayload.EventId)) {
                        console.warn(`Idempotency Block: Thermal receipt for Event ${eventPayload.EventId} already spooled. Ignored duplicate.`);
                        return;
                    }

                    // Mark as processed
                    printLedger.current.add(eventPayload.EventId);

                    console.log("PrintOrchestrator: Processing PrintThermalReceiptEvent", eventPayload);

                    if (window.api && window.api.printLabel) {
                        try {
                            // Backend decides this terminal is Lead. We simply execute.
                            // Assuming backend configured a specific OS Printer or fallback to default
                            const config = await window.api.invoke('get-terminal-printer-config');
                            const printerName = config?.ReceiptPrinterName || ""; // Leave empty for OS default if null

                            const invoiceHtml = generateThermalInvoiceHtml(eventPayload);
                            // We can generate and print a patient registration slip as well if needed
                            // const slipHtml = generateThermalSlipHtml(eventPayload);

                            window.api.printLabel({ printerName, html: invoiceHtml });

                            // If slip needed:
                            // window.api.printLabel({ printerName, html: slipHtml });
                        } catch (err) {
                            console.error("PrintOrchestrator: Failed to spool print to Electron IPC", err);
                        }
                    } else {
                        console.warn("PrintOrchestrator: Received print command, but not running in Electron. Web printing fallback not yet implemented.", eventPayload);
                    }
                });

            } catch (err) {
                console.error("PrintOrchestrator: SignalR connection error:", err);
            }
        };

        connectToBranchHub();

        return () => {
            isMounted = false;
            BranchOperationsSignalRService.stopConnection();
        };
    }, [user]);

    return (
        <PrintOrchestratorContext.Provider value={{}}>
            {children}
        </PrintOrchestratorContext.Provider>
    );
};
