import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const member = await db.member.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { chama: { select: { id: true, name: true } } },
        })

        if (!member || member.status === 'SUSPENDED' || member.status === 'LEFT') {
          throw new Error('Account not found or inactive')
        }

        const isValid = await bcrypt.compare(credentials.password, member.passwordHash)
        if (!isValid) throw new Error('Incorrect password')

        return {
          id: member.id,
          email: member.email,
          name: `${member.firstName} ${member.lastName}`,
          role: member.role,
          chamaId: member.chamaId,
          chamaName: member.chama.name,
          phone: member.phone,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.chamaId = (user as any).chamaId
        token.chamaName = (user as any).chamaName
        token.phone = (user as any).phone
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.chamaId = token.chamaId as string
        session.user.chamaName = token.chamaName as string
        session.user.phone = token.phone as string
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

// ─── Role helpers ──────────────────────────────────────────────────────────────

export const isTreasurer = (role?: string) =>
  role === 'TREASURER' || role === 'ADMIN'

export const isOfficer = (role?: string) =>
  ['TREASURER', 'SECRETARY', 'CHAIRPERSON', 'ADMIN'].includes(role ?? '')

export const isAdmin = (role?: string) => role === 'ADMIN'
