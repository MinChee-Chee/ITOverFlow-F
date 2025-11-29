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

    if(isConnected) {
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            dbName: 'devflow'
        })
        isConnected = true;

        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database', error);
        isConnected = false;
        throw error;
    }
}