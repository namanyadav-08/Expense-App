const express    = require('express')
const cors       = require('cors')
const dotenv     = require('dotenv')

dotenv.config()

const connectDB = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

const app = express()
app.use(cors({ origin: process.env.CLIENT_URL || '*' }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }))

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/reports',   require('./routes/reports'))
app.use('/api/reports',   require('./routes/lines'))
app.use('/api/reports',   require('./routes/approver'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/alerts',    require('./routes/alerts'))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

// Do not accept traffic before the database is reachable.
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error('Failed to connect to MongoDB:', err.message); process.exit(1) })