require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')

const port = process.env.PORT || 3000

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLIC_KEY || !process.env.STRIPE_PRICE_ID) {
  console.error('Error: config environment variables not set. Please create/edit .env configuration file.')
  process.exit(-1)
}

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('Database connected successfully')
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`)
    console.error(err.stack)
    process.exit(1)
  })

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
