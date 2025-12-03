import mongoose from 'mongoose';

let isConnected: boolean = false;

export const connectToDatabase = async () => {
    // strictQuery is deprecated in Mongoose 7+, but kept for backward compatibility
    // In Mongoose 8+, strict mode is the default
    if (mongoose.version.startsWith('7.')) {
        mongoose.set('strictQuery', true);
    }
    
    if(!process.env.MONGODB_URL) {
        throw new Error('MISSING MONGODB_URL environment variable');
    }

    if(isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    try {
        // Optimize connection with connection pooling and better options
        await mongoose.connect(process.env.MONGODB_URL, {
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
        })
        
        isConnected = true;

        // Handle connection events for better monitoring
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
            isConnected = true;
        });

        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database', error);
        isConnected = false;
        throw error;
    }
}