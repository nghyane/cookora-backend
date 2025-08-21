#!/usr/bin/env bun

import { db } from '../src/shared/database/connection'
import { users } from '../src/shared/database/schema'
import { eq } from 'drizzle-orm'

async function fixAdminRole() {
    console.log('🔧 Updating admin user role...')

    try {
        // Update admin@cookora.com to have admin role
        const result = await db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.email, 'admin@cookora.com'))
            .returning()

        if (result.length > 0) {
            console.log('✅ Admin role updated successfully:', result[0].email, '→', result[0].role)
        } else {
            console.log('⚠️  Admin user not found')
        }

        // Also check current users
        const allUsers = await db.select().from(users)
        console.log('📊 Current users:')
        allUsers.forEach(user => {
            console.log(`  - ${user.email}: ${user.role}`)
        })

    } catch (error) {
        console.error('❌ Error updating admin role:', error)
    } finally {
        process.exit(0)
    }
}

fixAdminRole() 