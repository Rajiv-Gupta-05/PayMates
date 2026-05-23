const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// 1. Load environment variables
dotenv.config();

// 2. Connect to MongoDB
connectDB();

// 3. Initialize Express app
const app = express();

// 4. Middlewares
app.use(cors({
  origin: 'http://localhost:4200', 
  credentials: true
}));
app.use(express.json()); // Allows the server to accept JSON data in the request body

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/settlements', require('./routes/settlementRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// 5. Basic Route to test if the server is running
app.get('/', (req, res) => {
  res.send('Splitwise Clone API is running smoothly!');
});

// 6. Start the Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});