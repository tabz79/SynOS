import { HubConnectionBuilder, LogLevel, HttpTransportType, HubConnectionState } from '@microsoft/signalr';

let connection = null;
let connectionPromise = null;
let subscriberCount = 0;
let stopTimer = null;

export const SignalRService = {
    /**
     * Initializes and starts the SignalR connection.
     * Uses Reference Counting to handle React Strict Mode.
     * @returns {Promise<void>}
     */
    startConnection: async () => {
        subscriberCount++;
        console.log(`SignalR: Subscriber added (Total: ${subscriberCount})`);

        // If a stop was scheduled, cancel it (We are still needed!)
        if (stopTimer) {
            clearTimeout(stopTimer);
            stopTimer = null;
            console.log("SignalR: Aborted scheduled disconnect");
        }

        const token = localStorage.getItem('synos_jwt');
        if (!token) return;

        // If already connected, just return existing state
        if (connection?.state === HubConnectionState.Connected) {
            return;
        }

        // If currently connecting, join the wait
        if (connectionPromise) {
            return connectionPromise;
        }

        // Create new connection if needed
        if (!connection) {
            connection = new HubConnectionBuilder()
                .withUrl("/dashboardHub", {
                    // FIX: Read directly from storage to avoid stale closure
                    accessTokenFactory: () => localStorage.getItem('synos_jwt'),
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();
        }

        // Start connection
        console.log("SignalR: Starting connection...");
        connectionPromise = connection.start()
            .then(() => {
                console.log("SignalR: Connected to /dashboardHub");
                SignalRService._notifyStatusChange("Synced");
                connectionPromise = null;

                // Wire up lifecycle events
                connection.onclose(() => {
                    console.log("SignalR: Connection Closed");
                    SignalRService._notifyStatusChange("Not Synced");
                });

                connection.onreconnecting(() => {
                    console.log("SignalR: Reconnecting...");
                    SignalRService._notifyStatusChange("Reconnecting");
                });

                connection.onreconnected(() => {
                    console.log("SignalR: Reconnected");
                    SignalRService._notifyStatusChange("Synced");
                });
            })
            .catch(err => {
                console.error("SignalR: Connection Failed:", err);
                SignalRService._notifyStatusChange("Not Synced");
                connectionPromise = null;
                // Don't nullify connection object here, allow retry
            });

        return connectionPromise;
    },

    /**
     * Subscribes to the Reception Summary updates.
     * @param {Function} callback - (payload) => void
     */
    onReceptionSummaryUpdated: (callback) => {
        if (!connection) return;
        connection.off("ReceptionSummaryUpdated");
        connection.on("ReceptionSummaryUpdated", (payload) => {
            console.log("SignalR: ReceptionSummaryUpdated received", payload);
            callback(payload);
        });
    },

    /**
     * Subscribes to the Intake Snapshot updates.
     * @param {Function} callback - (snapshot) => void
     */
    onIntakeSnapshotUpdated: (callback) => {
        if (!connection) return;
        // Clean up previous listeners to avoid duplicates
        connection.off("ReceptionIntakeUpdated");

        connection.on("ReceptionIntakeUpdated", (snapshot) => {
            console.log("SignalR: ReceptionIntakeUpdated received", snapshot);
            callback(snapshot);
        });
    },

    /**
     * Subscribes to Action Queue updates.
     * @param {Function} callback - () => void
     */
    onActionQueueUpdated: (callback) => {
        if (!connection) return;
        connection.off("ActionQueueUpdated");
        connection.on("ActionQueueUpdated", () => {
            console.log("SignalR: ActionQueueUpdated received");
            callback();
        });
    },

    /**
     * Subscribes to Server Time updates (Anchor).
     * @param {Function} callback - (serverTime) => void
     */
    onReceiveServerTime: (callback) => {
        if (!connection) return;
        connection.off("ReceiveServerTime");
        connection.on("ReceiveServerTime", (serverTime) => {
            console.log("SignalR: ReceiveServerTime received", serverTime);
            callback(serverTime);
        });
    },

    /**
     * Subscribes to Connection Status changes.
     * @param {Function} callback - (status) => void ("Synced" | "Reconnecting" | "Not Synced")
     */
    onConnectionStatusChanged: (callback) => {
        // Store callback globally or handled via internal eventing? 
        // Simplest: just assign to a property we call internally.
        // For multiple subscribers, we need an array.
        if (!window._signalrStatusSubscribers) window._signalrStatusSubscribers = [];
        window._signalrStatusSubscribers.push(callback);

        // Emit current state immediately
        const state = connection?.state === HubConnectionState.Connected ? "Synced" : "Not Synced";
        callback(state);
    },

    _notifyStatusChange: (status) => {
        if (window._signalrStatusSubscribers) {
            window._signalrStatusSubscribers.forEach(cb => cb(status));
        }
    },

    /**
     * Stops the connection with a grace period.
     * Only actually disconnects if no subscribers remain after delay.
     */
    stopConnection: async () => {
        subscriberCount--;
        console.log(`SignalR: Subscriber removed (Total: ${subscriberCount})`);

        if (subscriberCount <= 0) {
            subscriberCount = 0; // Safety clamp

            // Schedule disconnect in future to allow React Strict Mode 
            // to remount immediately without killing the socket
            if (stopTimer) clearTimeout(stopTimer);

            stopTimer = setTimeout(async () => {
                if (subscriberCount > 0) return; // Saved at the buzzer!

                console.log("SignalR: No subscribers, disconnecting...");
                if (connection) {
                    try {
                        // Wait for any pending start
                        if (connectionPromise) await connectionPromise;

                        await connection.stop();
                        console.log("SignalR: Disconnected");
                    } catch (err) {
                        console.error("SignalR: Error stopping connection:", err);
                    } finally {
                        connectionPromise = null;
                        stopTimer = null;
                    }
                }
            }, 2000); // 2 second grace period
        }
    }
};

let branchConnection = null;
let branchConnectionPromise = null;
let branchSubscriberCount = 0;
let branchStopTimer = null;

export const BranchOperationsSignalRService = {
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

        if (branchConnection?.state === HubConnectionState.Connected) {
            return;
        }

        if (branchConnectionPromise) {
            return branchConnectionPromise;
        }

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
        }

        console.log("SignalR(Branch): Starting connection...");
        branchConnectionPromise = branchConnection.start()
            .then(async () => {
                console.log("SignalR(Branch): Connected to /branchOperationsHub");
                branchConnectionPromise = null;

                // Register Capabilities immediately upon connecting
                for (const cap of capabilities) {
                    try {
                        await branchConnection.invoke("RegisterCapability", branchId, terminalId, cap);
                    } catch (err) {
                        console.error(`SignalR(Branch): Failed to register capability ${cap}`, err);
                    }
                }

                branchConnection.onclose(() => console.log("SignalR(Branch): Connection Closed"));
                branchConnection.onreconnecting(() => console.log("SignalR(Branch): Reconnecting..."));
                branchConnection.onreconnected(async () => {
                    console.log("SignalR(Branch): Reconnected. Re-registering capabilities...");
                    for (const cap of capabilities) {
                        try {
                            await branchConnection.invoke("RegisterCapability", branchId, terminalId, cap);
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
        if (!branchConnection) return;
        branchConnection.off("CapabilityRegistered");
        branchConnection.on("CapabilityRegistered", (capability, isAuthorized) => {
            console.log(`SignalR(Branch): Capability '${capability}' registration result: ${isAuthorized ? "AUTHORIZED" : "DENIED"}`);
            callback(capability, isAuthorized);
        });
    },

    onPrintThermalReceipt: (callback) => {
        if (!branchConnection) return;
        branchConnection.off("OnPrintThermalReceipt");
        branchConnection.on("OnPrintThermalReceipt", (payload) => {
            console.log("SignalR(Branch): OnPrintThermalReceipt received", payload);
            callback(payload);
        });
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
