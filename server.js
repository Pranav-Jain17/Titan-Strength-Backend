require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser'); 
const cors = require('cors');
const helmet = require('helmet'); // security headers
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const branchRoutes = require('./routes/branchRoutes');
const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const dashboardRoutes = require('./routes/dashboardRoute');
// const paymentRoutes = require('./routes/paymentRoutes')
const userRoutes = require('./routes/userRoutes');
const ownerRoutes = require('./routes/revenueRoute');
const managerRoutes = require('./routes/managerRoutes');
const classesRoutes = require('./routes/classesRoutes');
const memberRoutes = require('./routes/memberRoutes');
const contentRoutes = require('./routes/contentRoutes');
// const paymentController = require('./controllers/paymentController');
const checkSubscriptionExpiry = require('./utils/checkSubscriptionExpiry');

connectDB();

const app = express();

app.use(helmet());

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
  credentials: true 
}));

// app.post(
//   '/api/v1/payments/webhook', 
//   express.raw({ type: 'application/json' }), 
//   paymentController.webhookCheckout
// );
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboards', dashboardRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/classes', classesRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/content', contentRoutes);
// app.use('/api/v1/payments', paymentRoutes);
checkSubscriptionExpiry();


app.get('/', (req, res) => {
  res.send('Gym Management API is running...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});