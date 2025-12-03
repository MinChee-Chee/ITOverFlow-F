'use server'

import { checkRole } from '@/utlis/roles'
import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { updateUser, deleteUser } from '@/lib/actions/user.action'

export async function setRole(formData: FormData) {
  const client = await clerkClient()

  // Check that the user trying to set the Role is an admin
  if (!(await checkRole('admin'))) {
    return
  }

  try {
    await client.users.updateUserMetadata(formData.get('id') as string, {
      publicMetadata: { role: formData.get('role') },
    })
    revalidatePath('/admin')
  } catch (err) {
    console.error('Error setting role:', err)
  }
}

export async function removeRole(formData: FormData) {
  const client = await clerkClient()

  // Check that the user trying to remove the Role is an admin
  if (!(await checkRole('admin'))) {
    return
  }

  try {
    await client.users.updateUserMetadata(formData.get('id') as string, {
      publicMetadata: { role: null },
    })
    revalidatePath('/admin')
  } catch (err) {
    console.error('Error removing role:', err)
  }
}

export async function updateUserData(formData: FormData) {
  if (!(await checkRole('admin'))) {
    return { error: 'Not authorized' }
  }

  try {
    const clerkId = formData.get('clerkId') as string
    const name = formData.get('name') as string
    const username = formData.get('username') as string
    const email = formData.get('email') as string
    const bio = formData.get('bio') as string
    const location = formData.get('location') as string
    const portfolioWebsite = formData.get('portfolioWebsite') as string

    await updateUser({
      clerkId,
      updateData: {
        name,
        username,
        email,
        bio: bio || undefined,
        location: location || undefined,
        portfolioWebsite: portfolioWebsite || undefined,
      },
      path: '/admin',
    })

    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Error updating user:', err)
    return { error: 'Failed to update user' }
  }
}

export async function deleteUserData(formData: FormData) {
  if (!(await checkRole('admin'))) {
    return { error: 'Not authorized' }
  }

  try {
    const clerkId = formData.get('clerkId') as string

    await deleteUser({ clerkId })
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Error deleting user:', err)
    return { error: 'Failed to delete user' }
  }
}

