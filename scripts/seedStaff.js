import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import StaffUser from '../src/models/StaffUser.js'

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')

const configuredAccounts = [
  { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, role: 'admin' },
  { username: process.env.DRIVER_USERNAME, password: process.env.DRIVER_PASSWORD, role: 'driver' },
].filter((account) => account.username || account.password)

if (!configuredAccounts.length) throw new Error('Configure at least one staff account in the environment')
if (configuredAccounts.some((account) => !account.username || !account.password)) {
  throw new Error('Each configured staff account needs both a username and password')
}

await mongoose.connect(process.env.MONGODB_URI)
for (const account of configuredAccounts) {
  const username = account.username.trim().toLowerCase()
  const existing = await StaffUser.findOne({ username })
  if (existing) {
    if (existing.role !== account.role) throw new Error(`Account ${username} already exists with another role`)
    console.log(`Account ${username} already exists; left unchanged`)
    continue
  }
  const passwordHash = await bcrypt.hash(account.password, 12)
  await StaffUser.create({ username, passwordHash, role: account.role })
  console.log(`Created ${account.role} account: ${username}`)
}
await mongoose.disconnect()