import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { patients, users, sessions } from '../../db/schema';
import { hashPassword } from '../auth';
import { recordAudit } from '../audit';

export type CreatePatientInput = {
  fullName: string;
  phone: string;
  age: number;
  gender: 'M' | 'F';
  diagnosis: string;
  treatmentStage: string;
  enrollmentDate: string;
  followupDate: string;
  primaryNurseId: number | null;
  actorUserId: number;
  actorRole: string;
};

function randomPassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  let s = '';
  for (let i = 0; i < 10; i++) s += all[Math.floor(Math.random() * all.length)];
  return s;
}

export async function createPatientAccount(input: CreatePatientInput) {
  const db = getDb();
  const existing = await db.select({ researchNo: patients.researchNo }).from(patients);
  const usedNumbers = new Set(existing.map((p) => p.researchNo));
  let researchNo = '';
  for (let n = existing.length + 1; n < 99999; n++) {
    const candidate = 'GL2026-' + String(n).padStart(4, '0');
    if (!usedNumbers.has(candidate)) { researchNo = candidate; break; }
  }
  if (!researchNo) throw new Error('研究编号空间已满');

  let username = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = 'patient_' + Math.random().toString(36).slice(2, 8);
    const existsUser = await db.select().from(users).where(eq(users.username, candidate));
    if (existsUser.length === 0) { username = candidate; break; }
  }
  if (!username) throw new Error('生成的账号冲突，请重试');

  const initialPassword = randomPassword();
  const hash = await hashPassword(initialPassword);
  const userRow = await db.insert(users).values({
    username,
    displayName: input.fullName,
    role: 'PATIENT',
    passwordHash: hash,
    isActive: true,
  }).returning({ id: users.id });
  const userId = userRow[0].id;

  const patientRow = await db.insert(patients).values({
    userId,
    researchNo,
    fullName: input.fullName,
    phone: input.phone,
    age: input.age,
    gender: input.gender,
    diagnosis: input.diagnosis,
    treatmentStage: input.treatmentStage,
    enrollmentDate: input.enrollmentDate,
    followupDate: input.followupDate,
    primaryNurseId: input.primaryNurseId,
    status: '在组',
  }).returning({ id: patients.id });
  const patientId = patientRow[0].id;

  await recordAudit({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: '护士建档',
    targetType: '患者',
    targetId: String(patientId),
    summary: '建档 ' + researchNo + ' / 账号 ' + username,
  });

  return { patientId, userId, username, initialPassword, researchNo };
}

export async function deactivateUserAccount(userId: number, actorUserId: number, actorRole: string) {
  const db = getDb();
  await db.update(users).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await recordAudit({ actorUserId, actorRole, action: '账号停用', targetType: '账号', targetId: String(userId) });
}

export async function activateUserAccount(userId: number, actorUserId: number, actorRole: string) {
  const db = getDb();
  await db.update(users).set({ isActive: true, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
  await recordAudit({ actorUserId, actorRole, action: '账号启用', targetType: '账号', targetId: String(userId) });
}

export async function resetUserPassword(userId: number, actorUserId: number, actorRole: string) {
  const db = getDb();
  const newPassword = randomPassword();
  const hash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: hash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await recordAudit({ actorUserId, actorRole, action: '重置密码', targetType: '账号', targetId: String(userId) });
  return newPassword;
}
