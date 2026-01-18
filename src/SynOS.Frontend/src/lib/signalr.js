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
                    accessTokenFactory: () => token,
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
                connectionPromise = null;
            })
            .catch(err => {
                console.error("SignalR: Connection Failed:", err);
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
