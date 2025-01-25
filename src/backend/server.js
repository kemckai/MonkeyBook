import express from 'express';
import cors from 'cors'; // Import the cors middleware
import connectDB from './db.js'; // Ensure the correct file extension is used
import userRoutes from './routes/userRoutes.js'; // Import the user routes

const app = express();
const PORT = process.env.PORT || 5001; // Change the port number here

// Middleware to parse JSON
app.use(express.json());

// Use the cors middleware
app.use(cors());

// Connect to MongoDB
try {
    connectDB();
} catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
}

// Use the user routes
app.use('/api', userRoutes);

// Endpoint to check database connection
app.get('/api/check-connection', (req, res) => {
    res.json({ status: 'connected' });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle port already in use error
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    } else {
        throw err;
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error during graceful shutdown:', err.message);
        process.exit(1);
    }
});
