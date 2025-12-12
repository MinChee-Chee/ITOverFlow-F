import mongoose from 'mongoose';

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

// Store listener functions to check if they're already attached
const errorHandler = (err: Error) => {
    console.error('MongoDB connection error:', err);
    isConnected = false;
};

const disconnectedHandler = () => {
    if (isConnected) {
        console.warn('MongoDB disconnected');
    }
    isConnected = false;
};

const reconnectedHandler = () => {
    console.log('MongoDB reconnected');
    isConnected = true;
};

// Track if we've attached listeners in this module instance
let listenersAttached = false;
let attachingListeners = false; // Lock to prevent concurrent attachment

const attachListeners = () => {
    // Only attach once per module instance
    if (listenersAttached) {
        return;
    }

    // Prevent concurrent attachment attempts
    if (attachingListeners) {
        return;
    }

    attachingListeners = true;

    try {
        const connection = mongoose.connection;
        
        // Increase max listeners to prevent warnings during development/hot reloads
        // This allows more listeners before warning, handling edge cases
        connection.setMaxListeners(20);
        
        // During hot reloads, the module code runs again but the connection object persists
        // Old listeners from previous module instances may still be attached
        // We need to remove old listeners before attaching new ones
        
        // Remove all listeners for these events to prevent accumulation during hot reloads
        // This is safe because these are application-level handlers, not mongoose internals
        connection.removeAllListeners('error');
        connection.removeAllListeners('disconnected');
        connection.removeAllListeners('reconnected');

        // Attach our listeners
        connection.on('error', errorHandler);
        connection.on('disconnected', disconnectedHandler);
        connection.on('reconnected', reconnectedHandler);

        listenersAttached = true;
    } finally {
        attachingListeners = false;
    }
};

export const connectToDatabase = async () => {
    // strictQuery is deprecated in Mongoose 7+, but kept for backward compatibility
    // In Mongoose 8+, strict mode is the default
    if (mongoose.version.startsWith('7.')) {
        mongoose.set('strictQuery', true);
    }
    
    if(!process.env.MONGODB_URL) {
        throw new Error('MISSING MONGODB_URL environment variable');
    }

    // Attach listeners immediately, before any connection attempts
    attachListeners();

    // Fast path: already connected
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) return;

    // Atomically create or reuse the in-flight connection promise
    connectionPromise ??= (async () => {
        // Re-check after microtask scheduling
        const state = mongoose.connection.readyState;
        if (state === 1) return;

        // If already connecting, wait for it to complete with a bounded poll
        if (state === 2) {
            await waitForReadyOrConnect();
            return;
        }

        await performConnect();
    })();

    try {
        await connectionPromise;
    } finally {
        // Always clear so callers can retry after success or failure (including states 2/3)
        connectionPromise = null;
    }
}

const waitForReadyOrConnect = async () => {
    let attempts = 0;
    const maxAttempts = 50; // ~5 seconds @ 100ms

    while (attempts < maxAttempts) {
        const state = mongoose.connection.readyState;
        if (state === 1) return; // connected
        if (state === 0) break;  // disconnected, attempt fresh connect
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // If still not connected, try to establish a fresh connection
    await performConnect();
};

const performConnect = async () => {
    try {
        // Prevent multiple simultaneous connections
        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
            return;
        }

        // Optimize connection with connection pooling and better options
        await mongoose.connect(process.env.MONGODB_URL!, {
            dbName: 'devflow',
            // Connection pool settings for better performance
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2, // Minimum number of connections
            serverSelectionTimeoutMS: 5000, // How long to try selecting a server
            socketTimeoutMS: 45000, // How long to wait for a socket to be available
            connectTimeoutMS: 10000, // How long to wait for initial connection
            // Retry settings
            retryWrites: true,
            retryReads: true,
        });
        
        isConnected = true;
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database', error);
        isConnected = false;
        throw error;
    }
}