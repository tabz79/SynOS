import { HubConnectionBuilder, LogLevel, HttpTransportType, HubConnectionState } from '@microsoft/signalr';

let connection = null;
let connectionPromise = null;
let subscriberCount = 0;
let stopTimer = null;

export const SignalRService = {
    _getConnection: () => {
        if (!connection) {
            connection = new HubConnectionBuilder()
                .withUrl("/dashboardHub", {
                    accessTokenFactory: () => localStorage.getItem('synos_jwt'),
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();
        }
        return connection;
    },

    /**
     * Initializes and starts the SignalR connection.
     * Uses Reference Counting to handle React Strict Mode.
     * @returns {Promise<void>}
     */
    startConnection: async () => {
        subscriberCount++;
        console.log(`SignalR: Subscriber added (Total: ${subscriberCount})`);

        if (stopTimer) {
            clearTimeout(stopTimer);
            stopTimer = null;
            console.log("SignalR: Aborted scheduled disconnect");
        }

        const token = localStorage.getItem('synos_jwt');
        if (!token) return;

        const conn = SignalRService._getConnection();

        if (conn.state === HubConnectionState.Connected) {
            return;
        }

        if (connectionPromise) {
            return connectionPromise;
        }

        console.log("SignalR: Starting connection...");
        connectionPromise = conn.start()
            .then(() => {
                console.log("SignalR: Connected to /dashboardHub");
                SignalRService._notifyStatusChange("Synced");
                connectionPromise = null;

                conn.onclose(() => {
                    console.log("SignalR: Connection Closed");
                    SignalRService._notifyStatusChange("Not Synced");
                });

                conn.onreconnecting(() => {
                    console.log("SignalR: Reconnecting...");
                    SignalRService._notifyStatusChange("Reconnecting");
                });

                conn.onreconnected(() => {
                    console.log("SignalR: Reconnected");
                    SignalRService._notifyStatusChange("Synced");
                });
            })
            .catch(err => {
                console.error("SignalR: Connection Failed:", err);
                SignalRService._notifyStatusChange("Not Synced");
                connectionPromise = null;
            });

        return connectionPromise;
    },

    onReceptionSummaryUpdated: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("ReceptionSummaryUpdated");
        conn.on("ReceptionSummaryUpdated", (payload) => {
            console.log("SignalR: ReceptionSummaryUpdated received", payload);
            callback(payload);
        });
    },

    onIntakeSnapshotUpdated: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("ReceptionIntakeUpdated");
        conn.on("ReceptionIntakeUpdated", (snapshot) => {
            console.log("SignalR: ReceptionIntakeUpdated received", snapshot);
            callback(snapshot);
        });
    },

    onActionQueueUpdated: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("ActionQueueUpdated");
        conn.on("ActionQueueUpdated", () => {
            console.log("SignalR: ActionQueueUpdated received (Thundering Herd Fallback)");
            callback();
        });
    },

    onActionQueueDeltaReceived: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("ActionQueueDeltaReceived");
        conn.on("ActionQueueDeltaReceived", (deltaRow) => {
            console.log("SignalR: ActionQueueDeltaReceived received", deltaRow?.token || deltaRow?.Token);
            callback(deltaRow);
        });
    },

    onAssignmentUpdateReceived: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("AssignmentUpdateReceived");
        conn.on("AssignmentUpdateReceived", (payload) => {
            console.log("SignalR: AssignmentUpdateReceived received", payload);
            callback(payload);
        });
    },
    
    onInventoryShortageReceived: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("InventoryShortageReceived");
        conn.on("InventoryShortageReceived", (payload) => {
            console.log("SignalR: InventoryShortageReceived received", payload);
            callback(payload);
        });
    },

    onReceiveServerTime: (callback) => {
        const conn = SignalRService._getConnection();
        conn.off("ReceiveServerTime");
        conn.on("ReceiveServerTime", (serverTime) => {
            console.log("SignalR: ReceiveServerTime received", serverTime);
            callback(serverTime);
        });
        // Aliases for casing
        conn.on("receiveservertime", (st) => callback(st));
        conn.on("receiveServerTime", (st) => callback(st));
    },

    onConnectionStatusChanged: (callback) => {
        if (!window._signalrStatusSubscribers) window._signalrStatusSubscribers = [];
        window._signalrStatusSubscribers.push(callback);

        const conn = SignalRService._getConnection();
        const state = conn.state === HubConnectionState.Connected ? "Synced" : "Not Synced";
        callback(state);
    },

    _notifyStatusChange: (status) => {
        if (window._signalrStatusSubscribers) {
            window._signalrStatusSubscribers.forEach(cb => cb(status));
        }
    },

    stopConnection: async () => {
        subscriberCount--;
        console.log(`SignalR: Subscriber removed (Total: ${subscriberCount})`);

        if (subscriberCount <= 0) {
            subscriberCount = 0;

            if (stopTimer) clearTimeout(stopTimer);

            stopTimer = setTimeout(async () => {
                if (subscriberCount > 0) return;

                console.log("SignalR: No subscribers, disconnecting...");
                if (connection) {
                    try {
                        if (connectionPromise) await connectionPromise;
                        await connection.stop();
                        console.log("SignalR: Disconnected");
                    } catch (err) {
                        console.error("SignalR: Error stopping connection:", err);
                    } finally {
                        connectionPromise = null;
                        stopTimer = null;
                        // Keep connection object for potential restart
                    }
                }
            }, 2000);
        }
    }
};

let branchConnection = null;
let branchConnectionPromise = null;
let branchSubscriberCount = 0;
let branchStopTimer = null;

export const BranchOperationsSignalRService = {
    _getConnection: () => {
        if (!branchConnection) {
            branchConnection = new HubConnectionBuilder()
                .withUrl("/branchOperationsHub", {
                    accessTokenFactory: () => localStorage.getItem('synos_jwt'),
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            // Register default listeners here to ensure they exist before start() is called,
            // preventing "No client method with the name 'capabilityregistered' found" warnings in browser.
            branchConnection.on("CapabilityRegistered", (capability, isAuthorized) => {
                console.log(`SignalR(Branch): Capability '${capability}' registration result: ${isAuthorized ? "AUTHORIZED" : "DENIED"}`);
                if (window._onCapabilityRegisteredHandler) {
                    window._onCapabilityRegisteredHandler(capability, isAuthorized);
                }
            });
            branchConnection.on("capabilityregistered", (capability, isAuthorized) => {
                if (window._onCapabilityRegisteredHandler) {
                    window._onCapabilityRegisteredHandler(capability, isAuthorized);
                }
            });
            branchConnection.on("capabilityRegistered", (capability, isAuthorized) => {
                if (window._onCapabilityRegisteredHandler) {
                    window._onCapabilityRegisteredHandler(capability, isAuthorized);
                }
            });
            branchConnection.on("OnPrintThermalReceipt", (payload) => {
                console.log("SignalR(Branch): OnPrintThermalReceipt received", payload);
                if (window._onPrintThermalReceiptHandler) {
                    window._onPrintThermalReceiptHandler(payload);
                }
            });
        }
        return branchConnection;
    },

    startConnection: async (branchId, terminalId, capabilities) => {
        branchSubscriberCount++;
        console.log(`SignalR(Branch): Subscriber added (Total: ${branchSubscriberCount})`);

        if (branchStopTimer) {
            clearTimeout(branchStopTimer);
            branchStopTimer = null;
            console.log("SignalR(Branch): Aborted scheduled disconnect");
        }

        const token = localStorage.getItem('synos_jwt');
        if (!token) return;

        const conn = BranchOperationsSignalRService._getConnection();

        if (conn.state === HubConnectionState.Connected) {
            return;
        }

        if (branchConnectionPromise) {
            return branchConnectionPromise;
        }

        console.log("SignalR(Branch): Starting connection...");
        branchConnectionPromise = conn.start()
            .then(async () => {
                console.log("SignalR(Branch): Connected to /branchOperationsHub");
                branchConnectionPromise = null;

                // Register Capabilities immediately upon connecting
                for (const cap of capabilities) {
                    try {
                        await conn.invoke("RegisterCapability", branchId, terminalId, cap);
                    } catch (err) {
                        console.error(`SignalR(Branch): Failed to register capability ${cap}`, err);
                    }
                }

                conn.onclose(() => console.log("SignalR(Branch): Connection Closed"));
                conn.onreconnecting(() => console.log("SignalR(Branch): Reconnecting..."));
                conn.onreconnected(async () => {
                    console.log("SignalR(Branch): Reconnected. Re-registering capabilities...");
                    for (const cap of capabilities) {
                        try {
                            await conn.invoke("RegisterCapability", branchId, terminalId, cap);
                        } catch (err) {
                            console.error(`SignalR(Branch): Failed to re-register capability ${cap}`, err);
                        }
                    }
                });
            })
            .catch(err => {
                console.error("SignalR(Branch): Connection Failed:", err);
                branchConnectionPromise = null;
            });

        return branchConnectionPromise;
    },

    onCapabilityRegistered: (callback) => {
        window._onCapabilityRegisteredHandler = callback;
    },

    onPrintThermalReceipt: (callback) => {
        window._onPrintThermalReceiptHandler = callback;
    },

    stopConnection: async () => {
        branchSubscriberCount--;
        console.log(`SignalR(Branch): Subscriber removed (Total: ${branchSubscriberCount})`);

        if (branchSubscriberCount <= 0) {
            branchSubscriberCount = 0;
            if (branchStopTimer) clearTimeout(branchStopTimer);

            branchStopTimer = setTimeout(async () => {
                if (branchSubscriberCount > 0) return;
                console.log("SignalR(Branch): No subscribers, disconnecting...");
                if (branchConnection) {
                    try {
                        if (branchConnectionPromise) await branchConnectionPromise;
                        await branchConnection.stop();
                        console.log("SignalR(Branch): Disconnected");
                    } catch (err) {
                        console.error("SignalR(Branch): Error stopping connection:", err);
                    } finally {
                        branchConnectionPromise = null;
                        branchStopTimer = null;
                    }
                }
            }, 2000);
        }
    }
};
